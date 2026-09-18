# Orchestrates parse -> categorize -> dedup -> anomaly -> summarize, mirroring
# the old Go monolith's services/importService.go ProcessImport, minus every
# persistence step (those stay in api/common; see ProcessedMessage).
import base64
import binascii
import logging

from model.schemas import ProcessedMessage, ProcessedTransaction, ReadyForProcessingMessage
from service.ai_enhancer import AIEnhancer, TransactionInput
from service.anomaly_engine import detect_anomalies
from service.categorization_engine import CategorizationEngine
from service.csv_parser import parse_csv
from service.duplicate_detector import DuplicateDetector, fingerprint
from service.pdf_parser import extract_pdf_text, parse_pdf, trim_pdf_text
from service.raw_transaction import RawTransaction
from service.summary_generator import generate_summary

log = logging.getLogger(__name__)


def _detect_file_type(file_name: str, data: bytes) -> str:
    lower = file_name.lower()
    if lower.endswith(".pdf"):
        return "pdf"
    if any(lower.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif")):
        return "image"
    if data[:4] == b"%PDF":
        return "pdf"
    if data[:4] == b"\x89PNG":
        return "image"
    if data[:3] == b"\xff\xd8\xff":
        return "image"
    return "csv"  # csv/xlsx/txt all go through parse_csv, which handles all tabular formats


def _detect_image_mime_type(file_name: str, data: bytes) -> str:
    lower = file_name.lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith(".heic") or lower.endswith(".heif"):
        return "image/heic"
    if data[:4] == b"\x89PNG":
        return "image/png"
    return "image/jpeg"


async def process_receipt(msg: ReadyForProcessingMessage) -> ProcessedMessage:
    try:
        data = base64.b64decode(msg.file_data)
    except binascii.Error as exc:
        return ProcessedMessage(job_id=msg.job_id, user_id=msg.user_id, status="failed", error=f"invalid file data: {exc}")

    file_type = _detect_file_type(msg.file_name, data)
    ai = AIEnhancer.from_env()
    try:
        return await _process_with_ai(msg, data, file_type, ai)
    finally:
        if ai is not None:
            await ai.aclose()


async def _process_with_ai(
    msg: ReadyForProcessingMessage, data: bytes, file_type: str, ai: AIEnhancer | None
) -> ProcessedMessage:
    try:
        raw_txns = await _parse(file_type, msg.file_name, data, ai)
    except (ValueError, RuntimeError) as exc:
        return ProcessedMessage(
            job_id=msg.job_id, user_id=msg.user_id, status="failed", error=str(exc), file_type=file_type
        )

    cat_engine = CategorizationEngine(msg.reference.categories)
    dup_detector = DuplicateDetector(set(msg.reference.fingerprints))

    staged: list[dict] = []
    duplicate_count = 0
    for raw in raw_txns:
        if dup_detector.is_duplicate(raw):
            duplicate_count += 1
            continue
        staged.append(
            {
                "date": raw.date,
                "amount": raw.amount,
                "description": raw.description,
                "category": cat_engine.categorize(raw.description),
                "type": raw.type,
                "ai_categorized": False,
                "fingerprint": fingerprint(raw),
            }
        )

    # When AI is available, categorize ALL transactions, not just "Other"
    # fallbacks. More accurate and makes AI's role visible.
    if ai is not None and staged:
        try:
            inputs = [TransactionInput(description=t["description"], type=t["type"]) for t in staged]
            cats = await ai.batch_categorize(inputs, cat_engine.category_names())
            for t, cat in zip(staged, cats):
                if cat and cat.strip():
                    t["category"] = cat_engine.resolve(cat.strip())
                    t["ai_categorized"] = True
        except Exception as exc:  # noqa: BLE001 - AI categorization is best-effort
            log.warning("AI categorization failed: %s", exc)

    summary = generate_summary(staged)
    anomalies = detect_anomalies(
        staged, msg.reference.avg_amount, msg.reference.last_month_totals, msg.reference.three_month_avg
    )

    ai_summary_text = None
    if ai is not None and staged:
        try:
            ai_summary_text = await _generate_import_summary(ai, staged, summary)
        except Exception as exc:  # noqa: BLE001 - AI summary is best-effort
            log.warning("AI summary failed: %s", exc)

    return ProcessedMessage(
        job_id=msg.job_id,
        user_id=msg.user_id,
        status="completed",
        file_type=file_type,
        total_parsed=len(raw_txns),
        duplicates_found=duplicate_count,
        transactions=[
            ProcessedTransaction(
                date=t["date"].isoformat(),
                amount=t["amount"],
                description=t["description"],
                category=t["category"],
                ai_categorized=t["ai_categorized"],
                type=t["type"],
                fingerprint=t["fingerprint"],
            )
            for t in staged
        ],
        new_categories=sorted(cat_engine.new_categories),
        new_fingerprints=dup_detector.new_fingerprints,
        summary=summary,
        ai_summary=ai_summary_text,
        anomalies=anomalies,
    )


async def _parse(file_type: str, file_name: str, data: bytes, ai: AIEnhancer | None) -> list[RawTransaction]:
    if file_type == "csv":
        return parse_csv(data)

    if file_type == "pdf":
        raw_txns: list[RawTransaction] = []
        try:
            raw_text = extract_pdf_text(data)
        except Exception as exc:  # noqa: BLE001 - fall through to regex parser
            log.warning("pdf text extraction failed: %s", exc)
            raw_text = ""

        if ai is not None and raw_text and len(raw_text) > 50:
            trimmed = trim_pdf_text(raw_text, len(raw_text))  # skip header only, no size cap
            try:
                raw_txns = await ai.extract_transactions(trimmed)
            except Exception as exc:  # noqa: BLE001 - fall through to regex parser
                log.warning("AI PDF extraction failed: %s", exc)

        if not raw_txns:
            raw_txns = parse_pdf(data)
        return raw_txns

    if file_type == "image":
        if ai is None:
            raise ValueError("image upload requires an AI provider, set GROQ_API_KEY or GEMINI_API_KEY")
        mime_type = _detect_image_mime_type(file_name, data)
        return await ai.extract_transactions_from_image(data, mime_type)

    raise ValueError("unsupported file type; please upload a CSV, PDF, or image (JPG, PNG, WEBP)")


async def _generate_import_summary(ai: AIEnhancer, staged: list[dict], summary: dict) -> str | None:
    # Compact top-categories string (max 5), ASCII only to avoid encoding issues.
    top = ""
    for i, (cat, amt) in enumerate(summary["by_category"].items()):
        if i >= 5:
            break
        top += f"{cat}: NGN {amt:.0f}; "

    prompt = (
        f"You are a personal finance assistant. A Nigerian user imported {len(staged)} bank transactions. "
        f"Total income: NGN {summary['total_income']:.0f}. Total expenses: NGN {summary['total_expenses']:.0f}. "
        f"Net: NGN {summary['net_cash_flow']:.0f}. "
        f"Top spending categories: {top}. "
        "Write 2 short friendly sentences summarising this and give one money-saving tip. Plain text only."
    )
    text = await ai.generate_text(prompt)
    return text.strip() or None

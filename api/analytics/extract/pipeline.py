"""import.ready -> import.processed (system-design.md §6.1).

parse -> dedup -> categorize -> anomalies -> summary -> narrative. Every
decision about the import happens here; api/common only stores the result.
Domain failures come back as a failed import.processed with a
flows/import.md §3 code; only infrastructure errors propagate.
"""

import logging
from datetime import date, datetime

from extract.ai.enhancer import AIEnhancer, TransactionInput
from extract.anomaly import rules as anomaly_rules
from extract.categorize.engine import FALLBACK, CategorizationEngine
from extract.dedup.detector import DuplicateDetector, LedgerRow
from extract.parse.csv_parser import parse_csv
from extract.parse.filetype import image_mime_type
from extract.parse.pdf_parser import extract_pdf_text, is_encrypted, parse_pdf, trim_pdf_text
from extract.parse.raw_transaction import RawTransaction
from extract.summary import narrative
from extract.summary.summary import generate as generate_summary
from storage import ObjectStore

log = logging.getLogger(__name__)


class ImportFailed(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


class ImportPipeline:
    def __init__(self, store: ObjectStore, ai: AIEnhancer | None):
        self._store = store
        self._ai = ai

    async def run(self, msg: dict) -> dict:
        result: dict = {"job_id": msg["job_id"], "org_id": msg["org_id"]}
        if msg.get("file_type"):
            result["file_type"] = msg["file_type"]
        try:
            return result | await self._process(msg)
        except ImportFailed as exc:
            return result | {"status": "failed", "error_code": exc.code}
        except ValueError as exc:
            # Parser rejections. The message is safe to log; it never
            # carries row contents.
            log.warning("import failed", extra={"job_id": msg["job_id"], "reason": type(exc).__name__})
            return result | {"status": "failed", "error_code": "no_transactions_found"}

    async def _process(self, msg: dict) -> dict:
        ai = self._ai if msg["ai_allowed"] else None
        warnings: list[str] = []

        if msg["source"] == "bank_sync":
            raw = [
                RawTransaction(
                    date=datetime.fromisoformat(r["txn_date"]),
                    amount=abs(r["amount"]),
                    description=r["description"],
                    type=r["direction"],
                )
                for r in msg["rows"]
            ]
        else:
            data = await self._store.get(msg["file"]["key"])
            raw = await self._parse(msg["file_type"], msg.get("file_name", ""), data, ai, msg["ai_allowed"], warnings)

        if not raw:
            raise ImportFailed("no_transactions_found")

        reference = msg["reference"]
        detector = DuplicateDetector(
            [
                LedgerRow(date.fromisoformat(r["txn_date"]), abs(r["amount"]), r["description"])
                for r in reference["ledger"]
            ]
        )
        engine = CategorizationEngine(reference["categories"])

        rows: list[dict] = []
        for txn in raw:
            rows.append(
                {
                    "txn_date": txn.date.date().isoformat(),
                    "amount": round(abs(txn.amount), 2),
                    "direction": txn.type,
                    "description": txn.description,
                    "category_name": engine.by_keywords(txn.description),
                    "ai_categorized": False,
                    "is_duplicate": detector.check(LedgerRow(txn.date.date(), abs(txn.amount), txn.description)),
                }
            )

        if ai is not None:
            await self._ai_categorize(ai, engine, rows)

        for row in rows:
            category_id, name = engine.resolve(row["category_name"], row["direction"])
            row["category_name"] = name
            if category_id:
                row["category_id"] = category_id

        currency = msg["currency"]
        summary = generate_summary(rows)
        anomalies = anomaly_rules.detect(
            [
                anomaly_rules.Row(i, r["txn_date"][:7], r["amount"], r["direction"], r["category_name"])
                for i, r in enumerate(rows)
                if not r["is_duplicate"]
            ],
            reference["aggregates"],
            currency,
        )

        ai_summary = None
        if ai is not None:
            try:
                ai_summary = await narrative.generate(ai, len(rows), summary, currency)
            except Exception:  # noqa: BLE001 - the narrative is optional
                log.warning("ai summary failed", extra={"job_id": msg["job_id"]})

        return {
            "status": "completed",
            "total_parsed": len(raw),
            "duplicates_found": sum(1 for r in rows if r["is_duplicate"]),
            "transactions": rows,
            "summary": summary,
            "ai_summary": ai_summary,
            "anomalies": anomalies,
            "warnings": warnings,
        }

    async def _parse(
        self,
        file_type: str,
        file_name: str,
        data: bytes,
        ai: AIEnhancer | None,
        ai_allowed: bool,
        warnings: list[str],
    ) -> list[RawTransaction]:
        if file_type == "csv":
            return parse_csv(data)

        if file_type == "pdf":
            if is_encrypted(data):
                raise ImportFailed("password_protected_pdf")
            if ai is None:
                if not ai_allowed:
                    warnings.append("Parsed without AI (no ai_processing consent); accuracy may be reduced.")
                return parse_pdf(data)
            text = extract_pdf_text(data)
            txns: list[RawTransaction] = []
            if len(text) > 50:
                try:
                    txns = await ai.extract_transactions(trim_pdf_text(text, len(text)))
                except Exception:  # noqa: BLE001 - fall back to the regex parser
                    log.warning("ai pdf extraction failed; using regex parser")
            return txns or parse_pdf(data)

        if file_type == "image":
            # common refuses image jobs without consent before a ticket exists;
            # this is the defence in depth.
            if not ai_allowed:
                raise ImportFailed("consent_required")
            if ai is None:
                raise ImportFailed("ai_unavailable")
            try:
                return await ai.extract_transactions_from_image(data, image_mime_type(file_name, data))
            except Exception as exc:  # noqa: BLE001 - provider errors map to the taxonomy
                raise ImportFailed("ai_unavailable") from exc

        raise ImportFailed("unsupported_type")

    async def _ai_categorize(self, ai: AIEnhancer, engine: CategorizationEngine, rows: list[dict]) -> None:
        try:
            names = sorted(set(engine.names("expense")) | set(engine.names("income")) | {FALLBACK})
            inputs = [TransactionInput(description=r["description"], type=r["direction"]) for r in rows]
            for row, category in zip(rows, await ai.batch_categorize(inputs, names), strict=False):
                if isinstance(category, str) and category.strip():
                    row["category_name"] = category.strip()
                    row["ai_categorized"] = True
        except Exception:  # noqa: BLE001 - AI categorization is best-effort
            log.warning("ai categorization failed; keeping keyword categories")

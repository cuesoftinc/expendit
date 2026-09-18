# Ported from the old Go monolith's services/pdfParser.go (now api/common/
# internal/service/pdf_parser.go, deleted from Go once this port landed).
import io
import re

from pypdf import PdfReader

from service.csv_parser import parse_amount, parse_date
from service.raw_transaction import RawTransaction

# Matches a date at the very start of a line in common bank statement formats:
#   DD/MM/YYYY  DD-MM-YYYY  YYYY-MM-DD
#   DD/Mon/YYYY DD-Mon-YYYY DD-Mon-YY   (e.g. 15-Jan-2024, 15/Jan/24)
#   Mon DD YYYY  Mon DD, YYYY           (e.g. Jan 15 2024)
_DATE_AT_START = re.compile(
    r"(?i)^(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}"
    r"|\d{4}[/\-]\d{2}[/\-]\d{2}"
    r"|\d{1,2}[/\-][A-Za-z]{3}[/\-]\d{2,4}"
    r"|[A-Za-z]{3}\.?\s+\d{1,2}[,\s]+\d{4})"
)
_MONEY_PATTERN = re.compile(r"\d{1,3}(?:,\d{3})*\.\d{2}")
_CR_PATTERN = re.compile(r"(?i)\bCR\b|\bcredit\b")
_DR_PATTERN = re.compile(r"(?i)\bDR\b|\bdebit\b")


def trim_pdf_text(text: str, max_chars: int) -> str:
    """Skips account metadata at the top of a bank statement PDF and limits
    the result to max_chars so it fits within AI token limits."""
    match = _DATE_AT_START.search(text)
    if match and match.start() > 0:
        text = text[match.start() :]
    return text[:max_chars]


def extract_pdf_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts)


def parse_pdf(data: bytes) -> list[RawTransaction]:
    text = extract_pdf_text(data)
    return _parse_pdf_text(text)


def _parse_pdf_text(text: str) -> list[RawTransaction]:
    txns: list[RawTransaction] = []
    lines = text.split("\n")

    pending_date = ""
    pending_desc: list[str] = []

    def flush_pending():
        nonlocal pending_date, pending_desc
        if not pending_date:
            return
        combined = pending_date + " " + " ".join(pending_desc)
        t = _try_parse_line(combined)
        if t:
            txns.append(t)
        pending_date = ""
        pending_desc = []

    for raw in lines:
        line = raw.strip()
        if len(line) < 6:
            flush_pending()
            continue

        match = _DATE_AT_START.search(line)
        if not match:
            if pending_date:
                pending_desc.append(line)
            continue

        flush_pending()

        t = _try_parse_line(line)
        if t:
            txns.append(t)
            continue

        pending_date = line[match.start() : match.end()]
        pending_desc = [line[match.end() :].strip()]
    flush_pending()

    if not txns:
        raise ValueError("no transactions found in PDF, try exporting as CSV from your bank's portal instead")
    return txns


def _try_parse_line(line: str) -> RawTransaction | None:
    """Attempts to extract a transaction from a single line. Returns None if
    the line doesn't look like a transaction."""
    match = _DATE_AT_START.search(line)
    if not match:
        return None

    date_str = line[match.start() : match.end()]
    rest = line[match.end() :].strip()

    amounts = _MONEY_PATTERN.findall(rest)
    if not amounts:
        return None

    txn_type = "income" if _CR_PATTERN.search(rest) else "expense"

    # 1 amount: use it. 2 amounts: first is the transaction, second is
    # running balance, use first. 3+: debit/credit/balance layout, if CR
    # marker use the credit column (second), else the debit column (first).
    if len(amounts) == 1:
        amount_str = amounts[0]
    elif len(amounts) == 2:
        amount_str = amounts[0]
    else:
        amount_str = amounts[1] if txn_type == "income" else amounts[0]

    amount = parse_amount(amount_str)
    if amount == 0:
        return None

    first_amount_idx = rest.find(amounts[0])
    desc = rest[:first_amount_idx] if first_amount_idx > 0 else rest
    desc = _DR_PATTERN.sub("", desc)
    desc = _CR_PATTERN.sub("", desc)
    desc = desc.strip() or "Transaction"

    try:
        txn_date = parse_date(date_str)
    except ValueError:
        return None

    return RawTransaction(date=txn_date, amount=amount, description=desc, type=txn_type)

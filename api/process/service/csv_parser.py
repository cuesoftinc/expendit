# Ported from the old Go monolith's services/csvParser.go (now api/common/
# internal/service/csv_parser.go, deleted from Go once this port landed).
import csv
import io
import re
from datetime import datetime

import openpyxl

from service.raw_transaction import RawTransaction

DATE_FORMATS = [
    # with time component (try first, more specific)
    "%d %b %Y %H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%m/%d/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    # date only
    "%Y-%m-%d",
    "%m/%d/%Y",
    "%d/%m/%Y",
    "%Y/%m/%d",
    "%b %d, %Y",
    "%b %d %Y",
    "%d %b %Y",
    "%d-%b-%Y",
    "%d/%b/%Y",
    "%d-%b-%y",
    "%d/%b/%y",
    "%m-%d-%Y",
    "%d-%m-%Y",
]

_DATE_HEADER_KEYWORDS = ("date", "value date", "transaction date", "trans date", "posting date", "txn date")
_DESC_HEADER_KEYWORDS = ("description", "narration", "details", "particulars", "memo", "remarks", "beneficiary", "payee")
_TYPE_HEADER_KEYWORDS = ("type", "dr/cr", "dr cr", "transaction type", "crdr")


def is_xlsx(data: bytes) -> bool:
    return len(data) >= 4 and data[:4] == b"PK\x03\x04"


def parse_csv(data: bytes) -> list[RawTransaction]:
    """Handles both true CSV files and Excel (.xlsx) files."""
    records = _read_xlsx(data) if is_xlsx(data) else _read_csv(data)
    return _parse_records(records)


def _detect_delimiter(data: bytes) -> str:
    sample = data[:2048]
    counts = {
        ",": sample.count(b","),
        "\t": sample.count(b"\t"),
        "|": sample.count(b"|"),
        ";": sample.count(b";"),
    }
    return max(counts, key=lambda d: counts[d])


def _read_csv(data: bytes) -> list[list[str]]:
    delimiter = _detect_delimiter(data)
    text = data.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text), delimiter=delimiter, skipinitialspace=True)
    return [row for row in reader]


def _read_xlsx(data: bytes) -> list[list[str]]:
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    sheet = wb.worksheets[0]
    rows: list[list[str]] = []
    for row in sheet.iter_rows(values_only=True):
        rows.append(["" if cell is None else str(cell) for cell in row])
    return rows


def _parse_records(records: list[list[str]]) -> list[RawTransaction]:
    header_idx = _find_header_row(records)
    if header_idx < 0:
        raise ValueError("could not find a header row with date/amount/description columns")

    headers = _normalize_headers(records[header_idx])
    date_idx, amount_idx, desc_idx, credit_idx, debit_idx, type_idx = _detect_columns(headers)

    if date_idx < 0 or desc_idx < 0 or (amount_idx < 0 and credit_idx < 0 and debit_idx < 0):
        raise ValueError(
            f"could not detect required columns (date, amount/debit/credit, description); "
            f"headers found: {records[header_idx]}"
        )

    txns: list[RawTransaction] = []
    for row_num, row in enumerate(records[header_idx + 1 :]):
        max_idx = max(date_idx, desc_idx, amount_idx, credit_idx, debit_idx, type_idx)
        if len(row) <= max_idx:
            continue

        try:
            txn_date = parse_date(row[date_idx].strip())
        except ValueError:
            continue

        desc = row[desc_idx].strip() or f"Transaction {row_num + 1}"
        if _is_raw_id(desc):
            continue

        if credit_idx >= 0 and debit_idx >= 0:
            credit = parse_amount(_safe_cell(row, credit_idx))
            debit = parse_amount(_safe_cell(row, debit_idx))
            if credit > 0:
                txns.append(RawTransaction(txn_date, credit, desc, "income"))
            if debit > 0:
                txns.append(RawTransaction(txn_date, debit, desc, "expense"))
            continue

        amount = parse_amount(_safe_cell(row, amount_idx))
        if amount == 0:
            continue
        amount = abs(amount)

        txn_type = "expense"
        if type_idx >= 0 and type_idx < len(row) and _is_credit(row[type_idx]):
            txn_type = "income"

        txns.append(RawTransaction(txn_date, amount, desc, txn_type))
    return txns


def _find_header_row(records: list[list[str]]) -> int:
    for i, row in enumerate(records[:40]):
        headers = _normalize_headers(row)
        date_idx, amount_idx, desc_idx, credit_idx, debit_idx, _ = _detect_columns(headers)
        if date_idx >= 0 and (amount_idx >= 0 or credit_idx >= 0 or debit_idx >= 0) and desc_idx >= 0:
            return i
    return -1


def _safe_cell(row: list[str], idx: int) -> str:
    return row[idx] if 0 <= idx < len(row) else ""


def _normalize_headers(row: list[str]) -> list[str]:
    return [h.strip().lower() for h in row]


def _contains_any(s: str, *subs: str) -> bool:
    return any(sub in s for sub in subs)


def _detect_columns(headers: list[str]) -> tuple[int, int, int, int, int, int]:
    date_idx = amount_idx = desc_idx = credit_idx = debit_idx = type_idx = -1
    for i, h in enumerate(headers):
        if _contains_any(h, *_DATE_HEADER_KEYWORDS):
            if date_idx < 0:
                date_idx = i
        elif h.startswith("credit") or h in ("cr", "cr amount"):
            if credit_idx < 0:
                credit_idx = i
        elif h.startswith("debit") or h in ("dr", "dr amount"):
            if debit_idx < 0:
                debit_idx = i
        elif _contains_any(h, "amount", "value") and not _contains_any(h, "date", "credit", "debit"):
            if amount_idx < 0 and credit_idx < 0 and debit_idx < 0:
                amount_idx = i
        elif _contains_any(h, *_DESC_HEADER_KEYWORDS):
            if desc_idx < 0:
                desc_idx = i
        elif _contains_any(h, *_TYPE_HEADER_KEYWORDS):
            if type_idx < 0:
                type_idx = i
    return date_idx, amount_idx, desc_idx, credit_idx, debit_idx, type_idx


def _is_raw_id(s: str) -> bool:
    if len(s) <= 12:
        return False
    if any(c in s for c in " /-,()"):
        return False
    return s.isalnum()


def parse_date(s: str) -> datetime:
    s = s.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise ValueError(f"unparseable date: {s}")


_MONEY_CLEAN_RE = re.compile(r"[,₦$£€ ]")


def parse_amount(s: str) -> float:
    s = _MONEY_CLEAN_RE.sub("", s.strip())
    if s in ("", "-", "--", "0", "0.00"):
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def _is_credit(s: str) -> bool:
    s = s.strip().lower()
    return s in ("cr", "credit", "c", "in")

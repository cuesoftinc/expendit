"""statement.ready -> statement.mapped (system-design.md §6.3).

Parses (label, amount) rows, suggests a canonical key per row, then runs the
same derivation and validation the compute pool runs on later edits, as
mapping_version 1. PDF and image statements need AI extraction, which is
not built yet: they fail with ai_unavailable rather than guessing.
"""

import csv
import io
import logging
import re

import openpyxl

from compute.derive.statement import validate
from extract.mapping.suggest import suggest
from extract.parse.csv_parser import parse_amount
from storage import ObjectStore

log = logging.getLogger(__name__)

_YEAR_OR_PERIOD = re.compile(r"(?i)(fy\s?)?(19|20)\d{2}(-(q[1-4]|h[12]))?")


def _rows(file_type: str, data: bytes) -> list[list[str]]:
    if file_type == "xlsx":
        sheet = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True).worksheets[0]
        return [["" if c is None else str(c) for c in row] for row in sheet.iter_rows(values_only=True)]
    return list(csv.reader(io.StringIO(data.decode("utf-8", errors="replace"))))


def parse_label_amounts(file_type: str, data: bytes) -> list[tuple[str, float]]:
    """First text cell is the label; the last numeric cell is the amount
    (statements usually list the current period last)."""
    result = []
    for row in _rows(file_type, data):
        cells = [c.strip() for c in row if c and c.strip()]
        if len(cells) < 2 or all(_YEAR_OR_PERIOD.fullmatch(c) for c in cells[1:]):
            # Too short, or a header row whose columns are periods ("Item, 2024, 2025").
            continue
        label = cells[0]
        amount = None
        for cell in reversed(cells[1:]):
            negative = cell.startswith("(") and cell.endswith(")")
            try:
                amount = parse_amount(cell.strip("()"))
            except ValueError:
                continue
            amount = -amount if negative else amount
            break
        if amount is not None and not label.replace(",", "").replace(".", "").isdigit():
            result.append((label, amount))
    return result


class StatementPipeline:
    def __init__(self, store: ObjectStore):
        self._store = store

    async def run(self, msg: dict) -> dict:
        result = {"statement_id": msg["statement_id"], "org_id": msg["org_id"]}
        if msg["file_type"] in ("pdf", "image"):
            return result | {"status": "failed", "error_code": "ai_unavailable"}
        data = await self._store.get(msg["file"]["key"])
        try:
            rows = parse_label_amounts(msg["file_type"], data)
        except ValueError:
            rows = []
        if not rows:
            return result | {"status": "failed", "error_code": "no_line_items_found"}

        items = []
        for label, amount in rows:
            key, confidence = suggest(msg["kind"], label)
            items.append(
                {
                    "source_label": label,
                    "amount": amount,
                    "canonical_key": key,
                    "confidence": confidence,
                    "mapped_by": "ai",
                    "derived": False,
                    "status": "mapped" if key else "unmapped",
                }
            )
        validation = validate(msg["kind"], items, mapping_version=1)
        line_items = [{k: v for k, v in i.items() if k != "status"} for i in items] + [
            {
                "source_label": "",
                "amount": d["amount"],
                "canonical_key": d["canonical_key"],
                "confidence": None,
                "mapped_by": "ai",
                "derived": True,
            }
            for d in validation["derived"]
        ]
        return result | {"status": "staged", "line_items": line_items, "validation": validation}

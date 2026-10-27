"""Duplicate detection — flows/import.md §4.

A staged row is a duplicate when the ledger reference (confirmed + other
staged rows, supplied by api/common in import.ready) or an earlier row of
the same batch has: date within ±1 day, the exact amount, and a normalized
description similarity above the threshold. Duplicates are flagged, not
dropped: the review screen lets the user re-include them.
"""

import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import date

SIMILARITY_THRESHOLD = 0.8
DATE_TOLERANCE_DAYS = 1

_NON_ALPHA_NUM = re.compile(r"[^a-z0-9 ]")


@dataclass(frozen=True)
class LedgerRow:
    txn_date: date
    amount: float
    description: str


def normalize(description: str) -> str:
    return " ".join(_NON_ALPHA_NUM.sub(" ", description.lower()).split())


def similarity(a: str, b: str) -> float:
    """Jaccard similarity on the token sets of two normalized descriptions."""
    set_a, set_b = set(a.split()), set(b.split())
    if not set_a and not set_b:
        return 1.0
    return len(set_a & set_b) / len(set_a | set_b)


class DuplicateDetector:
    def __init__(self, reference: list[LedgerRow]):
        # Bucket by amount in cents: an exact amount match is required, so
        # only same-amount rows are ever compared.
        self._by_amount: dict[int, list[tuple[date, str]]] = defaultdict(list)
        for row in reference:
            self._add(row)

    def check(self, row: LedgerRow) -> bool:
        """Returns whether `row` duplicates the reference or an earlier row
        of this batch, then remembers it for the rest of the batch."""
        duplicate = self._matches(row)
        self._add(row)
        return duplicate

    def _matches(self, row: LedgerRow) -> bool:
        norm = normalize(row.description)
        for other_date, other_norm in self._by_amount.get(_cents(row.amount), ()):
            if abs((row.txn_date - other_date).days) > DATE_TOLERANCE_DAYS:
                continue
            if similarity(norm, other_norm) > SIMILARITY_THRESHOLD:
                return True
        return False

    def _add(self, row: LedgerRow) -> None:
        self._by_amount[_cents(row.amount)].append((row.txn_date, normalize(row.description)))


def _cents(amount: float) -> int:
    return round(abs(amount) * 100)

# Ported from the old Go monolith's services/duplicateDetector.go (now
# api/common/internal/service/duplicate_detector.go, deleted from Go once
# this port landed).
#
# Duplicate/fuzzy-duplicate is a DECISION, so it lives here per the
# CRUD/processing split. The existing fingerprint set is reference data
# api/common supplies (it owns the `import_fingerprints` collection); any
# fingerprint confirmed non-duplicate this run is reported back via
# DuplicateDetector.new_fingerprints so api/common can persist it.
import hashlib
import re

from service.raw_transaction import RawTransaction

_NON_ALPHA_NUM = re.compile(r"[^a-z0-9 ]")


class DuplicateDetector:
    def __init__(self, existing_fingerprints: set[str]):
        self._existing = existing_fingerprints
        self._batch_seen: set[str] = set()
        self.new_fingerprints: list[str] = []

    def is_duplicate(self, txn: RawTransaction) -> bool:
        fp = fingerprint(txn)
        if fp in self._batch_seen or fp in self._existing:
            return True
        self._batch_seen.add(fp)
        self.new_fingerprints.append(fp)
        return False

    def is_fuzzy_duplicate(self, batch: list[RawTransaction], txn: RawTransaction) -> bool:
        """Same amount, within 3 days, and Jaccard similarity > 0.8 on
        normalized descriptions."""
        for other in batch:
            if other.amount != txn.amount:
                continue
            if abs((txn.date - other.date).days) > 3:
                continue
            if _jaccard_similarity(_normalize_desc(txn.description), _normalize_desc(other.description)) > 0.8:
                return True
        return False


def fingerprint(txn: RawTransaction) -> str:
    day = txn.date.strftime("%Y-%m-%d")
    amount = f"{txn.amount:.2f}"
    desc = _normalize_desc(txn.description)
    return hashlib.sha256(f"{day}:{amount}:{desc}".encode()).hexdigest()


def _normalize_desc(s: str) -> str:
    s = _NON_ALPHA_NUM.sub(" ", s.lower())
    return " ".join(s.split())


def _jaccard_similarity(a: str, b: str) -> float:
    set_a, set_b = set(a.split()), set(b.split())
    if not set_a and not set_b:
        return 1.0
    union = len(set_a | set_b)
    if union == 0:
        return 1.0
    return len(set_a & set_b) / union

from datetime import date

from extract.anomaly import rules
from extract.dedup.detector import DuplicateDetector, LedgerRow, normalize, similarity


def test_normalize_and_similarity():
    assert normalize("POS*Shoprite-Lekki #123") == "pos shoprite lekki 123"
    assert similarity("bolt ride lagos", "bolt ride lagos") == 1.0
    assert similarity("bolt ride lagos", "uber ride abuja") < 0.8


def test_duplicate_needs_exact_amount_and_date_within_one_day():
    base = LedgerRow(date(2026, 9, 2), 4500, "CHICKEN REPUBLIC IKEJA")
    detector = DuplicateDetector([base])
    assert detector.check(LedgerRow(date(2026, 9, 3), 4500, "Chicken Republic - Ikeja"))
    assert not detector.check(LedgerRow(date(2026, 9, 5), 4500, "CHICKEN REPUBLIC IKEJA"))
    assert not detector.check(LedgerRow(date(2026, 9, 2), 4501, "CHICKEN REPUBLIC IKEJA"))


def test_duplicate_within_the_same_batch():
    detector = DuplicateDetector([])
    row = LedgerRow(date(2026, 9, 2), 100, "NETFLIX.COM")
    assert not detector.check(row)
    assert detector.check(row)


AGG = {
    "median_90d": {"income": 0, "expense": 6000},
    "category_monthly": {"Food": [40000, 42000, 41000, 39000], "Travel": [1000, 2000]},
    "category_mean": {"Food": {"mean": 5000, "count": 20}, "Rare": {"mean": 100, "count": 2}},
}


def test_large_transaction_uses_floor_when_median_is_small():
    found = rules.detect([rules.Row(0, "2026-09", 49_000, "expense", "Food")], AGG, "NGN")
    assert not [a for a in found if a["rule_id"] == "large_transaction"]
    found = rules.detect([rules.Row(0, "2026-09", 50_001, "expense", "Food")], AGG, "NGN")
    assert [a["txn_index"] for a in found if a["rule_id"] == "large_transaction"] == [0]


def test_abnormal_category_escalates_past_twice_threshold():
    (info,) = [a for a in rules.detect([rules.Row(0, "2026-09", 16_000, "expense", "Food")], AGG, "NGN") if a["rule_id"] == "abnormal_category"]
    assert info["severity"] == "info"
    (warn,) = [a for a in rules.detect([rules.Row(0, "2026-09", 31_000, "expense", "Food")], AGG, "NGN") if a["rule_id"] == "abnormal_category"]
    assert warn["severity"] == "warn"


def test_abnormal_category_skipped_below_sample_minimum():
    found = rules.detect([rules.Row(0, "2026-09", 10_000, "expense", "Rare")], AGG, "NGN")
    assert not [a for a in found if a["rule_id"] == "abnormal_category"]


def test_spending_spike_needs_three_months_of_history():
    rows = [rules.Row(i, "2026-09", 30_000, "expense", c) for i, c in enumerate(["Food", "Food", "Travel"])]
    spikes = [a for a in rules.detect(rows, AGG, "NGN") if a["rule_id"] == "spending_spike"]
    assert len(spikes) == 1 and "Food" in spikes[0]["note"]

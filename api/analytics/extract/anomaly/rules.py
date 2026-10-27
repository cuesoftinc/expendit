"""Anomaly rules registry — flows/import.md §7 (rules-as-data, v1 constants).

The aggregates come from api/common in import.ready; this module never
queries a database. `duplicate_charge` is a post-confirm ledger rule and is
not evaluated at import time (§7: distinct from staged-import dedup).
Severity escalates info -> warn when the flagging value exceeds 2x its
threshold.
"""

import statistics
from collections import defaultdict
from dataclasses import dataclass

RULE_VERSION = "v1"

LARGE_K = 5
LARGE_FLOOR = 50_000
SPIKE_Z = 2
SPIKE_MIN_HISTORY = 3
ABNORMAL_K = 3
ABNORMAL_MIN_COUNT = 5


@dataclass
class Row:
    index: int
    month: str  # YYYY-MM
    amount: float
    direction: str
    category: str


def _severity(base: str, value: float, threshold: float) -> str:
    return "warn" if base == "warn" or value > 2 * threshold else "info"


def _money(value: float, currency: str) -> str:
    return f"{currency} {value:,.0f}"


def detect(rows: list[Row], aggregates: dict, currency: str) -> list[dict]:
    anomalies: list[dict] = []
    median = aggregates.get("median_90d", {})
    category_mean = aggregates.get("category_mean", {})
    category_monthly = aggregates.get("category_monthly", {})

    for row in rows:
        amount = abs(row.amount)

        # large_transaction: |amount| > max(k x median_90d, floor), same direction.
        threshold = max(LARGE_K * median.get(row.direction, 0.0), LARGE_FLOOR)
        if amount > threshold:
            anomalies.append(
                {
                    "rule_id": "large_transaction",
                    "severity": "warn",
                    "note": f"{_money(amount, currency)} is above the large-transaction threshold of {_money(threshold, currency)}",
                    "rule_version": RULE_VERSION,
                    "txn_index": row.index,
                }
            )

        # abnormal_category: |amount| > k x trailing category mean (>= min samples).
        stats = category_mean.get(row.category)
        if row.direction == "expense" and stats and stats["count"] >= ABNORMAL_MIN_COUNT and stats["mean"] > 0:
            threshold = ABNORMAL_K * stats["mean"]
            if amount > threshold:
                anomalies.append(
                    {
                        "rule_id": "abnormal_category",
                        "severity": _severity("info", amount, threshold),
                        "note": f"{amount / stats['mean']:.1f}x the usual {row.category} transaction",
                        "rule_version": RULE_VERSION,
                        "txn_index": row.index,
                    }
                )

    # spending_spike: a category's month total > mean + z x stdev of the
    # trailing window; skipped below the history minimum.
    month_totals: dict[tuple[str, str], float] = defaultdict(float)
    for row in rows:
        if row.direction == "expense":
            month_totals[(row.category, row.month)] += abs(row.amount)
    for (category, month), total in sorted(month_totals.items()):
        history = category_monthly.get(category, [])
        if len(history) < SPIKE_MIN_HISTORY:
            continue
        mean = statistics.fmean(history)
        stdev = statistics.pstdev(history)
        threshold = mean + SPIKE_Z * stdev
        if total > threshold and total > mean:
            anomalies.append(
                {
                    "rule_id": "spending_spike",
                    "severity": "warn",
                    "note": f"{category} spending in {month} is {_money(total, currency)} against a usual {_money(mean, currency)}",
                    "rule_version": RULE_VERSION,
                }
            )

    return anomalies

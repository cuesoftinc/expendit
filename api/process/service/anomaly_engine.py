# Ported from the old Go monolith's services/anomalyEngine.go (now
# api/common/internal/service/anomaly_engine.go, deleted from Go once this
# port landed).
#
# Anomaly detection is a DECISION (statistical comparison), so it lives here.
# The three aggregates below (avg_amount, last_month_totals, three_month_avg)
# are reference data api/common computes from the `expense` collection it
# owns and supplies as part of the processing request; this module never
# queries a database.
from service.raw_transaction import RawTransaction

ANOMALY_LARGE_TRANSACTION = "large_transaction"
ANOMALY_SPENDING_SPIKE = "spending_spike"
ANOMALY_ABNORMAL_CATEGORY = "abnormal_category"


def detect_anomalies(
    txns: list[dict],  # staged transactions: {amount, category, type, ...}
    avg_amount: float,
    last_month_totals: dict[str, float],
    three_month_avg: dict[str, float],
) -> list[dict]:
    anomalies: list[dict] = []
    import_totals: dict[str, float] = {}

    for txn in txns:
        if txn["type"] != "expense":
            continue
        import_totals[txn["category"]] = import_totals.get(txn["category"], 0.0) + txn["amount"]

        if avg_amount > 0 and txn["amount"] > avg_amount * 3:
            anomalies.append(
                {
                    "type": ANOMALY_LARGE_TRANSACTION,
                    "description": f"{txn['amount']:.0f} is {txn['amount'] / avg_amount:.1f}x your average transaction of {avg_amount:.0f}",
                    "amount": txn["amount"],
                    "category": txn["category"],
                }
            )

    seen: set[str] = set()
    for category, total in import_totals.items():
        spike_key = f"{ANOMALY_SPENDING_SPIKE}:{category}"
        last_month = last_month_totals.get(category)
        if last_month and last_month > 0 and spike_key not in seen:
            pct = (total - last_month) / last_month * 100
            if pct > 50:
                seen.add(spike_key)
                anomalies.append(
                    {
                        "type": ANOMALY_SPENDING_SPIKE,
                        "description": f"{category} spending is {pct:.0f}% above last month ({total:.0f} vs {last_month:.0f})",
                        "category": category,
                        "amount": total,
                    }
                )

        abnormal_key = f"{ANOMALY_ABNORMAL_CATEGORY}:{category}"
        avg = three_month_avg.get(category)
        if avg and avg > 0 and abnormal_key not in seen:
            pct = (total - avg) / avg * 100
            if pct > 50:
                seen.add(abnormal_key)
                anomalies.append(
                    {
                        "type": ANOMALY_ABNORMAL_CATEGORY,
                        "description": f"{category} spending is {pct:.0f}% above your 3-month average ({total:.0f} vs {avg:.0f})",
                        "category": category,
                        "amount": total,
                    }
                )

    return anomalies

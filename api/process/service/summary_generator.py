# Ported from the old Go monolith's services/summaryGenerator.go (now
# api/common/internal/service/summary_generator.go, deleted from Go once
# this port landed). Pure computation, no database access.


def generate_summary(txns: list[dict]) -> dict:
    total_income = 0.0
    total_expenses = 0.0
    by_category: dict[str, float] = {}
    monthly: dict[str, dict[str, float]] = {}

    for txn in txns:
        month = txn["date"].strftime("%Y-%m")
        bucket = monthly.setdefault(month, {"income": 0.0, "expenses": 0.0})

        if txn["type"] == "income":
            total_income += txn["amount"]
            bucket["income"] += txn["amount"]
        else:
            total_expenses += txn["amount"]
            by_category[txn["category"]] = by_category.get(txn["category"], 0.0) + txn["amount"]
            bucket["expenses"] += txn["amount"]

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_cash_flow": total_income - total_expenses,
        "by_category": by_category,
        "monthly_trends": [
            {"month": month, "income": v["income"], "expenses": v["expenses"]} for month, v in monthly.items()
        ],
    }

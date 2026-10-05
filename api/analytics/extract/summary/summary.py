"""Import summary (ImportJobSummary in web/src/models/import.ts). Duplicates
are excluded: they won't be imported unless the user re-includes them."""


def generate(rows: list[dict]) -> dict:
    total_income = 0.0
    total_expense = 0.0
    by_category: dict[str, float] = {}
    for row in rows:
        if row["is_duplicate"]:
            continue
        amount = abs(row["amount"])
        if row["direction"] == "income":
            total_income += amount
        else:
            total_expense += amount
            by_category[row["category_name"]] = by_category.get(row["category_name"], 0.0) + amount
    return {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net": round(total_income - total_expense, 2),
        "by_category": {k: round(v, 2) for k, v in sorted(by_category.items(), key=lambda kv: -kv[1])},
    }

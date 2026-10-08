"""Keyword categorization, then (when allowed) AI categorization.

The org's categories arrive as reference data in import.ready. A name this
run resolves that isn't in that list is returned without a category_id, and
api/common creates the category when it stores the result.
"""

CATEGORY_RULES: list[tuple[list[str], str]] = [
    (["uber", "bolt", "taxify", "lyft", "okada", "tricycle", "bus fare", "transport", "fare", "taxi", "ride"], "Transportation"),
    (["kfc", "dominos", "pizza", "restaurant", "cafe", "burger", "chicken republic", "suya", "amala", "jollof", "shawarma", "eatery", "diner", "food"], "Food"),
    (["shoprite", "spar", "market", "supermarket", "grocery", "groceries", "provision"], "Groceries"),
    (["mtn", "airtel", "glo", "9mobile", "electricity", "nepa", "phcn", "water", "internet", "wifi", "cable", "dstv", "gotv", "startimes", "utility", "bills"], "Utility"),
    (["data", "recharge", "airtime", "topup", "bundle"], "Data"),
    (["school", "tuition", "university", "college", "education", "lesson", "tutorial", "academy"], "School"),
    (["netflix", "netflix.com"], "Netflix"),
    (["gaming", "playstation", "xbox", "steam", "game", "esport", "battlenet"], "Gaming"),
    # Interest & dividends -> income (check before the broad savings rule)
    (["interest earned", "interest credit", "dividend", "bonus credit", "cashback"], "Income"),
    (["owealth", "piggyvest", "cowrywise", "risevest", "bamboo", "auto-save", "autosave", "savings deposit", "investment"], "Savings"),
    (["salary", "wage", "payroll", "stipend"], "Income"),
    (["atm", "withdrawal", "cash out", "cash"], "Cash"),
    (["pos", "card payment", "ussd", "mobile money"], "Bank Transfer"),
    (["amazon", "jumia", "konga", "aliexpress", "shop", "mall", "purchase", "buy"], "Shopping"),
    (["hospital", "pharmacy", "clinic", "health", "medical", "doctor", "lab"], "Health"),
    (["hotel", "flight", "travel", "airbnb", "booking.com", "trip", "airline"], "Travel"),
    (["transfer", "wire", "remittance", "bank transfer", "nip", "neft", "rtgs"], "Bank Transfer"),
]

FALLBACK = "Other"


class CategorizationEngine:
    def __init__(self, categories: list[dict]):
        # (lower name, direction) -> {id, name}
        self._known: dict[tuple[str, str], dict] = {
            (c["name"].lower(), c["type"]): {"id": c["id"], "name": c["name"]} for c in categories
        }

    def by_keywords(self, description: str) -> str:
        normalized = description.lower()
        for keywords, category in CATEGORY_RULES:
            if any(kw in normalized for kw in keywords):
                return category
        return FALLBACK

    def names(self, direction: str) -> list[str]:
        return sorted(v["name"] for (_, d), v in self._known.items() if d == direction)

    def resolve(self, name: str, direction: str) -> tuple[str | None, str]:
        """Returns (category_id or None if new, canonical name)."""
        known = self._known.get((name.lower(), direction))
        if known:
            return known["id"], known["name"]
        return None, name

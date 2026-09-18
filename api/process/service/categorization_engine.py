# Ported from the old Go monolith's services/categorizationEngine.go (now
# api/common/internal/service/categorization_engine.go, deleted from Go once
# this port landed).
#
# categorize/resolve are DECISIONS, so they live here per the CRUD/processing
# split, not in api/common. The existing category list is reference data
# api/common supplies (it owns the `category` collection); any category name
# this run resolves that wasn't in that list is reported back via
# CategorizationEngine.new_categories so api/common can create the row.

CATEGORY_RULES: list[tuple[list[str], str]] = [
    (["uber", "bolt", "taxify", "lyft", "okada", "tricycle", "bus fare", "transport", "fare", "taxi", "ride"], "Transportation"),
    (["kfc", "dominos", "pizza", "restaurant", "cafe", "burger", "chicken republic", "suya", "amala", "jollof", "shawarma", "eatery", "diner", "food"], "Food"),
    (["shoprite", "spar", "market", "supermarket", "grocery", "groceries", "provision"], "Groceries"),
    (["mtn", "airtel", "glo", "9mobile", "electricity", "nepa", "phcn", "water", "internet", "wifi", "cable", "dstv", "gotv", "startimes", "utility", "bills"], "Utility"),
    (["data", "recharge", "airtime", "topup", "bundle"], "Data"),
    (["school", "tuition", "university", "college", "education", "lesson", "tutorial", "academy"], "School"),
    (["netflix", "netflix.com"], "Netflix"),
    (["gaming", "playstation", "xbox", "steam", "game", "esport", "battlenet"], "Gaming"),
    # Interest & dividends -> income (check before broad savings rule)
    (["interest earned", "interest credit", "dividend", "bonus credit", "cashback"], "Income"),
    # Savings & investment platforms
    (["owealth", "piggyvest", "cowrywise", "risevest", "bamboo", "auto-save", "autosave", "savings deposit", "investment"], "Savings"),
    # Salary & wages -> income
    (["salary", "wage", "payroll", "stipend"], "Income"),
    # Cash & withdrawals
    (["atm", "withdrawal", "cash out", "cash"], "Cash"),
    # POS & card payments
    (["pos", "card payment", "ussd", "mobile money"], "Bank Transfer"),
    (["amazon", "jumia", "konga", "aliexpress", "shop", "mall", "purchase", "buy"], "Shopping"),
    (["hospital", "pharmacy", "clinic", "health", "medical", "doctor", "lab"], "Health"),
    (["hotel", "flight", "travel", "airbnb", "booking.com", "trip", "airline"], "Travel"),
    (["transfer", "wire", "remittance", "bank transfer", "nip", "neft", "rtgs"], "Bank Transfer"),
]


class CategorizationEngine:
    """Resolves categories against the reference list api/common supplied,
    creating new ones only when needed (reported via new_categories, never
    written to a database here)."""

    def __init__(self, existing_categories: list[str]):
        self._cache: dict[str, str] = {c.lower(): c for c in existing_categories}
        self.new_categories: set[str] = set()

    def categorize(self, description: str) -> str:
        normalized = description.lower()
        for keywords, category in CATEGORY_RULES:
            if any(kw in normalized for kw in keywords):
                return self._resolve_or_create(category)
        return self._resolve_or_create("Other")

    def resolve(self, name: str) -> str:
        return self._resolve_or_create(name)

    def category_names(self) -> list[str]:
        return list(self._cache.values())

    def _resolve_or_create(self, name: str) -> str:
        key = name.lower()
        if key in self._cache:
            return self._cache[key]
        self._cache[key] = name
        self.new_categories.add(name)
        return name

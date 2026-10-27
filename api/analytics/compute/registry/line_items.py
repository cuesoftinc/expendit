"""Canonical line-item vocabulary — docs/line-items.md §1–§4 and §6.

The closed mapping target for financial statements. Extending it is a docs
PR first; this file and web/src/models/registry/line-items.ts follow.
"""

import re
from dataclasses import dataclass

BALANCE_SHEET_KEYS = (
    "cash_and_equivalents", "receivables", "inventory", "current_assets_other", "current_assets",
    "ppe", "intangibles", "noncurrent_assets_other", "total_assets",
    "payables", "short_term_debt", "current_liabilities_other", "current_liabilities",
    "long_term_debt", "noncurrent_liabilities_other", "total_liabilities",
    "share_capital", "retained_earnings", "equity",
)
INCOME_STATEMENT_KEYS = (
    "revenue", "cogs", "gross_profit", "opex", "depreciation_amortization", "operating_profit",
    "interest_expense", "interest_income", "tax_expense", "net_income",
)
CASH_FLOW_KEYS = ("cfo", "cfi", "cff", "capex", "net_change_in_cash")

KEYS_BY_KIND = {
    "balance_sheet": BALANCE_SHEET_KEYS,
    "income_statement": INCOME_STATEMENT_KEYS,
    "cash_flow": CASH_FLOW_KEYS,
}
KIND_OF_KEY = {key: kind for kind, keys in KEYS_BY_KIND.items() for key in keys}

LABELS = {
    "cash_and_equivalents": "Cash & equivalents",
    "receivables": "Receivables",
    "inventory": "Inventory",
    "current_assets_other": "Other current assets",
    "current_assets": "Total current assets",
    "ppe": "Property, plant & equipment",
    "intangibles": "Intangibles",
    "noncurrent_assets_other": "Other non-current assets",
    "total_assets": "Total assets",
    "payables": "Payables",
    "short_term_debt": "Short-term debt",
    "current_liabilities_other": "Other current liabilities",
    "current_liabilities": "Total current liabilities",
    "long_term_debt": "Long-term debt",
    "noncurrent_liabilities_other": "Other non-current liabilities",
    "total_liabilities": "Total liabilities",
    "share_capital": "Share capital",
    "retained_earnings": "Retained earnings",
    "equity": "Total equity",
    "revenue": "Revenue",
    "cogs": "Cost of sales",
    "gross_profit": "Gross profit",
    "opex": "Operating expenses",
    "depreciation_amortization": "Depreciation & amortization",
    "operating_profit": "Operating profit",
    "interest_expense": "Interest expense",
    "interest_income": "Interest income",
    "tax_expense": "Tax expense",
    "net_income": "Net income",
    "cfo": "Net cash from operating activities",
    "cfi": "Net cash from investing activities",
    "cff": "Net cash from financing activities",
    "capex": "Purchase of PP&E",
    "net_change_in_cash": "Net change in cash",
}

IDENTITY_TOLERANCE = 0.01  # ±1 %
UNMAPPED_VALUE_THRESHOLD = 0.2  # >20 % unmapped value blocks confirm
SUGGESTION_CONFIDENCE_FLOOR = 0.6  # below this a suggestion arrives unmapped

PERIOD_PATTERN = re.compile(r"^(\d{4}-Q[1-4]|\d{4}-H[12]|FY\d{4})$")


@dataclass(frozen=True)
class Derivation:
    key: str
    kind: str
    formula: str
    terms: tuple[tuple[str, int], ...]


DERIVATIONS = (
    Derivation("current_assets", "balance_sheet", "cash_and_equivalents + receivables + inventory + current_assets_other",
               (("cash_and_equivalents", 1), ("receivables", 1), ("inventory", 1), ("current_assets_other", 1))),
    Derivation("total_assets", "balance_sheet", "current_assets + ppe + intangibles + noncurrent_assets_other",
               (("current_assets", 1), ("ppe", 1), ("intangibles", 1), ("noncurrent_assets_other", 1))),
    Derivation("current_liabilities", "balance_sheet", "payables + short_term_debt + current_liabilities_other",
               (("payables", 1), ("short_term_debt", 1), ("current_liabilities_other", 1))),
    Derivation("total_liabilities", "balance_sheet", "current_liabilities + long_term_debt + noncurrent_liabilities_other",
               (("current_liabilities", 1), ("long_term_debt", 1), ("noncurrent_liabilities_other", 1))),
    Derivation("equity", "balance_sheet", "share_capital + retained_earnings",
               (("share_capital", 1), ("retained_earnings", 1))),
    Derivation("gross_profit", "income_statement", "revenue - cogs", (("revenue", 1), ("cogs", -1))),
    # D&A rule: opex excludes D&A by definition; when D&A is not separable
    # it stays inside opex and the term is simply absent.
    Derivation("operating_profit", "income_statement", "gross_profit - opex - depreciation_amortization",
               (("gross_profit", 1), ("opex", -1), ("depreciation_amortization", -1))),
    Derivation("net_income", "income_statement", "operating_profit + interest_income - interest_expense - tax_expense",
               (("operating_profit", 1), ("interest_income", 1), ("interest_expense", -1), ("tax_expense", -1))),
    Derivation("net_change_in_cash", "cash_flow", "cfo + cfi + cff", (("cfo", 1), ("cfi", 1), ("cff", 1))),
)


def previous_period(period: str) -> str | None:
    """The previous same-kind period (growth never mixes granularity)."""
    if m := re.fullmatch(r"(\d{4})-Q([1-4])", period):
        year, quarter = int(m[1]), int(m[2])
        return f"{year - 1}-Q4" if quarter == 1 else f"{year}-Q{quarter - 1}"
    if m := re.fullmatch(r"(\d{4})-H([12])", period):
        year = int(m[1])
        return f"{year - 1}-H2" if m[2] == "1" else f"{year}-H1"
    if m := re.fullmatch(r"FY(\d{4})", period):
        return f"FY{int(m[1]) - 1}"
    return None


def annualization_factor(period: str) -> int:
    if re.fullmatch(r"\d{4}-Q[1-4]", period):
        return 4
    if re.fullmatch(r"\d{4}-H[12]", period):
        return 2
    return 1


def _is_leap(year: int) -> bool:
    return (year % 4 == 0 and year % 100 != 0) or year % 400 == 0


def period_day_count(period: str) -> int:
    """Actual day count (receivables days uses this, not 365)."""
    if m := re.fullmatch(r"(\d{4})-Q([1-4])", period):
        year = int(m[1])
        return (91 if _is_leap(year) else 90, 91, 92, 92)[int(m[2]) - 1]
    if m := re.fullmatch(r"(\d{4})-H([12])", period):
        year = int(m[1])
        return (182 if _is_leap(year) else 181) if m[2] == "1" else 184
    if m := re.fullmatch(r"FY(\d{4})", period):
        return 366 if _is_leap(int(m[1])) else 365
    return 365

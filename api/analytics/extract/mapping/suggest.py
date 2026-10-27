"""Canonical-key suggestions for statement rows — flows/statement-mapping.md,
line-items.md. Each row gets a key and a confidence; anything below the
floor arrives unmapped so the user maps it, never a guess."""

import re

from compute.registry.line_items import KEYS_BY_KIND, LABELS, SUGGESTION_CONFIDENCE_FLOOR

# Common source-label phrasings per key. Exact phrase -> high confidence;
# token overlap -> lower.
SYNONYMS: dict[str, tuple[str, ...]] = {
    "cash_and_equivalents": ("cash and cash equivalents", "cash and bank", "cash at bank", "bank balances", "cash"),
    "receivables": ("trade receivables", "accounts receivable", "trade debtors", "debtors"),
    "inventory": ("inventories", "inventory", "stock"),
    "current_assets_other": ("prepayments", "other current assets", "other receivables"),
    "current_assets": ("total current assets",),
    "ppe": ("property plant and equipment", "fixed assets", "ppe"),
    "intangibles": ("intangible assets", "goodwill", "software"),
    "noncurrent_assets_other": ("other non current assets", "investments", "deferred tax assets"),
    "total_assets": ("total assets",),
    "payables": ("trade payables", "accounts payable", "trade creditors", "creditors"),
    "short_term_debt": ("short term borrowings", "bank overdraft", "current portion of loans", "short term loans"),
    "current_liabilities_other": ("accruals", "other payables", "other current liabilities", "tax payable"),
    "current_liabilities": ("total current liabilities",),
    "long_term_debt": ("long term borrowings", "long term loans", "term loan", "bonds"),
    "noncurrent_liabilities_other": ("other non current liabilities", "deferred tax liabilities", "provisions"),
    "total_liabilities": ("total liabilities",),
    "share_capital": ("share capital", "ordinary shares", "issued capital"),
    "retained_earnings": ("retained earnings", "accumulated profit", "revenue reserve"),
    "equity": ("total equity", "shareholders funds", "total shareholders equity"),
    "revenue": ("revenue", "turnover", "sales", "income from operations"),
    "cogs": ("cost of sales", "cost of goods sold", "direct costs"),
    "gross_profit": ("gross profit",),
    "opex": ("operating expenses", "administrative expenses", "selling and distribution expenses", "overheads"),
    "depreciation_amortization": ("depreciation and amortisation", "depreciation and amortization", "depreciation"),
    "operating_profit": ("operating profit", "profit from operations", "ebit"),
    "interest_expense": ("finance costs", "interest expense", "interest paid"),
    "interest_income": ("finance income", "interest income", "interest received"),
    "tax_expense": ("income tax expense", "taxation", "tax expense"),
    "net_income": ("profit for the year", "net income", "profit after tax", "net profit"),
    "cfo": ("net cash from operating activities", "cash generated from operations", "operating cash flow"),
    "cfi": ("net cash used in investing activities", "net cash from investing activities"),
    "cff": ("net cash from financing activities", "net cash used in financing activities"),
    "capex": ("purchase of property plant and equipment", "capital expenditure", "purchase of ppe"),
    "net_change_in_cash": ("net increase in cash", "net decrease in cash", "net change in cash"),
}

_NON_WORD = re.compile(r"[^a-z0-9 ]")


def _normalize(label: str) -> str:
    return " ".join(_NON_WORD.sub(" ", label.lower().replace("&", " and ")).split())


def suggest(kind: str, label: str) -> tuple[str | None, float | None]:
    """Returns (canonical_key or None, confidence)."""
    norm = _normalize(label)
    if not norm:
        return None, None
    tokens = set(norm.split())
    best_key, best = None, 0.0
    for key in KEYS_BY_KIND[kind]:
        phrases = SYNONYMS.get(key, ()) + (_normalize(LABELS[key]),)
        for phrase in phrases:
            if norm == phrase:
                score = 0.95
            elif phrase in norm:
                score = 0.8 * len(phrase) / len(norm) + 0.1
            else:
                words = set(phrase.split())
                score = 0.7 * len(words & tokens) / len(words | tokens)
            if score > best:
                best_key, best = key, score
    if best < SUGGESTION_CONFIDENCE_FLOOR:
        return None, round(best, 2) if best else None
    return best_key, round(best, 2)

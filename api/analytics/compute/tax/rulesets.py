"""In-memory rule-set map, rebuilt from the compacted config.rulesets topic
on start (system-design.md §6.6). Resolution is by tax kind and the
period's start date (tax-engine.md §1)."""

import re
from datetime import date, timedelta


class RulesetUnavailable(LookupError):
    pass


class RulesetBook:
    def __init__(self):
        self._sets: dict[str, dict] = {}

    def __len__(self) -> int:
        return len(self._sets)

    def apply(self, message: dict) -> None:
        self._sets[message["ruleset_id"]] = message

    def resolve(self, tax_kind: str, start: date) -> dict:
        candidates = [
            r for r in self._sets.values()
            if r["tax_kind"] == tax_kind
            and date.fromisoformat(r["effective_from"]) <= start
            and (r.get("effective_to") is None or start <= date.fromisoformat(r["effective_to"]))
        ]
        if not candidates:
            raise RulesetUnavailable(f"no {tax_kind} rule set for {start.isoformat()}")
        return max(candidates, key=lambda r: r["effective_from"])


def period_start(period: str, fiscal_year_end: str = "12-31") -> date:
    """YYYY-MM (VAT), YYYY (PIT), FYYYYY (CIT; the year the FY ends in)."""
    if m := re.fullmatch(r"(\d{4})-(\d{2})", period):
        return date(int(m[1]), int(m[2]), 1)
    if m := re.fullmatch(r"(\d{4})", period):
        return date(int(m[1]), 1, 1)
    if m := re.fullmatch(r"FY(\d{4})", period):
        month, day = (int(x) for x in fiscal_year_end.split("-"))
        return date(int(m[1]) - 1, month, day) + timedelta(days=1)
    raise ValueError(f"unsupported tax period {period}")


def period_end(period: str, fiscal_year_end: str = "12-31") -> date:
    if m := re.fullmatch(r"(\d{4})-(\d{2})", period):
        year, month = int(m[1]), int(m[2])
        return date(year + (month == 12), month % 12 + 1, 1) - timedelta(days=1)
    if m := re.fullmatch(r"(\d{4})", period):
        return date(int(m[1]), 12, 31)
    if m := re.fullmatch(r"FY(\d{4})", period):
        month, day = (int(x) for x in fiscal_year_end.split("-"))
        return date(int(m[1]), month, day)
    raise ValueError(f"unsupported tax period {period}")

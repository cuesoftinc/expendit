"""Statement derivations and confirm-time validation — line-items.md §4,
flows/statement-mapping.md, system-design.md §6.4 (S-7, S-8).

api/common stores the result against the statement's mapping_version and
confirm becomes a CRUD check of it.
"""

from compute.registry.line_items import DERIVATIONS, IDENTITY_TOLERANCE, UNMAPPED_VALUE_THRESHOLD


def _mapped(items: list[dict], key: str) -> dict | None:
    return next((i for i in items if i.get("canonical_key") == key and i["status"] == "mapped"), None)


def derive(kind: str, items: list[dict]) -> tuple[list[dict], list[str]]:
    """Derived keys compute when absent and cross-check when present (>1 %
    divergence is a warning). Returns (derived rows, warnings); derived rows
    feed later derivations (current_assets before total_assets)."""
    items = list(items)
    derived: list[dict] = []
    warnings: list[str] = []
    for d in DERIVATIONS:
        if d.kind != kind:
            continue
        terms = [item["amount"] * sign for key, sign in d.terms if (item := _mapped(items, key))]
        if not terms:
            continue
        computed = sum(terms)
        existing = _mapped(items, d.key)
        if existing:
            basis = max(abs(existing["amount"]), 1)
            if abs(existing["amount"] - computed) / basis > IDENTITY_TOLERANCE:
                warnings.append(
                    f"{d.key}: reported {existing['amount']:g} differs from component sum {computed:g} by >1%"
                )
        else:
            row = {"canonical_key": d.key, "amount": computed, "status": "mapped", "formula": d.formula}
            derived.append(row)
            items.append(row)
    return derived, warnings


def validate(kind: str, items: list[dict], mapping_version: int) -> dict:
    """The stored validation (compute.results.schema.json#/$defs/validation)."""
    derived, warnings = derive(kind, items)
    everything = items + derived
    codes: list[str] = []

    mapped = sum(abs(i["amount"]) for i in everything if i["status"] == "mapped")
    unmapped = sum(abs(i["amount"]) for i in everything if i["status"] == "unmapped")
    total = mapped + unmapped
    if total > 0 and unmapped / total > UNMAPPED_VALUE_THRESHOLD:
        codes.append("unmapped_threshold_exceeded")

    if kind == "balance_sheet":
        def value(key: str) -> float | None:
            item = _mapped(everything, key)
            return item["amount"] if item else None

        assets, liabilities, equity = value("total_assets"), value("total_liabilities"), value("equity")
        # A missing side counts as 0: a sheet with assets but no liability
        # or equity rows violates the identity rather than skipping it.
        if assets is not None or liabilities is not None or equity is not None:
            a, rhs = assets or 0.0, (liabilities or 0.0) + (equity or 0.0)
            if abs(a - rhs) / max(abs(a), abs(rhs), 1) > IDENTITY_TOLERANCE:
                codes.append("mapping_identity_violation")

    return {
        "ok": not codes,
        "codes": codes,
        "mapping_version": mapping_version,
        "derived": derived,
        "warnings": warnings,
    }

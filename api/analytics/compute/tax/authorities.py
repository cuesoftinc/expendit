"""Remittance-authority registry — tax-engine.md §5.5. Estimates and filings
store the resolved authority so history survives registry changes."""

FIRS = {
    "code": "FIRS",
    "name": "Federal Inland Revenue Service",
    "payment_channels": ["TaxPro-Max portal", "Remita"],
}

STATE_IRS = {
    "NG-LA": {
        "code": "LIRS",
        "name": "Lagos State Internal Revenue Service",
        "payment_channels": ["LIRS eTax portal"],
    },
}


def resolve(tax_kind: str, taxpayer_kind: str, state_of_residence: str | None) -> dict:
    """PIT for a resident individual -> the State IRS of residence; CIT
    (+ levy) and VAT -> FIRS. An unknown state falls back to FIRS."""
    if tax_kind == "pit" and taxpayer_kind == "individual" and state_of_residence:
        return STATE_IRS.get(state_of_residence, FIRS)
    return FIRS

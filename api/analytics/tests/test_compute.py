import uuid
from datetime import date

import pytest

from compute.derive.statement import validate
from compute.handler import ComputeHandler
from compute.ratios.engine import compute_report
from compute.tax.engine import estimate, pit_from_bands
from compute.tax.rulesets import RulesetBook, RulesetUnavailable, period_start
from kafka import topics
from tests.conftest import example

RULESETS = ["ng-pit-2026", "ng-pit-legacy", "ng-cit-2026", "ng-cit-legacy", "ng-vat-2026"]


@pytest.fixture
def book(contract) -> RulesetBook:
    book = RulesetBook()
    for name in RULESETS:
        message = example(f"config.rulesets.{name}")
        contract.validate_envelope(message)
        contract.validate_data(topics.CONFIG_RULESETS, message["data"])
        book.apply(message["data"])
    return book


# --- rule sets ---------------------------------------------------------------


def test_rulesets_resolve_by_period_start(book):
    assert book.resolve("pit", period_start("2025"))["ruleset_id"] == "ng-pit-legacy"
    assert book.resolve("pit", period_start("2026"))["ruleset_id"] == "ng-pit-2026"
    assert book.resolve("cit", period_start("FY2025"))["ruleset_id"] == "ng-cit-legacy"
    assert book.resolve("cit", period_start("FY2026"))["ruleset_id"] == "ng-cit-2026"
    # A June year-end company's FY2026 starts 2025-07-01: still legacy.
    assert book.resolve("cit", period_start("FY2026", "06-30"))["ruleset_id"] == "ng-cit-legacy"
    with pytest.raises(RulesetUnavailable):
        RulesetBook().resolve("vat", date(2026, 1, 1))


# --- PIT ---------------------------------------------------------------------


def test_pit_2026_golden_band_edges(book):
    bands = book.resolve("pit", date(2026, 1, 1))["rules"]["bands"]
    assert pit_from_bands(800_000, bands) == 0
    assert pit_from_bands(3_000_000, bands) == 330_000
    assert pit_from_bands(12_000_000, bands) == 330_000 + 1_620_000
    assert pit_from_bands(25_000_000, bands) == 1_950_000 + 2_730_000
    assert pit_from_bands(50_000_000, bands) == 4_680_000 + 5_750_000
    assert pit_from_bands(60_000_000, bands) == 10_430_000 + 2_500_000


def _pit(book, period, income, **extra):
    request = {"kind": "pit", "period": period, "income": income} | extra
    inputs = {"today": "2026-10-05", "taxpayer_kind": "individual", "state_of_residence": "NG-LA", "requests": [request]}
    return estimate(inputs, book)[0]


def test_pit_2026_estimate_with_rent_relief_and_lirs(book):
    income = [
        {"id": "t1", "amount": 5_000_000, "tax_treatment": "taxable_income"},
        {"id": "t2", "amount": 400_000, "tax_treatment": "exempt"},
        {"id": "t3", "amount": 900_000, "tax_treatment": "ignore"},
    ]
    result = _pit(book, "2026", income, annual_rent=3_000_000)
    fields = {f["key"]: f for f in result["computed_fields"]}
    assert fields["gross_income"]["value"] == 5_000_000
    assert fields["gross_income"]["inputs"] == ["t1"]
    assert fields["rent_relief"]["value"] == 500_000  # 20% of 3m = 600k, capped
    # chargeable 4.5m: 2.2m x 15% + 1.5m x 18%
    assert result["amount_due"] == 330_000 + 270_000
    assert result["authority"]["code"] == "LIRS"
    assert result["due_date"] == "2027-03-31"
    assert result["ruleset_id"] == "ng-pit-2026" and result["estimate_only"] is True


def test_pit_legacy_cra_and_minimum_tax(book):
    # Gross 1m: CRA = max(200k, 10k) + 200k = 400k; chargeable 600k:
    # 300k x 7% + 300k x 11% = 54k (> 1% minimum tax of 10k).
    result = _pit(book, "2025", [{"id": "t", "amount": 1_000_000, "tax_treatment": "taxable_income"}])
    assert result["amount_due"] == 54_000
    assert result["ruleset_id"] == "ng-pit-legacy"
    # Below the exemption floor.
    assert _pit(book, "2025", [{"id": "t", "amount": 20_000, "tax_treatment": "taxable_income"}])["amount_due"] == 0


# --- CIT ---------------------------------------------------------------------


def _cit(book, period, basis, items):
    request = {"kind": "cit", "period": period, "basis_period": basis, "line_items": items}
    inputs = {"today": "2026-10-05", "taxpayer_kind": "company", "fiscal_year_end": "12-31", "requests": [request]}
    return estimate(inputs, book)[0]


def test_cit_2026_other_company(book):
    items = {
        "net_income": {"id": "ni", "amount": 15_000_000},
        "depreciation_amortization": {"id": "da", "amount": 1_100_000},
        "revenue": {"id": "rv", "amount": 180_000_000},
        "ppe": {"id": "pp", "amount": 40_000_000},
    }
    result = _cit(book, "FY2026", "FY2025", items)
    fields = {f["key"]: f["value"] for f in result["computed_fields"]}
    assert fields["assessable_profit"] == 16_100_000
    assert fields["cit"] == 4_830_000
    assert fields["development_levy"] == 644_000
    assert result["amount_due"] == 5_474_000
    assert result["due_date"] == "2027-06-30"
    assert result["authority"]["code"] == "FIRS"
    assert any("FY2025 results" in b for b in result["banners"])


def test_cit_2026_small_company_pays_nothing_and_flags_borderline(book):
    items = {"net_income": {"id": "ni", "amount": 9_000_000}, "revenue": {"id": "rv", "amount": 95_000_000}}
    result = _cit(book, "FY2026", "FY2026", items)
    assert result["amount_due"] == 0
    assert any("Borderline" in b for b in result["banners"])


def test_cit_legacy_turnover_band_and_tet(book):
    items = {"net_income": {"id": "ni", "amount": 10_000_000}, "revenue": {"id": "rv", "amount": 60_000_000}}
    result = _cit(book, "FY2025", "FY2025", items)
    fields = {f["key"]: f["value"] for f in result["computed_fields"]}
    assert fields["cit"] == 2_000_000  # 20% band
    assert fields["tertiary_education_tax"] == 300_000


# --- VAT ---------------------------------------------------------------------


def test_vat_inclusive_and_exclusive_bases(book):
    txns = [
        {"id": "s1", "amount": 1_075_000, "direction": "income", "vat_treatment": "vatable", "vat_basis": "inclusive"},
        {"id": "p1", "amount": 200_000, "direction": "expense", "vat_treatment": "vatable", "vat_basis": "exclusive"},
        {"id": "x1", "amount": 50_000, "direction": "expense", "vat_treatment": "exempt", "vat_basis": "inclusive"},
    ]
    request = {"kind": "vat", "period": "2026-06", "transactions": txns}
    inputs = {"today": "2026-10-05", "taxpayer_kind": "company", "requests": [request]}
    (result,) = estimate(inputs, book)
    fields = {f["key"]: f for f in result["computed_fields"]}
    assert fields["output_vat"]["value"] == 75_000
    assert fields["input_vat"]["value"] == 15_000
    assert fields["input_vat"]["inputs"] == ["p1"]
    assert result["amount_due"] == 60_000
    assert result["due_date"] == "2026-07-21"
    assert result["banners"] == []


def test_filing_refuses_unsigned_ruleset(book):
    request = {"kind": "vat", "period": "2026-06", "transactions": []}
    with pytest.raises(PermissionError, match="ruleset_unsigned"):
        estimate({"today": "2026-10-05", "taxpayer_kind": "company", "requests": [request]}, book, for_filing=True)


# --- statements --------------------------------------------------------------


def _item(key, amount, status="mapped"):
    return {"canonical_key": key, "amount": amount, "status": status}


def test_balance_sheet_derives_totals_and_passes_identity():
    items = [
        _item("cash_and_equivalents", 40), _item("receivables", 60), _item("ppe", 100),
        _item("payables", 50), _item("long_term_debt", 50), _item("share_capital", 70), _item("retained_earnings", 30),
    ]
    result = validate("balance_sheet", items, mapping_version=3)
    derived = {d["canonical_key"]: d["amount"] for d in result["derived"]}
    assert derived["current_assets"] == 100 and derived["total_assets"] == 200
    assert derived["total_liabilities"] == 100 and derived["equity"] == 100
    assert result == result | {"ok": True, "codes": [], "mapping_version": 3}


def test_identity_violation_and_unmapped_threshold():
    items = [_item("total_assets", 200), _item("total_liabilities", 100), _item("equity", 50), _item("", 100, "unmapped")]
    result = validate("balance_sheet", items, mapping_version=1)
    assert set(result["codes"]) == {"mapping_identity_violation", "unmapped_threshold_exceeded"}
    assert result["ok"] is False


def test_reported_total_that_disagrees_is_a_warning():
    items = [_item("revenue", 100), _item("cogs", 40), _item("gross_profit", 70)]
    assert validate("income_statement", items, 1)["warnings"] == [
        "gross_profit: reported 70 differs from component sum 60 by >1%"
    ]


# --- ratios ------------------------------------------------------------------


def _values(**amounts):
    return {k: {"id": f"li-{k}", "amount": v} for k, v in amounts.items()}


def test_ratios_bands_traces_growth_and_delta():
    current = {
        "period": "FY2025",
        "kinds": ["balance_sheet", "income_statement"],
        "values": _values(current_assets=300, current_liabilities=150, inventory=50, cash_and_equivalents=90,
                          equity=-10, revenue=1000, net_income=120, total_assets=500),
    }
    previous = {"period": "FY2024", "kinds": ["balance_sheet", "income_statement"],
                "values": _values(current_assets=200, current_liabilities=200, revenue=800, net_income=-5)}
    results = {r["key"]: r for r in compute_report({
        "period": "FY2025", "current": current, "previous": previous,
        "ledger_monthly_nets": [-20, -30, -25], "cash_flow_periods": 0,
    })}

    current_ratio = results["current_ratio"]
    assert current_ratio["value"] == 2.0 and current_ratio["status"] == "healthy"
    assert {i["id"] for i in current_ratio["inputs"]} == {"li-current_assets", "li-current_liabilities"}
    assert current_ratio["period_delta"] == pytest.approx(1.0)

    assert results["roe"]["badge"] == "negative equity"
    assert results["revenue_growth"]["value"] == pytest.approx(0.25)
    assert results["net_income_growth"]["na_reason"] == "n/a — sign change"
    assert results["free_cash_flow"]["na_reason"] == "n/a — missing cash_flow for FY2025"
    assert results["runway_months"]["value"] == 3.6  # 90 / 25
    assert "interest_coverage_ebitda" not in results  # D&A not mapped


async def test_handler_round_trips_through_the_contract(contract, book):
    handler = ComputeHandler(book, ai=None)
    request = {
        "request_id": str(uuid.uuid4()),
        "org_id": str(uuid.uuid4()),
        "kind": "statement_validation",
        "data_version": 7,
        "period": "FY2025",
        "inputs": {
            "statement_id": str(uuid.uuid4()),
            "kind": "income_statement",
            "mapping_version": 2,
            "line_items": [_item("revenue", 100), _item("cogs", 40)],
        },
    }
    contract.validate_data(topics.COMPUTE_REQUESTED, request)
    result = await handler.run(request)
    contract.validate_data(topics.COMPUTE_RESULTS, result)
    assert result["status"] == "ok" and result["data_version"] == 7
    assert result["period"] == "FY2025" and result["statement_id"] == request["inputs"]["statement_id"]
    assert result["validation"]["derived"][0]["canonical_key"] == "gross_profit"

    summary = await handler.run(request | {"kind": "dashboard_summary", "inputs": {"totals": {"income": 1, "expense": 1}}})
    contract.validate_data(topics.COMPUTE_RESULTS, summary)
    assert summary["error_code"] == "ai_unavailable"

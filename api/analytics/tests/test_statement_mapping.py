import uuid

from extract.mapping.pipeline import StatementPipeline, parse_label_amounts
from extract.mapping.suggest import suggest
from kafka import topics

BALANCE_SHEET = b"""Statement of financial position,,
Item,2024,2025
Cash and cash equivalents,30000,40000
Trade receivables,50000,60000
"Property, plant and equipment",90000,100000
Trade payables,40000,50000
Long-term borrowings,60000,50000
Share capital,70000,70000
Retained earnings,0,30000
Miscellaneous reserve,1000,(2000)
"""


def test_suggest_maps_common_labels_and_parks_unknowns():
    assert suggest("balance_sheet", "Trade receivables")[0] == "receivables"
    assert suggest("income_statement", "Cost of sales")[0] == "cogs"
    assert suggest("income_statement", "Profit for the year")[0] == "net_income"
    key, confidence = suggest("balance_sheet", "Miscellaneous reserve")
    assert key is None


def test_parse_takes_label_and_latest_period_with_brackets_negative():
    rows = dict(parse_label_amounts("csv", BALANCE_SHEET))
    assert rows["Cash and cash equivalents"] == 40000
    assert rows["Miscellaneous reserve"] == -2000
    assert "Item" not in rows


async def test_statement_pipeline_stages_and_validates(contract, store):
    key = "expendit/test/tmp/bs.csv"
    store.objects[key] = BALANCE_SHEET
    msg = {
        "statement_id": str(uuid.uuid4()),
        "org_id": str(uuid.uuid4()),
        "kind": "balance_sheet",
        "period": "FY2025",
        "currency": "NGN",
        "file_type": "csv",
        "file": {"bucket": store.bucket, "key": key},
        "ai_allowed": False,
    }
    contract.validate_data(topics.STATEMENT_READY, msg)
    result = await StatementPipeline(store).run(msg)
    contract.validate_data(topics.STATEMENT_MAPPED, result)
    assert result["status"] == "staged"
    derived = {i["canonical_key"] for i in result["line_items"] if i["derived"]}
    assert {"current_assets", "total_assets", "total_liabilities", "equity"} <= derived
    # assets 200 vs liabilities 100 + equity 100: the identity holds; the
    # unmapped reserve (2k of ~402k) is under the 20% threshold.
    assert result["validation"]["ok"] is True

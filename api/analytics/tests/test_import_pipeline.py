import copy

from extract.pipeline import ImportPipeline
from kafka import topics
from tests.conftest import example

CSV = b"""Date,Description,Amount,Type
2026-09-02,CHICKEN REPUBLIC IKEJA,4500.00,DR
2026-09-05,BOLT RIDE LAGOS,12000.00,DR
2026-09-28,SALARY SEPTEMBER,350000.00,CR
"""


def ready(store, data: bytes = CSV, **overrides) -> dict:
    msg = copy.deepcopy(example("import.ready")["data"])
    store.objects[msg["file"]["key"]] = data
    return msg | overrides


async def test_csv_import_flags_duplicate_and_resolves_categories(contract, store):
    result = await ImportPipeline(store, ai=None).run(ready(store))
    contract.validate_data(topics.IMPORT_PROCESSED, result)

    assert result["status"] == "completed"
    assert result["total_parsed"] == 3
    rows = {r["description"]: r for r in result["transactions"]}

    # Same amount, same day and same description as the ledger row: flagged, kept.
    food = rows["CHICKEN REPUBLIC IKEJA"]
    assert food["is_duplicate"] is True
    assert food["category_id"] == "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e"
    assert result["duplicates_found"] == 1

    # A category the org doesn't have yet comes back by name only.
    bolt = rows["BOLT RIDE LAGOS"]
    assert bolt["category_name"] == "Transportation" and "category_id" not in bolt

    # Duplicates don't count toward the summary.
    assert result["summary"]["total_expense"] == 12000
    assert result["summary"]["total_income"] == 350000


async def test_large_transaction_anomaly(contract, store):
    msg = ready(store, CSV.replace(b"12000.00", b"900000.00"))
    result = await ImportPipeline(store, ai=None).run(msg)
    contract.validate_data(topics.IMPORT_PROCESSED, result)
    flagged = [a for a in result["anomalies"] if a["rule_id"] == "large_transaction"]
    assert len(flagged) == 1
    assert result["transactions"][flagged[0]["txn_index"]]["amount"] == 900000


async def test_unparseable_file_fails_with_taxonomy_code(contract, store):
    result = await ImportPipeline(store, ai=None).run(ready(store, b"not,a,statement\n1,2,3\n"))
    contract.validate_data(topics.IMPORT_PROCESSED, result)
    assert result == {
        "job_id": result["job_id"],
        "org_id": result["org_id"],
        "file_type": "csv",
        "status": "failed",
        "error_code": "no_transactions_found",
    }


async def test_image_without_consent_is_refused(contract, store):
    msg = ready(store, b"\xff\xd8\xff\xe0jpeg", file_type="image", file_name="receipt.jpg")
    result = await ImportPipeline(store, ai=None).run(msg)
    contract.validate_data(topics.IMPORT_PROCESSED, result)
    assert result["error_code"] == "consent_required"


async def test_image_without_provider_is_ai_unavailable(store):
    msg = ready(store, b"\xff\xd8\xff\xe0jpeg", file_type="image", file_name="receipt.jpg", ai_allowed=True)
    result = await ImportPipeline(store, ai=None).run(msg)
    assert result["error_code"] == "ai_unavailable"


async def test_bank_sync_rows_skip_storage(contract, store):
    msg = copy.deepcopy(example("import.ready")["data"])
    for key in ("file", "file_type", "file_name"):
        msg.pop(key)
    msg |= {
        "source": "bank_sync",
        "rows": [{"txn_date": "2026-09-10", "amount": 2500, "direction": "expense", "description": "MTN AIRTIME"}],
    }
    contract.validate_data(topics.IMPORT_READY, msg)
    result = await ImportPipeline(store, ai=None).run(msg)
    contract.validate_data(topics.IMPORT_PROCESSED, result)
    assert result["transactions"][0]["category_name"] == "Utility"

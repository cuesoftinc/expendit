import pytest

from contract import ContractError
from kafka import envelope, topics
from tests.conftest import example


@pytest.mark.parametrize("name", ["upload.received", "import.ready", "import.processed", "import.processed.failed"])
def test_examples_match_schemas(contract, name):
    message = example(name)
    contract.validate_envelope(message)
    contract.validate_data(message["type"], message["data"])


def test_rejects_unknown_field(contract):
    data = example("import.processed")["data"] | {"surprise": True}
    with pytest.raises(ContractError, match="surprise"):
        contract.validate_data(topics.IMPORT_PROCESSED, data)


async def test_small_payload_travels_inline(contract, store):
    data = example("import.processed")["data"]
    message = await envelope.wrap(topics.IMPORT_PROCESSED, data, contract, store, "expendit/test")
    assert message["data"] == data and "data_ref" not in message
    assert await envelope.unwrap(topics.IMPORT_PROCESSED, message, contract, store) == data


async def test_large_payload_goes_by_reference(contract, store):
    data = example("import.processed")["data"]
    row = data["transactions"][1]
    data = data | {"transactions": [row | {"description": f"row {i} " + "x" * 200} for i in range(3000)]}
    message = await envelope.wrap(topics.IMPORT_PROCESSED, data, contract, store, "expendit/test")
    assert "data" not in message
    assert message["data_ref"]["key"].startswith("expendit/test/compute/")
    assert await envelope.unwrap(topics.IMPORT_PROCESSED, message, contract, store) == data


async def test_unwrap_rejects_wrong_topic(contract, store):
    with pytest.raises(ValueError):
        await envelope.unwrap(topics.IMPORT_READY, example("import.processed"), contract, store)

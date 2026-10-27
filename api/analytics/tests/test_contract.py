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


async def test_every_payload_goes_by_reference(contract, store):
    """The bus is shared with other products (system-design.md §16 I-18)."""
    data = example("import.processed")["data"]
    message = await envelope.wrap(topics.IMPORT_PROCESSED, data, contract, store, "expendit/test")
    assert "data" not in message and message["data_ref"]["key"].startswith("expendit/test/compute/")
    assert await envelope.unwrap(topics.TOPIC_RESULTS, message, contract, store, "expendit/test") == (
        topics.IMPORT_PROCESSED,
        data,
    )


async def test_large_payload_goes_by_reference(contract, store):
    data = example("import.processed")["data"]
    row = data["transactions"][1]
    data = data | {"transactions": [row | {"description": f"row {i} " + "x" * 200} for i in range(3000)]}
    message = await envelope.wrap(topics.IMPORT_PROCESSED, data, contract, store, "expendit/test")
    assert "data" not in message
    assert message["data_ref"]["key"].startswith("expendit/test/compute/")
    assert await envelope.unwrap(topics.TOPIC_RESULTS, message, contract, store, "expendit/test") == (
        topics.IMPORT_PROCESSED,
        data,
    )


async def test_unwrap_rejects_wrong_topic(contract, store):
    with pytest.raises(ContractError):
        await envelope.unwrap(topics.TOPIC_REQUESTS, example("import.processed"), contract, store, "expendit/test")


def test_check_rejects_another_major_version():
    message = {"type": topics.IMPORT_PROCESSED, "version": "2.0", "data_ref": {}}
    with pytest.raises(ContractError, match="version"):
        envelope.check(topics.TOPIC_RESULTS, message, "bucket", "expendit/test")


def test_check_rejects_inline_user_data():
    message = {"type": topics.IMPORT_PROCESSED, "version": "1.0", "data": {}}
    with pytest.raises(ContractError, match="data_ref"):
        envelope.check(topics.TOPIC_RESULTS, message, "bucket", "expendit/test")


@pytest.mark.parametrize(
    "ref",
    [
        {"bucket": "other", "key": "expendit/test/compute/a.json"},
        {"bucket": "bucket", "key": "apparule/test/compute/a.json"},
        {"bucket": "bucket", "key": "expendit/test/compute/../../x.json"},
    ],
)
def test_check_rejects_pointers_outside_our_storage(ref):
    message = {"type": topics.IMPORT_PROCESSED, "version": "1.0", "data_ref": ref}
    with pytest.raises(ContractError, match="outside"):
        envelope.check(topics.TOPIC_RESULTS, message, "bucket", "expendit/test")


def test_events_ride_the_shared_lanes():
    assert set(topics.TOPIC_FOR.values()) == {topics.TOPIC_UPLOADS, topics.TOPIC_REQUESTS, topics.TOPIC_RESULTS}
    assert all(event.startswith(topics.PRODUCT) for event in topics.TOPIC_FOR)


def test_other_products_messages_are_not_ours():
    assert envelope.event_of({"type": "apparule.capture.measured"}) == "apparule.capture.measured"
    assert envelope.event_of(None) is None  # undecodable bytes
    assert envelope.event_of({"no": "type"}) is None


async def test_heartbeat_rides_cuelabs_requests(contract, store):
    """common's reaper keeps the shared Aiven Kafka awake (system-design.md §16 I-17)."""
    data = {"sent_at": "2026-10-13T06:00:00Z", "source": "reaper"}
    message = await envelope.wrap(topics.HEARTBEAT, data, contract, store, "expendit/test")
    assert await envelope.unwrap(topics.TOPIC_REQUESTS, message, contract, store, "expendit/test") == (
        topics.HEARTBEAT,
        data,
    )

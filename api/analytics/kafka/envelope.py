"""The message envelope (api/common/contract/envelope.schema.json) and the
S-3 claim-check. Every product can read the shared bus's lanes, so every
payload travels through compute/ by reference (system-design.md §16 I-18);
storage permissions keep it private."""

import json
import uuid
from datetime import UTC, datetime

from contract import Contract
from kafka.topics import TOPIC_FOR
from storage import ObjectStore

VERSION = 1


async def wrap(event: str, data: dict, contract: Contract, store: ObjectStore, prefix: str) -> dict:
    """Validates `data` for `event` and returns the envelope to send."""
    contract.validate_data(event, data)
    message_id = str(uuid.uuid4())
    envelope: dict = {
        "type": event,
        "version": VERSION,
        "id": message_id,
        "produced_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
    }
    body = json.dumps(data, separators=(",", ":")).encode()
    key = f"{prefix}/compute/{message_id}.json"
    await store.put(key, body, "application/json")
    envelope["data_ref"] = {"bucket": store.bucket, "key": key, "size": len(body), "content_type": "application/json"}
    return envelope


def event_of(value: object) -> str | None:
    """The event type of a raw message, or None when it can't be one of ours.
    Read before any validation: other products' envelopes aren't ours to
    check."""
    if isinstance(value, dict) and isinstance(value.get("type"), str):
        return value["type"]
    return None


async def unwrap(topic: str, envelope: dict, contract: Contract, store: ObjectStore) -> tuple[str, dict]:
    """Validates the envelope, resolves a data_ref, validates the payload.
    Returns the event and its data."""
    contract.validate_envelope(envelope)
    event = envelope["type"]
    if TOPIC_FOR.get(event) != topic:
        raise ValueError(f"event {event} does not belong on topic {topic}")
    if "data_ref" in envelope:
        data = json.loads(await store.get(envelope["data_ref"]["key"]))
    else:
        data = envelope["data"]
    contract.validate_data(event, data)
    return event, data

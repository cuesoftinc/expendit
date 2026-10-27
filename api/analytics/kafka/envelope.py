"""The message envelope (api/common/contract/envelope.schema.json) and the
S-3 claim-check. Every product can read the shared bus's lanes, so every
payload travels through compute/ by reference (system-design.md §16 I-18);
storage permissions keep it private."""

import json
import uuid
from contextvars import ContextVar
from datetime import UTC, datetime

from contract import Contract, ContractError
from kafka.topics import HEARTBEAT, TOPIC_FOR
from storage import ObjectStore

# "<major>.<minor>"; consumers reject another major.
VERSION = "1.0"
MAJOR = "1"

# Events whose data may ride inline: they hold no user data.
INLINE = {HEARTBEAT}

# The request being handled; results sent meanwhile carry its request_id.
REQUEST_ID: ContextVar[str | None] = ContextVar("request_id", default=None)


async def wrap(
    event: str, data: dict, contract: Contract, store: ObjectStore, prefix: str, request_id: str | None = None
) -> dict:
    """Validates `data` for `event` and returns the envelope to send.
    `request_id` defaults to the request being handled."""
    contract.validate_data(event, data)
    message_id = str(uuid.uuid4())
    envelope: dict = {
        "type": event,
        "version": VERSION,
        "id": message_id,
        "produced_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
    }
    request_id = request_id or REQUEST_ID.get()
    if request_id:
        envelope["request_id"] = request_id
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


def check(topic: str, envelope: dict, bucket: str, prefix: str) -> str:
    """Validates the envelope, its major version and where its payload lives.
    Returns the event. Raises ContractError for anything off-contract."""
    event = envelope.get("type")
    if TOPIC_FOR.get(event) != topic:
        raise ContractError(f"event {event} does not belong on topic {topic}")
    if str(envelope.get("version", "")).split(".")[0] != MAJOR:
        raise ContractError(f"unsupported envelope version {envelope.get('version')}")
    if "data" in envelope and event not in INLINE:
        raise ContractError(f"{event} must go by data_ref")
    if "data_ref" in envelope:
        ref = envelope["data_ref"]
        key = str(ref.get("key", ""))
        owned = key.startswith((f"{prefix}/compute/", f"{prefix}/tmp/")) and ".." not in key
        if ref.get("bucket") != bucket or not owned:
            raise ContractError("data_ref outside Expendit's storage")
    return event


async def unwrap(topic: str, envelope: dict, contract: Contract, store: ObjectStore, prefix: str) -> tuple[str, dict]:
    """Validates the envelope, resolves a data_ref, validates the payload.
    Returns the event and its data. Raises ContractError when off-contract,
    ObjectMissing when the payload is gone; anything else is transient."""
    contract.validate_envelope(envelope)
    event = check(topic, envelope, store.bucket, prefix)
    if "data_ref" in envelope:
        data = json.loads(await store.get(envelope["data_ref"]["key"]))
    else:
        data = envelope["data"]
    contract.validate_data(event, data)
    return event, data

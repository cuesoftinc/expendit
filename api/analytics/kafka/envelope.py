"""The message envelope (api/common/contract/envelope.schema.json) and the
S-3 claim-check: payloads over 512 KB travel through compute/ by reference."""

import json
import uuid
from datetime import UTC, datetime

from contract import Contract
from storage import ObjectStore

VERSION = 1
INLINE_LIMIT = 512 * 1024


async def wrap(topic: str, data: dict, contract: Contract, store: ObjectStore, prefix: str) -> dict:
    """Validates `data` for `topic` and returns the envelope to send."""
    contract.validate_data(topic, data)
    message_id = str(uuid.uuid4())
    envelope: dict = {
        "type": topic,
        "version": VERSION,
        "id": message_id,
        "produced_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
    }
    body = json.dumps(data, separators=(",", ":")).encode()
    if len(body) > INLINE_LIMIT:
        key = f"{prefix}/compute/{message_id}.json"
        await store.put(key, body, "application/json")
        envelope["data_ref"] = {"bucket": store.bucket, "key": key, "size": len(body), "content_type": "application/json"}
    else:
        envelope["data"] = data
    return envelope


async def unwrap(topic: str, envelope: dict, contract: Contract, store: ObjectStore) -> dict:
    """Validates the envelope, resolves a data_ref, validates the payload."""
    contract.validate_envelope(envelope)
    if envelope["type"] != topic:
        raise ValueError(f"envelope type {envelope['type']} on topic {topic}")
    if "data_ref" in envelope:
        data = json.loads(await store.get(envelope["data_ref"]["key"]))
    else:
        data = envelope["data"]
    contract.validate_data(topic, data)
    return data

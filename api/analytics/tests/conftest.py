import json
import os
from pathlib import Path

import pytest

from contract import Contract
from storage import ObjectMissing

# In the image the schemas are copied to ./contract; in the repo they live
# in api/common/contract.
CONTRACT_DIR = Path(os.environ.get("CONTRACT_DIR", Path(__file__).resolve().parents[2] / "common" / "contract"))


class MemoryStore:
    bucket = "test-bucket"

    def __init__(self):
        self.objects: dict[str, bytes] = {}
        # Raised, one per get, before the object is returned.
        self.get_errors: list[Exception] = []

    async def get(self, key: str) -> bytes:
        if self.get_errors:
            raise self.get_errors.pop(0)
        if key not in self.objects:
            raise ObjectMissing(key)
        return self.objects[key]

    async def put(self, key: str, data: bytes, content_type: str) -> None:
        self.objects[key] = data


@pytest.fixture(scope="session")
def contract() -> Contract:
    return Contract(CONTRACT_DIR)


@pytest.fixture
def store() -> MemoryStore:
    return MemoryStore()


def example(name: str) -> dict:
    return json.loads((CONTRACT_DIR / "examples" / f"{name}.json").read_text(encoding="utf-8"))

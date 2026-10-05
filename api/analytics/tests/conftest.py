import json
import os
from pathlib import Path

import pytest

from contract import Contract

# In the image the schemas are copied to ./contract; in the repo they live
# in api/common/contract.
CONTRACT_DIR = Path(os.environ.get("CONTRACT_DIR", Path(__file__).resolve().parents[2] / "common" / "contract"))


class MemoryStore:
    bucket = "test-bucket"

    def __init__(self):
        self.objects: dict[str, bytes] = {}

    async def get(self, key: str) -> bytes:
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

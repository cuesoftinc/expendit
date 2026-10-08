import json
from pathlib import Path

from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from referencing import Registry, Resource

ENVELOPE = "envelope"


class ContractError(ValueError):
    """A message does not match its schema."""


class Contract:
    """Loads every *.schema.json in `directory` once and validates envelopes
    and topic payloads against them."""

    def __init__(self, directory: str | Path):
        directory = Path(directory)
        schemas = {
            p.name.removesuffix(".schema.json"): json.loads(p.read_text(encoding="utf-8"))
            for p in directory.glob("*.schema.json")
        }
        if ENVELOPE not in schemas:
            raise FileNotFoundError(f"no envelope.schema.json in {directory}")
        registry = Registry().with_resources(
            [(s["$id"], Resource.from_contents(s)) for s in schemas.values()]
        )
        self._validators = {
            name: Draft202012Validator(
                schema, registry=registry, format_checker=Draft202012Validator.FORMAT_CHECKER
            )
            for name, schema in schemas.items()
        }

    def validate_envelope(self, message: dict) -> None:
        self._validate(ENVELOPE, message)

    def validate_data(self, topic: str, data: dict) -> None:
        """`topic` is the full topic name, e.g. expendit.import.ready."""
        self._validate(topic.removeprefix("expendit."), data)

    def _validate(self, name: str, value: dict) -> None:
        validator = self._validators.get(name)
        if validator is None:
            raise ContractError(f"no schema named {name}")
        try:
            validator.validate(value)
        except ValidationError as exc:
            path = "/".join(str(p) for p in exc.absolute_path) or "(root)"
            raise ContractError(f"{name}: {path}: {exc.message}") from exc

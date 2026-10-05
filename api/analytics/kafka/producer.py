import json

from aiokafka import AIOKafkaProducer

from app.config import Settings
from contract import Contract
from kafka import envelope
from kafka.client import connection_kwargs
from storage import ObjectStore


class Producer:
    """Publishes validated envelopes. acks=all + idempotence so a result is
    never lost or doubled by a retry inside the client."""

    def __init__(self, settings: Settings, contract: Contract, store: ObjectStore):
        self._settings = settings
        self._contract = contract
        self._store = store
        self._producer = AIOKafkaProducer(
            acks="all",
            enable_idempotence=True,
            value_serializer=lambda v: json.dumps(v, separators=(",", ":")).encode(),
            key_serializer=lambda k: k.encode(),
            **connection_kwargs(settings),
        )

    async def start(self) -> None:
        await self._producer.start()

    async def stop(self) -> None:
        await self._producer.stop()

    async def send(self, topic: str, key: str, data: dict) -> None:
        message = await envelope.wrap(topic, data, self._contract, self._store, self._settings.storage_prefix)
        await self._producer.send_and_wait(topic, message, key=key)

"""One consumer group per worker pool. It subscribes to the topics its
events travel on and routes each message on the envelope's type. Offsets are
committed only after the handler finishes, so a crash mid-message redelivers
it (at-least-once); every handler is idempotent by key (system-design.md
§9.2)."""

import asyncio
import contextlib
import json
import logging
from collections.abc import Awaitable, Callable

from aiokafka import AIOKafkaConsumer

from app.config import Settings
from contract import Contract, ContractError
from kafka import envelope
from kafka.client import connection_kwargs
from kafka.topics import TOPIC_FOR
from storage import ObjectStore

log = logging.getLogger(__name__)

Handler = Callable[[dict], Awaitable[None]]


def _decode(value: bytes) -> object:
    """JSON, or None for anything else on the shared lanes."""
    try:
        return json.loads(value.decode())
    except (UnicodeDecodeError, ValueError):
        return None


class Consumer:
    """`handlers` maps each event this pool handles to its handler."""

    def __init__(
        self,
        group: str,
        handlers: dict[str, Handler],
        settings: Settings,
        contract: Contract,
        store: ObjectStore,
    ):
        self.group = group
        self._handlers = handlers
        self._topics = sorted({TOPIC_FOR[event] for event in handlers})
        self._contract = contract
        self._store = store
        self._consumer = AIOKafkaConsumer(
            *self._topics,
            group_id=f"{settings.kafka_group_prefix}-{group}",
            enable_auto_commit=False,
            auto_offset_reset="earliest",
            value_deserializer=_decode,
            **connection_kwargs(settings),
        )
        self._task: asyncio.Task | None = None
        self.running = False

    async def start(self) -> None:
        await self._consumer.start()
        self._task = asyncio.create_task(self._run(), name=f"consumer-{self.group}")
        self.running = True
        log.info("consumer started", extra={"group": self.group, "topics": self._topics})

    async def stop(self) -> None:
        self.running = False
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        await self._consumer.stop()

    async def _run(self) -> None:
        async for record in self._consumer:
            if envelope.event_of(record.value) not in self._handlers:
                # The lanes are shared: another product's event, or one
                # another pool handles. Skip it without a word.
                await self._consumer.commit()
                continue
            try:
                event, data = await envelope.unwrap(record.topic, record.value, self._contract, self._store)
                handler = self._handlers.get(event)
                if handler is None:
                    raise ValueError(f"no handler for {event}")
            except (ContractError, ValueError, KeyError):
                # A malformed message can never succeed; skip it rather than
                # block the partition. Never log the payload (never-log list).
                log.exception("dropping invalid message", extra={"topic": record.topic, "offset": record.offset})
            else:
                try:
                    await handler(data)
                except Exception:
                    # Handlers report domain failures as messages; reaching
                    # here means infrastructure (Kafka, storage) is down.
                    # Stop without committing so the message is redelivered,
                    # and fail /ready so the platform restarts the worker.
                    self.running = False
                    log.exception("handler failed; stopping consumer", extra={"topic": record.topic, "event": event})
                    raise
            await self._consumer.commit()

"""One consumer group per worker pool. Offsets are committed only after the
handler finishes, so a crash mid-message redelivers it (at-least-once); every
handler is idempotent by key (system-design.md §9.2)."""

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
from storage import ObjectStore

log = logging.getLogger(__name__)

Handler = Callable[[dict], Awaitable[None]]


class Consumer:
    """`group=None` makes a groupless reader that starts at offset 0 and never
    commits: every instance replays a compacted topic in full on start."""

    def __init__(
        self,
        group: str | None,
        handlers: dict[str, Handler],
        settings: Settings,
        contract: Contract,
        store: ObjectStore,
    ):
        self.group = group or "replay"
        self._commits = group is not None
        self._handlers = handlers
        self._contract = contract
        self._store = store
        self._consumer = AIOKafkaConsumer(
            *handlers,
            group_id=f"{settings.kafka_group_prefix}-{group}" if group else None,
            enable_auto_commit=False,
            auto_offset_reset="earliest",
            value_deserializer=lambda v: json.loads(v.decode()),
            **connection_kwargs(settings),
        )
        self._task: asyncio.Task | None = None
        self.running = False

    async def start(self) -> None:
        await self._consumer.start()
        self._task = asyncio.create_task(self._run(), name=f"consumer-{self.group}")
        self.running = True
        log.info("consumer started", extra={"group": self.group, "topics": list(self._handlers)})

    async def stop(self) -> None:
        self.running = False
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        await self._consumer.stop()

    async def _run(self) -> None:
        async for record in self._consumer:
            try:
                data = await envelope.unwrap(record.topic, record.value, self._contract, self._store)
            except (ContractError, ValueError, KeyError):
                # A malformed message can never succeed; skip it rather than
                # block the partition. Never log the payload (never-log list).
                log.exception("dropping invalid message", extra={"topic": record.topic, "offset": record.offset})
            else:
                try:
                    await self._handlers[record.topic](data)
                except Exception:
                    # Handlers report domain failures as messages; reaching
                    # here means infrastructure (Kafka, storage) is down.
                    # Stop without committing so the message is redelivered,
                    # and fail /ready so the platform restarts the worker.
                    self.running = False
                    log.exception("handler failed; stopping consumer", extra={"topic": record.topic})
                    raise
            if self._commits:
                await self._consumer.commit()

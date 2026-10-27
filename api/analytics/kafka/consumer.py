"""One consumer group per worker pool. It subscribes to the topics its
events travel on and routes each message on the envelope's type. Offsets are
committed after the handler finishes, so a crash mid-message redelivers it
(at-least-once); every handler is idempotent by key (system-design.md §9.2).
A message that keeps failing after a few attempts gets a failed result and
is committed: the lanes are shared, so it must never block a partition."""

import asyncio
import contextlib
import json
import logging
from collections.abc import Awaitable, Callable, Sequence

from aiokafka import AIOKafkaConsumer

from app.config import Settings
from contract import Contract, ContractError
from kafka import envelope
from kafka.client import connection_kwargs
from kafka.topics import TOPIC_FOR
from storage import ObjectMissing, ObjectStore

log = logging.getLogger(__name__)

Handler = Callable[[dict], Awaitable[None]]

# Three attempts per message.
BACKOFF: Sequence[float] = (1.0, 4.0)


def _decode(value: bytes) -> object:
    """JSON, or None for anything else on the shared lanes."""
    try:
        return json.loads(value.decode())
    except (UnicodeDecodeError, ValueError):
        return None


class Consumer:
    """`handlers` maps each event this pool handles to its handler;
    `failures` maps an event to the handler that sends its failed result
    once the event keeps failing."""

    def __init__(
        self,
        group: str,
        handlers: dict[str, Handler],
        settings: Settings,
        contract: Contract,
        store: ObjectStore,
        failures: dict[str, Handler] | None = None,
        backoff: Sequence[float] = BACKOFF,
    ):
        self.group = group
        self._handlers = handlers
        self._failures = failures or {}
        self._backoff = backoff
        self._topics = sorted({TOPIC_FOR[event] for event in handlers})
        self._contract = contract
        self._store = store
        self._prefix = settings.storage_prefix
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
            event = envelope.event_of(record.value)
            if event in self._handlers:
                await self.handle(record.topic, record.offset, record.value)
            # Another product's event, or one another pool handles, is
            # skipped without a word: the lanes are shared.
            await self._consumer.commit()

    async def handle(self, topic: str, offset: int, value: dict) -> None:
        """Handles one of this pool's messages; returns once it may be
        committed. Never log the payload (never-log list)."""
        event = value["type"]
        request_id = value.get("request_id")
        extra = {"topic": topic, "offset": offset, "event": event, "request_id": request_id}
        data: dict | None = None
        token = envelope.REQUEST_ID.set(request_id)
        try:
            for attempt in range(len(self._backoff) + 1):
                if attempt:
                    await asyncio.sleep(self._backoff[attempt - 1])
                try:
                    if data is None:
                        _, data = await envelope.unwrap(topic, value, self._contract, self._store, self._prefix)
                except (ContractError, ObjectMissing, ValueError, KeyError):
                    # Can never succeed; skip rather than block the partition.
                    log.exception("dropping invalid message", extra=extra)
                    return
                except Exception:  # noqa: BLE001 - storage may be briefly away
                    log.warning("could not read the payload; will retry", extra=extra | {"attempt": attempt + 1})
                    continue
                try:
                    await self._handlers[event](data)
                    return
                except Exception:  # noqa: BLE001 - retried, then a failed result
                    log.warning("handler failed; will retry", extra=extra | {"attempt": attempt + 1}, exc_info=True)
            log.error("message kept failing; sending a failed result and committing", extra=extra)
            fail = self._failures.get(event)
            if fail is not None and data is not None:
                try:
                    await fail(data)
                except Exception:  # noqa: BLE001 - the owner's re-send is the backstop
                    log.exception("could not send the failed result", extra=extra)
        finally:
            envelope.REQUEST_ID.reset(token)

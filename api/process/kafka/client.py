import asyncio
import contextlib
import json
import logging

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from aiokafka.helpers import create_ssl_context

from app.config import settings
from model.schemas import ProcessedMessage, ReadyForProcessingMessage
from service.pipeline import process_receipt

log = logging.getLogger(__name__)

TOPIC_READY = "expendit.receipts.ready"  # consumed: produced by api/common
TOPIC_PROCESSED = "expendit.receipts.processed"  # produced: consumed by api/common


def _security_kwargs() -> dict:
    if not settings.kafka_username:
        return {}
    return {
        "security_protocol": "SASL_SSL",
        "sasl_mechanism": "SCRAM-SHA-256",
        "sasl_plain_username": settings.kafka_username,
        "sasl_plain_password": settings.kafka_password,
        "ssl_context": create_ssl_context(cafile=settings.kafka_ssl_ca or None),
    }


class ReceiptProcessor:
    """Consumes raw receipts api/common hands off, runs the processing
    pipeline, and publishes the decided result back to api/common."""

    def __init__(self):
        self._consumer: AIOKafkaConsumer | None = None
        self._producer: AIOKafkaProducer | None = None
        self._task: asyncio.Task | None = None

    async def start(self):
        if not settings.kafka_brokers:
            log.warning("KAFKA_BROKERS not set, Kafka consumer disabled")
            return
        brokers = settings.kafka_brokers.split(",")
        self._consumer = AIOKafkaConsumer(
            TOPIC_READY,
            bootstrap_servers=brokers,
            group_id="expendit-api-process",
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            **_security_kwargs(),
        )
        self._producer = AIOKafkaProducer(
            bootstrap_servers=brokers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            **_security_kwargs(),
        )
        await self._consumer.start()
        await self._producer.start()
        self._task = asyncio.create_task(self._consume_loop())
        log.info("Kafka consumer started on topic %s", TOPIC_READY)

    async def stop(self):
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        if self._consumer:
            await self._consumer.stop()
        if self._producer:
            await self._producer.stop()

    async def _consume_loop(self):
        assert self._consumer is not None and self._producer is not None
        async for record in self._consumer:
            try:
                msg = ReadyForProcessingMessage.model_validate(record.value)
            except Exception:  # noqa: BLE001 - a malformed message must not kill the consumer
                log.exception("received malformed message on %s, skipping", TOPIC_READY)
                continue

            try:
                result = await process_receipt(msg)
            except Exception as exc:  # noqa: BLE001 - report failure, keep consuming
                log.exception("processing job %s failed", msg.job_id)
                result = ProcessedMessage(job_id=msg.job_id, user_id=msg.user_id, status="failed", error=str(exc))

            await self._producer.send_and_wait(TOPIC_PROCESSED, result.model_dump())
            log.info("job %s -> %s (%d transactions)", msg.job_id, result.status, len(result.transactions))

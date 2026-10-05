"""api/analytics: every processing decision (system-design.md §4).

No public ingress. HTTP serves only /health and /ready for the platform;
the work arrives over Kafka. ANALYTICS_POOL picks the worker pool: extract
(parsing, AI) or compute (ratios, tax, validation), or both in one process
for compose and Helm (D8).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from compute.handler import ComputeHandler
from compute.tax.rulesets import RulesetBook
from contract import Contract
from extract.ai.enhancer import AIEnhancer
from extract.mapping.pipeline import StatementPipeline
from extract.pipeline import ImportPipeline
from health import router as health_router
from kafka import topics
from kafka.consumer import Consumer
from kafka.producer import Producer
from storage import from_settings
from telemetry import configure as configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)

    contract = Contract(settings.contract_dir)
    store = from_settings(settings)
    producer = Producer(settings, contract, store)
    ai = AIEnhancer.from_settings(settings)
    consumers: list[Consumer] = []

    if settings.runs_extract:
        imports = ImportPipeline(store, ai)
        statements = StatementPipeline(store)

        async def on_import_ready(msg: dict) -> None:
            await producer.send(topics.IMPORT_PROCESSED, msg["job_id"], await imports.run(msg))

        async def on_statement_ready(msg: dict) -> None:
            await producer.send(topics.STATEMENT_MAPPED, msg["statement_id"], await statements.run(msg))

        consumers.append(
            Consumer(
                "extract",
                {topics.IMPORT_READY: on_import_ready, topics.STATEMENT_READY: on_statement_ready},
                settings,
                contract,
                store,
            )
        )

    if settings.runs_compute:
        compute = ComputeHandler(RulesetBook(), ai)

        async def on_ruleset(msg: dict) -> None:
            compute.rulesets.apply(msg)

        async def on_compute_requested(msg: dict) -> None:
            await producer.send(topics.COMPUTE_RESULTS, msg["org_id"], await compute.run(msg))

        consumers.append(Consumer(None, {topics.CONFIG_RULESETS: on_ruleset}, settings, contract, store))
        consumers.append(
            Consumer("compute", {topics.COMPUTE_REQUESTED: on_compute_requested}, settings, contract, store)
        )

    await producer.start()
    for consumer in consumers:
        await consumer.start()
    app.state.consumers = consumers
    try:
        yield
    finally:
        for consumer in consumers:
            await consumer.stop()
        await producer.stop()
        if ai is not None:
            await ai.aclose()


app = FastAPI(title="expendit-api-analytics", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(health_router)

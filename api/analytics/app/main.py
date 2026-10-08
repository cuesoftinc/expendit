"""api/analytics: every processing decision (system-design.md §4).

No public ingress. HTTP serves only /health and /ready for the platform;
the work arrives over Kafka. ANALYTICS_POOL picks the worker pool: extract
(parsing, AI) or compute (ratios, tax, validation), or both in one process
for compose and Helm (D8).
"""

import logging
import time
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

log = logging.getLogger("analytics")


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
            start = time.monotonic()
            log.info("import received", extra={"step": "import.ready", "job_id": msg["job_id"], "org_id": msg["org_id"],
                                               "source": msg["source"], "file_type": msg.get("file_type"), "ai_allowed": msg["ai_allowed"]})
            result = await imports.run(msg)
            await producer.send(topics.IMPORT_PROCESSED, msg["job_id"], result)
            log.info("import processed; result sent", extra={
                "step": "import.processed", "job_id": msg["job_id"], "status": result["status"],
                "error_code": result.get("error_code"), "parsed": result.get("total_parsed", 0),
                "duplicates": result.get("duplicates_found", 0), "anomalies": len(result.get("anomalies", [])),
                "ms": round((time.monotonic() - start) * 1000)})

        async def on_statement_ready(msg: dict) -> None:
            start = time.monotonic()
            log.info("statement received", extra={"step": "statement.ready", "statement_id": msg["statement_id"],
                                                  "org_id": msg["org_id"], "kind": msg["kind"], "file_type": msg["file_type"]})
            result = await statements.run(msg)
            await producer.send(topics.STATEMENT_MAPPED, msg["statement_id"], result)
            log.info("statement mapped; result sent", extra={
                "step": "statement.mapped", "statement_id": msg["statement_id"], "status": result["status"],
                "error_code": result.get("error_code"), "line_items": len(result.get("line_items", [])),
                "ms": round((time.monotonic() - start) * 1000)})

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
            log.info("rule set loaded", extra={"step": "config.rulesets", "ruleset_id": msg["ruleset_id"],
                                               "signed_off": msg["signed_off"]})

        async def on_compute_requested(msg: dict) -> None:
            start = time.monotonic()
            log.info("computation received", extra={"step": "compute.requested", "kind": msg["kind"],
                                                    "org_id": msg["org_id"], "request_id": msg["request_id"]})
            result = await compute.run(msg)
            await producer.send(topics.COMPUTE_RESULTS, msg["org_id"], result)
            log.info("computation done; result sent", extra={
                "step": "compute.results", "kind": msg["kind"], "request_id": msg["request_id"], "status": result["status"],
                "error_code": result.get("error_code"), "ms": round((time.monotonic() - start) * 1000)})

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

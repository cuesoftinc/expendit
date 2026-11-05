"""POST /internal/settle: handle everything waiting for this pool, then answer.

Cloud Run bills this service per request, so an instance has CPU only while it
serves one. api/common calls settle after it publishes for the pool, and its
reaper calls it every 5 minutes. One settle waits, within its budget, until
every consumer has committed what is on its topics, so the work (and the
results it sends) happens while the instance has CPU.

Callers are checked here as well as by Cloud Run IAM: a Google ID token for
INTERNAL_AUDIENCE from one of INTERNAL_INVOKERS. With neither configured every
call is refused.
"""

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)

BUDGET_SECONDS = 25.0


def verify_google_token(token: str, audience: str) -> dict:
    import google.auth.transport.requests
    import google.oauth2.id_token

    return google.oauth2.id_token.verify_oauth2_token(token, google.auth.transport.requests.Request(), audience)


async def settle_pass(budget: float, drain: Callable[[float], Awaitable[bool]]) -> dict:
    """drain(seconds) answers whether every consumer is caught up."""
    errors = 0
    try:
        caught_up = await asyncio.wait_for(drain(budget), budget)
    except Exception as exc:  # noqa: BLE001 - a slow or failing drain costs only itself
        errors += 1
        caught_up = False
        log.warning("settle drain failed", extra={"error": type(exc).__name__})
    return {"caught_up": bool(caught_up), "errors": errors}


def drain_all(consumers: list) -> Callable[[float], Awaitable[bool]]:
    async def drain(seconds: float) -> bool:
        results = await asyncio.gather(*(c.wait_caught_up(seconds) for c in consumers))
        return all(results)

    return drain


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse({"error": {"code": code, "message": message, "details": {}}}, status_code=status)


def router(
    run: Callable[[float], Awaitable[dict]],
    audience: str = "",
    invokers: list[str] | tuple[str, ...] = (),
    verify=verify_google_token,
) -> APIRouter:
    r = APIRouter()

    async def caller_ok(request: Request) -> bool:
        scheme, _, bearer = request.headers.get("authorization", "").partition(" ")
        if scheme.lower() != "bearer" or not bearer.strip():
            return False
        try:
            claims = await asyncio.to_thread(verify, bearer.strip(), audience.rstrip("/"))
        except Exception:  # noqa: BLE001 - any failure to verify is a refusal
            log.warning("settle token rejected")
            return False
        return bool(claims.get("email_verified")) and claims.get("email") in invokers

    @r.post("/internal/settle")
    async def settle(request: Request):
        if not audience or not invokers:
            log.error("settle auth not configured")
            return _error(503, "unavailable", "Internal auth is not configured")
        if not await caller_ok(request):
            return _error(401, "unauthorized", "internal callers only")
        started = time.monotonic()
        try:
            out = await run(BUDGET_SECONDS)
        except Exception:  # noqa: BLE001 - the caller only needs to know it failed
            log.exception("settle failed")
            return _error(500, "internal", "Something went wrong")
        return {**out, "ms": int((time.monotonic() - started) * 1000)}

    return r

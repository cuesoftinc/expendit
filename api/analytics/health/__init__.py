"""/health (process up) and /ready (every consumer for this pool running)."""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "healthy"}


@router.get("/ready")
def ready(request: Request) -> JSONResponse:
    consumers = getattr(request.app.state, "consumers", [])
    if consumers and all(c.running for c in consumers):
        return JSONResponse({"status": "ready"})
    return JSONResponse({"status": "not_ready"}, status_code=503)

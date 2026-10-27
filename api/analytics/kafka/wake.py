"""Wakes api/common after a result is sent for it (system-design.md §16 I-16).

common scales to zero in cloud, and Cloud Run starts an instance only for an
HTTP request, so a GET /health brings it up; its consumers then read the
result in the background. Best-effort: a missed wake leaves the message in
Kafka, and the reaper job wakes common while work is pending. common's URL
is public, so no token is needed.
"""

import asyncio
import logging
import time
from urllib.parse import urlparse

import httpx

log = logging.getLogger(__name__)

# An instance that answered moments ago is still up.
DEBOUNCE_SECONDS = 10.0


class Waker:
    def __init__(self, base_url: str, client: httpx.AsyncClient | None = None):
        self._base = base_url.rstrip("/")
        self._client = client or httpx.AsyncClient(timeout=30.0)
        self._last = 0.0
        self._tasks: set[asyncio.Task] = set()

    def soon(self, reason: str) -> None:
        """Wakes common in the background. No URL (compose, Helm): nothing to do."""
        if not self._base or time.monotonic() - self._last < DEBOUNCE_SECONDS:
            return
        self._last = time.monotonic()
        task = asyncio.create_task(self.now(reason))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def now(self, reason: str) -> bool:
        target = urlparse(self._base).netloc or self._base
        try:
            response = await self._client.get(f"{self._base}/health")
            response.raise_for_status()
        except httpx.HTTPError as exc:
            self._last = 0.0  # a failed wake must not hold back the next one
            log.warning("wake failed", extra={"step": "wake", "target": target, "reason": reason, "error": type(exc).__name__})
            return False
        log.info("woke service", extra={"step": "wake", "target": target, "reason": reason})
        return True

    async def aclose(self) -> None:
        for task in list(self._tasks):
            task.cancel()
        await self._client.aclose()

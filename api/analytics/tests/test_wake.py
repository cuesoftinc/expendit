import asyncio

import httpx

from kafka.wake import Waker


def _client(hits: list[str], status: int = 200) -> httpx.AsyncClient:
    def handle(request: httpx.Request) -> httpx.Response:
        hits.append(request.url.path)
        return httpx.Response(status)

    return httpx.AsyncClient(transport=httpx.MockTransport(handle))


async def test_soon_calls_health_once_within_the_debounce():
    hits: list[str] = []
    waker = Waker("http://common:8080/", _client(hits))
    for _ in range(3):
        waker.soon("test")
    await asyncio.sleep(0.05)
    assert hits == ["/health"]
    await waker.aclose()


async def test_no_url_means_nothing_to_wake():
    hits: list[str] = []
    waker = Waker("", _client(hits))
    waker.soon("test")
    await asyncio.sleep(0.01)
    assert hits == []
    await waker.aclose()


async def test_failed_wake_is_retried_next_time():
    hits: list[str] = []
    waker = Waker("http://common:8080", _client(hits, status=503))
    assert await waker.now("test") is False
    waker.soon("test")
    await asyncio.sleep(0.05)
    assert hits == ["/health", "/health"]
    await waker.aclose()

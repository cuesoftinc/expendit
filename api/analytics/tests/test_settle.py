"""POST /internal/settle, its budget, and the consumer's caught-up check."""

import asyncio
from types import SimpleNamespace

import pytest
from aiokafka import TopicPartition
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.settle import BUDGET_SECONDS, drain_all, router, settle_pass
from kafka import topics
from kafka.consumer import Consumer

COMMON = "common@p.iam.gserviceaccount.com"
AUDIENCE = "https://analytics.example/"


def app_with(run, audience=AUDIENCE, invokers=(COMMON,), verify=None):
    app = FastAPI()
    kwargs = {"verify": verify} if verify else {}
    app.include_router(router(run, audience, list(invokers), **kwargs))
    return app


def good(token, audience):
    if token != "good":
        raise ValueError("bad token")
    return {"email_verified": True, "email": COMMON}


async def caught_up_run(budget):
    return {"caught_up": True, "errors": 0}


def test_settle_runs_for_the_invoking_service_account_and_reports():
    seen = []

    async def run(budget):
        seen.append(budget)
        return {"caught_up": True, "errors": 0}

    response = TestClient(app_with(run, verify=good)).post("/internal/settle", headers={"Authorization": "Bearer good"})
    assert response.status_code == 200
    assert response.json()["caught_up"] is True
    assert seen == [BUDGET_SECONDS]


def test_settle_verifies_the_token_against_the_services_own_url():
    audiences = []

    def verify(token, audience):
        audiences.append(audience)
        return good(token, audience)

    TestClient(app_with(caught_up_run, verify=verify)).post("/internal/settle", headers={"Authorization": "Bearer good"})
    assert audiences == ["https://analytics.example"]


def test_settle_refuses_callers_that_are_not_the_invoker():
    def stranger(token, audience):
        return {"email_verified": True, "email": "someone@else.iam.gserviceaccount.com"}

    def unverified(token, audience):
        return {"email_verified": False, "email": COMMON}

    client = TestClient(app_with(caught_up_run, verify=good))
    assert client.post("/internal/settle").status_code == 401
    assert client.post("/internal/settle", headers={"Authorization": "Basic good"}).status_code == 401
    assert client.post("/internal/settle", headers={"Authorization": "Bearer forged"}).status_code == 401
    for verify in (stranger, unverified):
        client = TestClient(app_with(caught_up_run, verify=verify))
        assert client.post("/internal/settle", headers={"Authorization": "Bearer good"}).status_code == 401


@pytest.mark.parametrize("audience,invokers", [("", [COMMON]), (AUDIENCE, []), ("", [])])
def test_settle_is_refused_when_auth_is_not_configured(audience, invokers):
    client = TestClient(app_with(caught_up_run, audience=audience, invokers=invokers, verify=good))
    assert client.post("/internal/settle", headers={"Authorization": "Bearer good"}).status_code == 503


def test_settle_failure_is_a_500():
    async def run(budget):
        raise RuntimeError("boom")

    assert TestClient(app_with(run, verify=good)).post("/internal/settle", headers={"Authorization": "Bearer good"}).status_code == 500


async def test_settle_pass_reports_whether_the_consumers_caught_up():
    async def behind(seconds):
        return False

    async def ahead(seconds):
        return True

    assert await settle_pass(1.0, ahead) == {"caught_up": True, "errors": 0}
    assert await settle_pass(1.0, behind) == {"caught_up": False, "errors": 0}


async def test_settle_pass_stops_at_its_budget_and_survives_a_failing_drain():
    async def stuck(seconds):
        await asyncio.sleep(10)
        return True

    async def broken(seconds):
        raise RuntimeError("broker away")

    assert await settle_pass(0.05, stuck) == {"caught_up": False, "errors": 1}
    assert await settle_pass(1.0, broken) == {"caught_up": False, "errors": 1}


async def test_drain_waits_for_every_consumer():
    class Lagging:
        def __init__(self, ok):
            self.ok, self.budgets = ok, []

        async def wait_caught_up(self, seconds):
            self.budgets.append(seconds)
            return self.ok

    a, b = Lagging(True), Lagging(False)
    assert await drain_all([a, b])(3.0) is False
    assert a.budgets == [3.0] and b.budgets == [3.0]
    assert await drain_all([Lagging(True), Lagging(True)])(1.0) is True


# ── the consumer ────────────────────────────────────────────────────────


class FakeKafka:
    """The slice of AIOKafkaConsumer the settle check and the loop use."""

    def __init__(self, ends, firsts=None, commits=None, partitions=None):
        self.ends = ends
        self.firsts = firsts or {tp: 0 for tp in ends}
        self.commits = commits or {}
        self.partitions = partitions

    def partitions_for_topic(self, topic):
        if self.partitions is not None:
            return self.partitions
        return {tp.partition for tp in self.ends if tp.topic == topic}

    async def end_offsets(self, tps):
        return {tp: self.ends[tp] for tp in tps}

    async def beginning_offsets(self, tps):
        return {tp: self.firsts[tp] for tp in tps}

    async def committed(self, tp):
        return self.commits.get(tp)


def consumer_over(fake):
    settings = SimpleNamespace(
        kafka_group_prefix="expendit-analytics", storage_prefix="expendit/test", kafka_broker_list=["unused:9092"], kafka_username=""
    )
    consumer = Consumer("compute", {topics.COMPUTE_REQUESTED: None}, settings, contract=None, store=None, backoff=())
    consumer._consumer = fake
    return consumer


TP = TopicPartition(topics.TOPIC_REQUESTS, 0)


async def test_caught_up_compares_commits_with_the_end_of_every_partition():
    assert await consumer_over(FakeKafka({TP: 3}, commits={TP: 3})).caught_up() is True
    assert await consumer_over(FakeKafka({TP: 3}, commits={TP: 2})).caught_up() is False
    assert await consumer_over(FakeKafka({TP: 2})).caught_up() is False  # never committed: starts at the first offset
    assert await consumer_over(FakeKafka({TP: 0})).caught_up() is True  # never committed, nothing on the topic
    assert await consumer_over(FakeKafka({TP: 9}, firsts={TP: 9})).caught_up() is True  # old messages trimmed


async def test_caught_up_is_false_while_the_group_is_still_joining():
    assert await consumer_over(FakeKafka({TP: 0}, partitions=set())).caught_up() is False


async def test_wait_caught_up_returns_once_the_group_catches_up():
    fake = FakeKafka({TP: 2}, commits={TP: 0})
    consumer = consumer_over(fake)

    async def catch_up():
        await asyncio.sleep(0.05)
        fake.commits[TP] = 2

    task = asyncio.create_task(catch_up())
    assert await consumer.wait_caught_up(5.0) is True
    await task


async def test_wait_caught_up_gives_up_at_the_budget():
    assert await consumer_over(FakeKafka({TP: 2}, commits={TP: 0})).wait_caught_up(0.3) is False


async def test_wait_caught_up_treats_a_failing_check_as_not_yet():
    fake = FakeKafka({TP: 2})

    async def broken(tps):
        raise RuntimeError("broker away")

    fake.end_offsets = broken
    assert await consumer_over(fake).wait_caught_up(0.3) is False


class Scripted:
    """An aiokafka consumer whose iteration fails once, then yields a record."""

    def __init__(self):
        self.rounds = 0
        self.commits = 0

    async def __aiter__(self):
        self.rounds += 1
        if self.rounds == 1:
            raise RuntimeError("rebalance")
        yield SimpleNamespace(topic=topics.TOPIC_REQUESTS, offset=1, value={"type": "someone.else.event"})

    async def commit(self):
        self.commits += 1


async def test_the_loop_resumes_after_the_consumer_itself_fails(monkeypatch):
    monkeypatch.setattr("kafka.consumer.RESUME_SECONDS", 0.0)
    fake = Scripted()
    await consumer_over(fake)._run()
    assert fake.rounds == 2 and fake.commits == 1

import copy
import json
from datetime import date, datetime

import pytest

from extract.ai import enhancer as enhancer_module
from extract.ai.enhancer import AIEnhancer, PdfExtraction, _split_text_into_chunks
from extract.dedup.detector import DuplicateDetector, LedgerRow
from extract.parse.raw_transaction import RawTransaction
from extract.pipeline import ImportPipeline
from kafka import topics
from tests.conftest import example

LINE = "2026-09-0{day} POS PURCHASE SHOPRITE LEKKI {amount}.00 DR\n"


def pdf_text(chunks: int) -> str:
    # One full-size chunk of filler per part so the splitter yields `chunks`.
    return "".join(("x" * (enhancer_module._PDF_CHUNK_SIZE - 1) + "\n") for _ in range(chunks))


def rows_json(*rows: tuple[str, int, str, str]) -> str:
    return json.dumps([{"date": d, "amount": a, "description": desc, "type": t} for d, a, desc, t in rows])


class ScriptedEnhancer(AIEnhancer):
    """Replays one scripted reply per _generate call; an Exception is raised."""

    def __init__(self, replies):
        super().__init__("groq", api_key="test")
        self.replies = list(replies)
        self.calls = 0

    async def _generate(self, prompt: str) -> str:
        self.calls += 1
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    async def instant(_):
        return None

    monkeypatch.setattr(enhancer_module.asyncio, "sleep", instant)


def test_fixture_splits_into_the_requested_chunk_count():
    assert len(_split_text_into_chunks(pdf_text(3), enhancer_module._PDF_CHUNK_SIZE)) == 3


async def test_failed_chunk_is_counted_not_skipped():
    fail = RuntimeError("no available Groq model")
    ai = ScriptedEnhancer(
        [
            rows_json(("2026-09-01", 100, "A", "expense")),
            fail,
            fail,  # retry of chunk 2 fails too
            rows_json(("2026-09-03", 300, "C", "expense")),
        ]
    )
    out = await ai.extract_transactions(pdf_text(3))
    assert (out.chunks_total, out.chunks_failed) == (3, 1)
    assert [t.description for t in out.transactions] == ["A", "C"]


async def test_retried_chunk_is_booked_once_and_not_failed():
    ai = ScriptedEnhancer(
        [
            rows_json(("2026-09-01", 100, "A", "expense")),
            json.JSONDecodeError("bad", "", 0),  # chunk 2 first attempt: malformed JSON
            rows_json(("2026-09-02", 200, "B", "expense")),  # chunk 2 retry
            rows_json(("2026-09-03", 300, "C", "expense")),
        ]
    )
    out = await ai.extract_transactions(pdf_text(3))
    assert out.chunks_failed == 0
    assert [t.description for t in out.transactions] == ["A", "B", "C"]
    assert ai.calls == 4  # only the failed chunk is asked again


async def test_identical_same_day_rows_both_survive_extraction():
    same = ("2026-09-02", 4500, "CHICKEN REPUBLIC IKEJA", "expense")
    ai = ScriptedEnhancer([rows_json(same, same)])
    out = await ai.extract_transactions("short statement text")
    assert len(out.transactions) == 2

    ai = ScriptedEnhancer([rows_json(same)] * 2 + [rows_json(same)])
    out = await ai.extract_transactions(pdf_text(2))
    assert len(out.transactions) == 2  # one per chunk, none merged


async def test_image_rows_are_not_collapsed():
    same = ("2026-09-02", 4500, "CHICKEN REPUBLIC IKEJA", "expense")
    ai = ScriptedEnhancer([])

    async def vision(*_):
        return rows_json(same, same)

    ai._generate_groq_vision = vision
    assert len(await ai.extract_transactions_from_image(b"img", "image/png")) == 2


def test_detector_keeps_debit_and_credit_of_same_value_apart():
    detector = DuplicateDetector([])
    day = LedgerRow(date(2026, 9, 2), 5000, "TRANSFER", "expense")
    assert not detector.check(day)
    assert not detector.check(LedgerRow(day.txn_date, 5000, "TRANSFER", "income"))
    assert detector.check(LedgerRow(day.txn_date, 5000, "TRANSFER", "expense"))


class FakePdfAI:
    def __init__(self, extraction=None, error=None):
        self.extraction, self.error = extraction, error

    async def extract_transactions(self, text):
        if self.error:
            raise self.error
        return self.extraction


def pdf_msg(store, **overrides) -> dict:
    msg = copy.deepcopy(example("import.ready")["data"])
    store.objects[msg["file"]["key"]] = b"%PDF"
    return msg | {"file_type": "pdf", "file_name": "s.pdf", "ai_allowed": True} | overrides


@pytest.fixture
def pdf_text_patch(monkeypatch):
    from extract import pipeline

    monkeypatch.setattr(pipeline, "is_encrypted", lambda data: False)
    monkeypatch.setattr(pipeline, "extract_pdf_text", lambda data: "t" * 200)
    monkeypatch.setattr(pipeline, "trim_pdf_text", lambda text, n: text)
    monkeypatch.setattr(pipeline, "parse_pdf", lambda data: (_ for _ in ()).throw(ValueError("no rows")))


def raw(day: int, amount: float, desc: str, typ: str = "expense"):
    return RawTransaction(datetime(2026, 9, day), amount, desc, typ)


async def test_three_part_statement_with_one_failed_part_cannot_come_out_complete(contract, store, pdf_text_patch):
    extraction = PdfExtraction([raw(1, 100, "ALPHA SHOP"), raw(3, 300, "GAMMA SHOP")], chunks_total=3, chunks_failed=1)
    result = await ImportPipeline(store, ai=FakePdfAI(extraction)).run(pdf_msg(store))
    contract.validate_data(topics.IMPORT_PROCESSED, result)

    assert result["warnings"] and "1 of 3 parts" in result["warnings"][0]
    assert "could not be read" in result["warnings"][0]


async def test_complete_extraction_has_no_incomplete_warning(contract, store, pdf_text_patch):
    extraction = PdfExtraction([raw(1, 100, "ALPHA SHOP")], chunks_total=3, chunks_failed=0)
    result = await ImportPipeline(store, ai=FakePdfAI(extraction)).run(pdf_msg(store))
    assert result["warnings"] == []


async def test_two_same_day_same_value_purchases_both_reach_review(contract, store, pdf_text_patch):
    extraction = PdfExtraction([raw(2, 4500, "CHICKEN REPUBLIC IKEJA"), raw(2, 4500, "CHICKEN REPUBLIC IKEJA")], chunks_total=1, chunks_failed=0)
    msg = pdf_msg(store)
    msg["reference"]["ledger"] = []
    result = await ImportPipeline(store, ai=FakePdfAI(extraction)).run(msg)
    contract.validate_data(topics.IMPORT_PROCESSED, result)

    assert result["total_parsed"] == 2 and len(result["transactions"]) == 2
    # The second is flagged for review (re-includable), never dropped.
    assert [r["is_duplicate"] for r in result["transactions"]] == [False, True]


async def test_ai_failure_for_every_part_warns_when_basic_parser_takes_over(contract, store, monkeypatch, pdf_text_patch):
    from extract import pipeline

    monkeypatch.setattr(pipeline, "parse_pdf", lambda data: [raw(1, 100, "ALPHA SHOP")])
    extraction = PdfExtraction([], chunks_total=2, chunks_failed=2)
    result = await ImportPipeline(store, ai=FakePdfAI(extraction)).run(pdf_msg(store))
    contract.validate_data(topics.IMPORT_PROCESSED, result)
    assert result["warnings"] and "basic parser" in result["warnings"][0]


async def test_gemini_payloads_carry_an_output_ceiling():
    sent: list[dict] = []

    class Resp:
        status_code = 200

        def json(self):
            return {"candidates": [{"content": {"parts": [{"text": "[]"}]}}]}

    class Client:
        async def post(self, url, json=None, headers=None):
            sent.append(json)
            return Resp()

    ai = AIEnhancer("gemini", api_key="k")
    ai._client = Client()
    await ai._generate("p")
    await ai.generate_text("p")
    await ai._generate_gemini_vision(b"x", "image/png", "p")
    ceilings = [p["generationConfig"]["maxOutputTokens"] for p in sent]
    assert len(ceilings) == 3 and all(isinstance(c, int) and 0 < c <= 16384 for c in ceilings)
    assert ceilings[1] < ceilings[0]  # summaries stay shorter than extraction, as on the Groq path
    assert ceilings[0] == ceilings[2]

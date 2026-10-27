"""LLM calls for extraction, categorization and narratives.

Providers (X-4): Vertex AI via Application Default Credentials in cloud (no
vendor keys); Groq or Gemini API keys for self-host. Only called when the
message says ai_allowed (E-3). Never log prompts or responses: they carry
user financial data (engineering.md §5).
"""
import asyncio
import base64
import json
import re
from dataclasses import dataclass

import google.auth
import google.auth.transport.requests
import httpx

from app.config import Settings
from extract.parse.raw_transaction import RawTransaction

GROQ_MODELS = [
    "llama-3.3-70b-versatile",  # 12k TPM, best quality
    "llama-3.1-8b-instant",  # 20k TPM, higher limit, good fallback
    "gemma2-9b-it",  # separate quota pool
]
GROQ_VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
]
VERTEX_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"]
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"]
GEMINI_VISION_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest"]

_PDF_CHUNK_SIZE = 10_000  # chars per chunk, keeps requests under Groq's TPM limit
_CATEGORIZE_CHUNK_SIZE = 50

_IMAGE_TRANSACTION_PROMPT = (
    "Extract all financial transactions from this bank statement image.\n"
    "Return a JSON array where each item has:\n"
    '- "date": YYYY-MM-DD\n'
    '- "description": transaction description/narration\n'
    '- "amount": positive number, no currency symbols\n'
    '- "type": "income" or "expense"\n\n'
    "Skip headers, totals, account summary rows, and opening/closing balances. Only actual transaction rows.\n"
    "If you cannot find any transactions return an empty array []."
)


@dataclass
class TransactionInput:
    description: str
    type: str


class AIEnhancer:
    """Calls the configured provider. Priority: Vertex (GOOGLE_CLOUD_PROJECT)
    -> Groq (GROQ_API_KEY) -> Gemini (GEMINI_API_KEY)."""

    def __init__(self, provider: str, api_key: str = "", project: str = "", location: str = ""):
        self.provider = provider
        self.api_key = api_key
        self._project = project
        self._location = location
        self._credentials = None
        self._client = httpx.AsyncClient(timeout=60.0)

    @classmethod
    def from_settings(cls, settings: Settings) -> "AIEnhancer | None":
        if settings.google_cloud_project:
            return cls("vertex", project=settings.google_cloud_project, location=settings.vertex_location)
        if settings.groq_api_key:
            return cls("groq", api_key=settings.groq_api_key)
        if settings.gemini_api_key:
            return cls("gemini", api_key=settings.gemini_api_key)
        return None

    async def _gemini_target(self, model: str, beta: bool = False) -> tuple[str, dict]:
        """URL and headers for a generateContent call: Vertex (ADC bearer
        token) or the Gemini API (key)."""
        if self.provider == "vertex":
            if self._credentials is None:
                self._credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
            if not self._credentials.valid:
                await asyncio.to_thread(self._credentials.refresh, google.auth.transport.requests.Request())
            url = (
                f"https://{self._location}-aiplatform.googleapis.com/v1/projects/{self._project}"
                f"/locations/{self._location}/publishers/google/models/{model}:generateContent"
            )
            return url, {"Authorization": f"Bearer {self._credentials.token}"}
        version = "v1beta" if beta else "v1"
        return (
            f"https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent",
            {"x-goog-api-key": self.api_key},
        )

    async def aclose(self):
        await self._client.aclose()

    # -- shared -------------------------------------------------------------

    async def generate_text(self, prompt: str) -> str:
        """Short-summary variant (lower max_tokens)."""
        if self.provider == "groq":
            return await self._generate_groq(prompt, max_tokens=512)
        return await self._generate_gemini(prompt)

    async def _generate(self, prompt: str) -> str:
        if self.provider == "groq":
            return await self._generate_groq(prompt, max_tokens=4096)
        return await self._generate_gemini(prompt)

    # -- Groq (OpenAI-compatible) --------------------------------------------

    async def _generate_groq(self, prompt: str, max_tokens: int) -> str:
        for model in GROQ_MODELS:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": max_tokens,
            }
            try:
                resp = await self._client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
            except httpx.HTTPError:
                continue
            if resp.status_code in (404, 429, 413):
                continue
            if resp.status_code != 200:
                raise RuntimeError(f"Groq API returned {resp.status_code}")
            data = resp.json()
            choices = data.get("choices") or []
            if not choices:
                raise RuntimeError("empty Groq response")
            return choices[0]["message"]["content"]
        raise RuntimeError("no available Groq model")

    async def _generate_groq_vision(self, image_data: bytes, mime_type: str, prompt: str) -> str:
        data_url = f"data:{mime_type};base64,{base64.b64encode(image_data).decode()}"
        for model in GROQ_VISION_MODELS:
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": data_url}},
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
                "temperature": 0.1,
                "max_tokens": 4096,
            }
            try:
                resp = await self._client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
            except httpx.HTTPError:
                continue
            if resp.status_code in (404, 429, 413):
                continue
            if resp.status_code != 200:
                raise RuntimeError(f"Groq vision API returned {resp.status_code}")
            data = resp.json()
            choices = data.get("choices") or []
            if not choices:
                raise RuntimeError("empty Groq vision response")
            return choices[0]["message"]["content"]
        raise RuntimeError("no available Groq vision model")

    # -- Gemini (REST) --------------------------------------------------------

    async def _generate_gemini(self, prompt: str) -> str:
        payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.1}}
        for model in VERTEX_MODELS if self.provider == "vertex" else GEMINI_MODELS:
            url, headers = await self._gemini_target(model)
            try:
                resp = await self._client.post(url, json=payload, headers=headers)
            except httpx.HTTPError:
                continue
            if resp.status_code in (404, 429):
                continue
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini API returned {resp.status_code}")
            data = resp.json()
            candidates = data.get("candidates") or []
            if not candidates or not candidates[0].get("content", {}).get("parts"):
                raise RuntimeError("empty Gemini response")
            return candidates[0]["content"]["parts"][0]["text"]
        raise RuntimeError("no available Gemini model")

    async def _generate_gemini_vision(self, image_data: bytes, mime_type: str, prompt: str) -> str:
        b64 = base64.b64encode(image_data).decode()
        payload = {
            "contents": [
                {"parts": [{"inlineData": {"mimeType": mime_type, "data": b64}}, {"text": prompt}]}
            ],
            "generationConfig": {"temperature": 0.1},
        }
        for model in VERTEX_MODELS if self.provider == "vertex" else GEMINI_VISION_MODELS:
            url, headers = await self._gemini_target(model, beta=True)
            try:
                resp = await self._client.post(url, json=payload, headers=headers)
            except httpx.HTTPError:
                continue
            if resp.status_code in (404, 429):
                continue
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini vision API returned {resp.status_code}")
            data = resp.json()
            candidates = data.get("candidates") or []
            if not candidates or not candidates[0].get("content", {}).get("parts"):
                raise RuntimeError("empty Gemini vision response")
            return candidates[0]["content"]["parts"][0]["text"]
        raise RuntimeError("no available Gemini vision model")

    # -- shared vision --------------------------------------------------------

    async def extract_transactions_from_image(self, image_data: bytes, mime_type: str) -> list[RawTransaction]:
        text = (
            await self._generate_groq_vision(image_data, mime_type, _IMAGE_TRANSACTION_PROMPT)
            if self.provider == "groq"
            else await self._generate_gemini_vision(image_data, mime_type, _IMAGE_TRANSACTION_PROMPT)
        )
        ai_txns = json.loads(_extract_json(text))
        return _dedupe_ai_transactions(ai_txns)

    async def batch_categorize(self, txns: list[TransactionInput], valid_categories: list[str]) -> list[str]:
        """Sends transactions to the AI in chunks and returns a category per entry."""
        result = [""] * len(txns)
        if not txns:
            return result
        cat_list = ", ".join(valid_categories)

        for start in range(0, len(txns), _CATEGORIZE_CHUNK_SIZE):
            chunk = txns[start : start + _CATEGORIZE_CHUNK_SIZE]
            lines = "\n".join(f"{i + 1}. [{t.type}] {t.description}" for i, t in enumerate(chunk))
            prompt = (
                "You are a financial transaction categorizer for a Nigerian bank user.\n"
                "Each transaction is labeled [income] (money received) or [expense] (money sent/spent).\n"
                f"Preferred categories (reuse these when they fit): {cat_list}\n"
                "You may create a short new category name if none fit. Never assign 'Income' to an [expense] transaction.\n\n"
                "Return ONLY a JSON array of strings, one category per transaction in the same order. No explanation.\n\n"
                f"Transactions:\n{lines}"
            )
            try:
                text = await self._generate(prompt)
                cats = json.loads(_extract_json(text))
            except (httpx.HTTPError, RuntimeError, json.JSONDecodeError):
                continue
            for i in range(min(len(chunk), len(cats))):
                result[start + i] = cats[i]
        return result

    async def extract_transactions(self, raw_text: str) -> list[RawTransaction]:
        """Splits large PDF text into chunks and merges results."""
        chunks = _split_text_into_chunks(raw_text, _PDF_CHUNK_SIZE)
        all_txns: list[dict] = []
        seen: set[str] = set()

        for i, chunk in enumerate(chunks):
            if i > 0:
                await asyncio.sleep(2)  # stay within Groq's per-minute token budget
            prompt = (
                f"Extract all financial transactions from this bank statement text (part {i + 1} of {len(chunks)}).\n"
                "Return a JSON array where each item has:\n"
                '- "date": YYYY-MM-DD\n'
                '- "description": transaction description/narration\n'
                '- "amount": positive number, no currency symbols\n'
                '- "type": "income" or "expense"\n\n'
                "Skip headers, totals, and account summary rows. Only actual transaction rows.\n"
                "If there are no transactions in this section return an empty array [].\n\n"
                f"Text:\n{chunk}"
            )
            try:
                text = await self._generate(prompt)
                ai_txns = json.loads(_extract_json(text))
            except (httpx.HTTPError, RuntimeError, json.JSONDecodeError):
                continue
            for t in ai_txns:
                key = f"{t.get('date')}|{t.get('amount'):.2f}|{t.get('description')}" if _valid_ai_txn(t) else None
                if key is None or key in seen:
                    continue
                seen.add(key)
                all_txns.append(t)

        return _dedupe_ai_transactions(all_txns, already_deduped=True)


def _valid_ai_txn(t: dict) -> bool:
    return isinstance(t.get("amount"), (int, float)) and isinstance(t.get("date"), str)


def _dedupe_ai_transactions(ai_txns: list[dict], already_deduped: bool = False) -> list[RawTransaction]:
    from datetime import datetime

    seen: set[str] = set()
    result: list[RawTransaction] = []
    for t in ai_txns:
        try:
            txn_date = datetime.strptime(t["date"], "%Y-%m-%d")
        except (KeyError, ValueError):
            continue
        txn_type = t.get("type") if t.get("type") in ("income", "expense") else "expense"
        key = f"{t['date']}|{t['amount']:.2f}|{t.get('description', '')}"
        if not already_deduped:
            if key in seen:
                continue
            seen.add(key)
        result.append(RawTransaction(date=txn_date, amount=t["amount"], description=t.get("description", ""), type=txn_type))
    return result


def _extract_json(s: str) -> str:
    """Pulls the first complete JSON array or object out of an LLM response,
    ignoring any surrounding markdown, prose, or code fences."""
    match = re.search(r"[\[{]", s)
    if not match:
        return s
    open_idx = match.start()
    closer = "]" if s[open_idx] == "[" else "}"
    close_idx = s.rfind(closer)
    if close_idx <= open_idx:
        return s
    return s[open_idx : close_idx + 1]


def _split_text_into_chunks(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    chunks = []
    while text:
        if len(text) <= max_chars:
            chunks.append(text)
            break
        window = text[:max_chars]
        newline_idx = window.rfind("\n")
        cut = newline_idx + 1 if newline_idx > max_chars // 2 else max_chars
        chunks.append(text[:cut])
        text = text[cut:]
    return chunks

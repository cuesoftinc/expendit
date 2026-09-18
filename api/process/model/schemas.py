# Kafka message contracts between api/intake, api/process, and api/common.
# Topic names live in kafka/client.py.
from pydantic import BaseModel


class ReferenceData(BaseModel):
    """Everything api/process needs to make decisions, computed by
    api/common from data it owns (it never gets queried directly)."""

    categories: list[str] = []
    fingerprints: list[str] = []
    avg_amount: float = 0.0
    last_month_totals: dict[str, float] = {}
    three_month_avg: dict[str, float] = {}


class ReadyForProcessingMessage(BaseModel):
    """Produced by api/common (topic: expendit.receipts.ready) once it has
    created the job record and gathered reference data; consumed by
    api/process."""

    job_id: str
    user_id: str
    file_name: str
    file_data: str  # base64
    reference: ReferenceData


class ProcessedTransaction(BaseModel):
    date: str  # ISO 8601
    amount: float
    description: str
    category: str
    ai_categorized: bool
    type: str  # "income" or "expense"
    fingerprint: str


class ProcessedMessage(BaseModel):
    """Produced by api/process (topic: expendit.receipts.processed);
    consumed by api/common, which persists the result."""

    job_id: str
    user_id: str
    status: str  # "completed" or "failed"
    error: str | None = None
    file_type: str | None = None
    total_parsed: int = 0
    duplicates_found: int = 0
    transactions: list[ProcessedTransaction] = []
    new_categories: list[str] = []
    new_fingerprints: list[str] = []
    summary: dict | None = None
    ai_summary: str | None = None
    anomalies: list[dict] = []

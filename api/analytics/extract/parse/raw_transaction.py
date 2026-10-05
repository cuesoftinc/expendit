from dataclasses import dataclass
from datetime import datetime


@dataclass
class RawTransaction:
    date: datetime
    amount: float
    description: str
    type: str  # "income" or "expense"

"""The LLM narrative shown on the import review (ImportJob.ai_summary)."""

from extract.ai.enhancer import AIEnhancer


async def generate(ai: AIEnhancer, count: int, summary: dict, currency: str) -> str | None:
    top = "; ".join(f"{name}: {currency} {amount:.0f}" for name, amount in list(summary["by_category"].items())[:5])
    prompt = (
        f"You are a personal finance assistant. A user imported {count} bank transactions. "
        f"Total income: {currency} {summary['total_income']:.0f}. Total expenses: {currency} {summary['total_expense']:.0f}. "
        f"Net: {currency} {summary['net']:.0f}. "
        f"Top spending categories: {top}. "
        "Write 2 short friendly sentences summarising this and give one money-saving tip. Plain text only."
    )
    text = await ai.generate_text(prompt)
    return text.strip() or None

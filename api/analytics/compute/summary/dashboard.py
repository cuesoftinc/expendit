"""The dashboard AI summary (moved out of Go per S-7)."""

from extract.ai.enhancer import AIEnhancer


async def generate(ai: AIEnhancer, inputs: dict) -> str | None:
    currency = inputs.get("currency", "NGN")
    totals = inputs["totals"]
    top = "; ".join(f"{name}: {currency} {amount:.0f}" for name, amount in list(inputs.get("by_category", {}).items())[:5])
    prompt = (
        f"You are a personal finance assistant. For {inputs.get('period', 'this period')}: "
        f"income {currency} {totals['income']:.0f}, expenses {currency} {totals['expense']:.0f}, "
        f"net {currency} {totals['income'] - totals['expense']:.0f}. Top categories: {top}. "
        "Write 2–3 short sentences on the trend and one practical suggestion. Plain text only."
    )
    text = await ai.generate_text(prompt)
    return text.strip() or None

/**
 * Number/money formatting per design.md §2: money renders
 * `₦1,240,300.50` style with consistent decimal precision and tabular
 * figures (the `tabular-nums` class lives on the component).
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export const currencySymbol = (code: string): string =>
  CURRENCY_SYMBOLS[code] ?? `${code} `;

export const formatMoney = (
  amount: number,
  currency = "NGN",
  options: { decimals?: number } = {},
): string => {
  const decimals = options.decimals ?? 2;
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-NG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  // Preserve the sign — a −₦950,000 net month rendered as ₦950,000.00 on
  // the overview StatCard (system QA 2026-07-19). Callers that render
  // direction themselves (MoneyCell) pass unsigned magnitudes.
  const sign = amount < 0 ? "−" : "";
  return `${sign}${currencySymbol(currency)}${formatted}`;
};

export const formatPercent = (value: number, decimals = 1): string =>
  `${(value * 100).toFixed(decimals)}%`;

export const formatRatio = (value: number, decimals = 2): string =>
  value.toFixed(decimals);

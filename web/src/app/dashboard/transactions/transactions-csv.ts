import type { TxnEntry } from "@/models";

function quoteCell(value: string | number): string {
  let text = String(value);
  // Finite numbers cannot contain formulas. Keep signed amounts numeric for
  // importers, which would otherwise parse an apostrophe-prefixed amount as zero.
  const isNumber = typeof value === "number" && Number.isFinite(value);
  if (!isNumber && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function transactionsCsv(
  rows: readonly TxnEntry[],
  categories: ReadonlyMap<string, { name: string }>,
  currency: string,
): string {
  return [
    ["date", "description", "category", "direction", "amount", "currency"],
    ...rows.map((txn) => [
      txn.txn_date,
      txn.description,
      categories.get(txn.category_id)?.name ?? txn.category_id,
      txn.direction,
      txn.amount,
      currency,
    ]),
  ]
    .map((row) => row.map(quoteCell).join(","))
    .join("\r\n");
}

export type InspectorState =
  | { kind: "closed" }
  | { kind: "record"; txnId: string }
  | { kind: "anomaly"; txnId: string }
  | { kind: "new" };

/** Editable inspector fields for the record variant + the manual path. */
export interface TxnDraft {
  description: string;
  amount: string;
  direction: "income" | "expense";
  category_id: string | null;
  txn_date: string;
}

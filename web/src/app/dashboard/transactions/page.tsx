import React, { Suspense } from "react";
import TransactionsView from "./TransactionsView";

/** B2 `/dashboard/transactions` — Ledger (pages.md B2). */
export default function TransactionsPage() {
  return (
    // useSearchParams (deep-linkable inspector, MI-11) needs a Suspense
    // boundary in the App Router.
    <Suspense fallback={null}>
      <TransactionsView />
    </Suspense>
  );
}

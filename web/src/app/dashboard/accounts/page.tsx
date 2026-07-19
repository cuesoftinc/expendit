import React, { Suspense } from "react";
import AccountsView from "./AccountsView";

/** B4 `/dashboard/accounts` — Linked bank accounts (pages.md B4). */
export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsView />
    </Suspense>
  );
}

import React, { Suspense } from "react";
import CompanyStatementsView from "./CompanyStatementsView";

/** B6 `/dashboard/company` — Company financials, statements (pages.md B6). */
export default function CompanyPage() {
  return (
    <Suspense fallback={null}>
      <CompanyStatementsView />
    </Suspense>
  );
}

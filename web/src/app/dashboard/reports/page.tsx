import React, { Suspense } from "react";
import ReportsView from "./ReportsView";

/** B5 `/dashboard/reports` — Reports & downloads (pages.md B5). */
export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsView />
    </Suspense>
  );
}

import React, { Suspense } from "react";
import ImportsView from "./ImportsView";

/** B3 `/dashboard/imports` — Import hub (pages.md B3). */
export default function ImportsPage() {
  return (
    <Suspense fallback={null}>
      <ImportsView />
    </Suspense>
  );
}

import React, { Suspense } from "react";
import CategoriesView from "./CategoriesView";

/** B8 `/dashboard/categories` — Categories (pages.md B8). */
export default function CategoriesPage() {
  return (
    <Suspense fallback={null}>
      <CategoriesView />
    </Suspense>
  );
}

import React from "react";
import type { Metadata } from "next";
import DocsApiView from "@/components/docs/DocsApiView";

/**
 * /docs/api — public API reference (X-2): the Scalar interactive
 * reference rendered from the repo's canonical OpenAPI document
 * (docs/api/openapi.yaml, served at /docs/api/openapi.yaml).
 * Production surface: public, no auth, marketing nav chrome. Server
 * shell carries the route metadata; the view is client-composed.
 */

export const metadata: Metadata = {
  title: "API reference — Expendit",
  description:
    "Interactive reference for the Expendit API — ledger, imports, banking, company financials, taxes and rights, rendered live from the repo's OpenAPI document.",
};

export default function DocsApiPage() {
  return <DocsApiView />;
}

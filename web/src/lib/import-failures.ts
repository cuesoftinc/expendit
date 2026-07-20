/**
 * Import failure-taxonomy copy (flows/import.md §3) — every snake_case
 * error code maps to a distinct human line; the raw code stays secondary
 * (tooltip/mono), never the primary message (Figma B3 history rows).
 */

export const FAILURE_COPY: Record<string, string> = {
  file_too_large: "Files must be 15 MB or smaller.",
  unsupported_type: "Upload a CSV, PDF, or receipt image.",
  no_transactions_found:
    "No transactions found — try a CSV export from your bank.",
  password_protected_pdf: "Remove the password and re-upload.",
  ai_unavailable:
    "AI processing is temporarily unavailable — try again later. CSV imports are unaffected.",
  consent_required:
    "AI processing consent is needed for images — review it in Settings → Data & privacy.",
};

export const failureMessage = (code: string | null): string =>
  (code && FAILURE_COPY[code]) ??
  "Something went wrong — nothing was imported.";

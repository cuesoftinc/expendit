/**
 * Mock: import upload — 202 {job_id}, async lifecycle (flows/import.md).
 * Idempotency-Key semantics: same key returns the same job while
 * processing/completed; a failed job releases its key.
 *
 * Filename triggers for the failure taxonomy (fixture behavior):
 *   *.exe / unknown ext → 415 unsupported_type
 *   name contains "password-protected" → job fails password_protected_pdf
 *   name contains "empty" → completed with 0 rows (no_transactions_found UX)
 */

import type { ImportFileType, ImportJob } from "@/models";
import { getDb, nextId } from "@/mocks/store";
import { mockNow } from "@/mocks/clock";
import { fail, ok, resolveOrgId, writeBlocked } from "@/mocks/http";

const MAX_BYTES = 15 * 1024 * 1024; // ≤15 MB [Decided]
const EXT_TO_TYPE: Record<string, ImportFileType> = {
  csv: "csv",
  xlsx: "csv",
  txt: "csv",
  pdf: "pdf",
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  heic: "image",
};

export async function POST(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const db = getDb();

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey && db.idempotency[idempotencyKey]) {
    const existing = db.importJobs.find(
      (job) => job.id === db.idempotency[idempotencyKey],
    );
    if (existing && existing.status !== "failed") {
      return ok({ job_id: existing.id }, 202);
    }
    delete db.idempotency[idempotencyKey]; // failed job releases the key
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return fail(422, "validation_failed", "No file in upload");
  }
  if (file.size > MAX_BYTES) {
    return fail(413, "file_too_large", "Files must be 15 MB or smaller");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fileType = EXT_TO_TYPE[ext];
  if (!fileType) {
    return fail(415, "unsupported_type", "Upload a CSV, PDF, or receipt image");
  }

  // Consent gate (flows/import.md §3): images always need AI to parse —
  // without an `ai_processing` consent record they are refused with
  // 403 consent_required (PDFs proceed regex-only; CSV never needs AI).
  // Review canon 2026-07-19: the advertised consent control must
  // observably gate results, not decorate them.
  if (
    fileType === "image" &&
    !db.consents.some((record) => record.document === "ai_processing")
  ) {
    return fail(
      403,
      "consent_required",
      "Receipt images need AI processing — record the ai_processing consent first",
      { document: "ai_processing" },
    );
  }

  const job: ImportJob = {
    id: nextId("job"),
    org_id: orgId,
    source: "upload",
    status: "processing",
    file_name: file.name,
    file_type: fileType,
    total_parsed: 0,
    duplicates_found: 0,
    imported: 0,
    summary: null,
    ai_summary: null,
    anomalies: [],
    warnings: [],
    error_code: null,
    confirmed: false,
    created_at: mockNow().toISOString(),
    completed_at: null,
  };
  db.importJobs.unshift(job);
  db.processingSince[job.id] = Date.now();
  if (idempotencyKey) db.idempotency[idempotencyKey] = job.id;

  return ok({ job_id: job.id }, 202);
}

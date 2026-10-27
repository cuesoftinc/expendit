/**
 * Mock: import-job history (pages.md B3) and import creation — the first
 * half of create-then-upload (docs/system-design.md §6.1). POST authorizes
 * the upload and returns {job_id, upload_ticket}; the file then goes to
 * POST /uploads. Idempotency-Key: the same key returns the same job while
 * it is pending, processing or completed; a failed job releases its key.
 *
 * File-name triggers for the failure taxonomy (fixture behavior):
 *   *.exe / unknown ext → 415 unsupported_type
 *   name contains "password-protected" → job fails password_protected_pdf
 *   name contains "empty" → completed with 0 rows (no_transactions_found UX)
 */

import type { ImportFileType, ImportJob } from "@/models";
import { getDb, nextId } from "@/mocks/store";
import { mockNow } from "@/mocks/clock";
import { fail, ok, resolveOrgId, writeBlocked } from "@/mocks/http";
import {
  extensionOf,
  issueTicket,
  MAX_UPLOAD_BYTES,
  pendingFor,
} from "@/mocks/uploads";

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

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const items = getDb()
    .importJobs.filter((job) => job.org_id === orgId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return ok({ items });
}

export async function POST(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const db = getDb();

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) {
    const pending = pendingFor(idempotencyKey);
    if (pending) {
      const [ticket, upload] = pending;
      return ok({ job_id: upload.draft.id, upload_ticket: ticket }, 201);
    }
    const existing = db.importJobs.find(
      (job) => job.id === db.idempotency[idempotencyKey],
    );
    if (existing && existing.status !== "failed") {
      // Already uploaded: same job, no new ticket.
      return ok({ job_id: existing.id }, 200);
    }
    delete db.idempotency[idempotencyKey]; // a failed job releases the key
  }

  const body = (await request.json().catch(() => null)) as {
    file_name?: string;
    size?: number;
  } | null;
  if (!body?.file_name || typeof body.size !== "number" || body.size <= 0) {
    return fail(422, "validation_failed", "file_name and size are required");
  }
  if (body.size > MAX_UPLOAD_BYTES) {
    return fail(413, "file_too_large", "Files must be 15 MB or smaller", {
      max_bytes: MAX_UPLOAD_BYTES,
    });
  }
  const fileType = EXT_TO_TYPE[extensionOf(body.file_name)];
  if (!fileType) {
    return fail(415, "unsupported_type", "Upload a CSV, PDF, or receipt image");
  }

  // Consent gate (flows/import.md §3): images always need AI to parse —
  // without an `ai_processing` consent record they are refused with
  // 403 consent_required before any bytes move (PDFs proceed regex-only;
  // CSV never needs AI).
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
    file_name: body.file_name,
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
  const grant = issueTicket({ kind: "import_job", draft: job, idempotencyKey });
  return ok({ job_id: job.id, ...grant }, 201);
}

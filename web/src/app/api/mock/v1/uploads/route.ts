/**
 * Mock: the upload gateway (api/statements, docs/system-design.md §6.1,
 * S-14). Auth is the Upload-Ticket from POST /import or POST /statements,
 * not the session. Answers 202 {id, kind, status: "processing"}; the job or
 * statement then appears and is polled as before.
 */

import { getDb } from "@/mocks/store";
import { fail, ok } from "@/mocks/http";
import { extensionOf, MAX_UPLOAD_BYTES, takeTicket } from "@/mocks/uploads";

const TYPES_BY_EXT: Record<string, string[]> = {
  csv: ["csv"],
  txt: ["csv"],
  xlsx: ["csv", "xlsx"],
  pdf: ["pdf"],
  jpg: ["image"],
  jpeg: ["image"],
  png: ["image"],
  webp: ["image"],
  heic: ["image"],
};

export async function POST(request: Request) {
  const pending = takeTicket(request.headers.get("upload-ticket"));
  if (pending === "invalid_ticket") {
    return fail(
      401,
      "invalid_ticket",
      "The upload ticket is missing or invalid",
    );
  }
  if (pending === "ticket_expired") {
    return fail(
      401,
      "ticket_expired",
      "The upload ticket has expired; start the upload again",
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail(
      400,
      "invalid_upload",
      'Send one file in a multipart field named "file"',
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(413, "file_too_large", "Files must be 15 MB or smaller", {
      max_bytes: MAX_UPLOAD_BYTES,
    });
  }

  const db = getDb();
  const declared =
    pending.kind === "import_job"
      ? pending.draft.file_type
      : pending.draft.source_file_type;
  if (!(TYPES_BY_EXT[extensionOf(file.name)] ?? []).includes(declared ?? "")) {
    return fail(
      415,
      "unsupported_type",
      "The file doesn't match the type declared for this upload",
    );
  }

  if (pending.kind === "import_job") {
    db.importJobs.unshift(pending.draft);
    db.processingSince[pending.draft.id] = Date.now();
    if (pending.idempotencyKey)
      db.idempotency[pending.idempotencyKey] = pending.draft.id;
  } else {
    db.statements.push(pending.draft);
    db.processingSince[pending.draft.id] = Date.now();
    if (pending.idempotencyKey)
      db.idempotency[pending.idempotencyKey] = pending.draft.id;
  }
  return ok(
    { id: pending.draft.id, kind: pending.kind, status: "processing" },
    202,
  );
}

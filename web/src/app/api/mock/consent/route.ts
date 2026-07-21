/** Mock: consent records — tos/privacy/ai_processing (flows/auth.md §4). */

import type { ConsentDocument, ConsentRecord } from "@/models";
import { getDb, nextId } from "@/mocks/db";
import { mockNow } from "@/mocks/clock";
import { fail, ok } from "@/mocks/http";
import { USER_IBUKUN } from "@/mocks/seed";

const DOCUMENTS: ConsentDocument[] = ["tos", "privacy", "ai_processing"];

export async function GET() {
  return ok({ items: getDb().consents });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = (await request.json()) as {
    document?: ConsentDocument;
    version?: string;
  };
  if (!body.document || !DOCUMENTS.includes(body.document) || !body.version) {
    return fail(422, "validation_failed", "document and version are required", {
      allowed: DOCUMENTS,
    });
  }
  const record: ConsentRecord = {
    id: nextId("consent"),
    user_id: USER_IBUKUN,
    document: body.document,
    version: body.version,
    accepted_at: mockNow().toISOString(),
  };
  db.consents.push(record); // consent rows are immutable audit records
  return ok(record, 201);
}

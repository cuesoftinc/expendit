/** Mock: bank links — list + widget bootstrap (flows/bank-link.md §1). */

import type { BankLink } from "@/models";
import { getDb, nextId } from "@/mocks/db";
import { mockNow } from "@/mocks/clock";
import { fail, ok, resolveOrgId, writeBlocked } from "@/mocks/http";

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const items = getDb().bankLinks.filter((link) => link.org_id === orgId);
  return ok({ items });
}

export async function POST(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const db = getDb();

  const link: BankLink = {
    id: nextId("link"),
    org_id: orgId,
    provider: "mono",
    institution: "",
    masked_account: "",
    status: "pending", // purged after 1h if the widget is abandoned
    last_synced_at: null,
    auto_confirm: false,
    imported_txn_count: 0,
    created_at: mockNow().toISOString(),
  };
  db.bankLinks.push(link);

  return ok(
    {
      link_id: link.id,
      mono_connect_config: {
        public_key: "test_pk_mock",
        reference: link.id,
      },
    },
    201,
  );
}

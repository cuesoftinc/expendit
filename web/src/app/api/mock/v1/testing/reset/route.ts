// Mock test harness: POST /api/mock/v1/testing/reset — reseeds the in-memory
// store. The store is dev-persistent (module/global singleton), so e2e
// suites call this to start from the canonical narrative regardless of
// server reuse. The `testing/` segment keeps it visibly outside the API
// contract (an underscore-prefixed folder would be a private, unrouted App
// Router dir).
import { noContent } from "@/mocks/http";
import { resetDb } from "@/mocks/store";

export async function POST() {
  resetDb();
  return noContent();
}

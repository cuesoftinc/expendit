/** Mock: export job status — completes on poll with a 7-day signed URL. */

import { getDb } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { notFound, ok } from "@/mock/http";

type Context = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, context: Context) {
  const { jobId } = await context.params;
  const db = getDb();
  const job = db.exportJobs.find((item) => item.job_id === jobId);
  if (!job) return notFound();

  if (job.status === "running") {
    const expires = mockNow();
    expires.setDate(expires.getDate() + 7); // 7-day download TTL
    job.status = "completed";
    job.signed_url = `/api/mock/account/export/${jobId}/archive.zip`;
    job.expires_at = expires.toISOString();
  }
  return ok(job);
}

/** Mock: export job status — completes on poll with a 7-day signed URL. */

import { getDb } from "@/mocks/db";
import { mockNow } from "@/mocks/clock";
import { notFound, ok } from "@/mocks/http";

type Context = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, context: Context) {
  const { jobId } = await context.params;
  const db = getDb();
  const job = db.exportJobs.find((item) => item.job_id === jobId);
  if (!job) return notFound();

  if (job.status === "running") {
    // Determinate lifecycle (Figma B9b "ZIP · 48%"): the archive builds
    // across polls — ~48% a poll, completing on the second.
    const progress = Math.min(100, (job.progress ?? 0) + 48);
    job.progress = progress;
    if (progress >= 96) {
      const expires = mockNow();
      expires.setDate(expires.getDate() + 7); // 7-day download TTL
      job.status = "completed";
      job.progress = 100;
      job.signed_url = `/api/mock/account/export/${jobId}/archive.zip`;
      job.expires_at = expires.toISOString();
    }
  }
  return ok(job);
}

// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { POST as upload } from "@/app/api/mock/import/upload/route";
import {
  DELETE as discardJob,
  GET as getJob,
} from "@/app/api/mock/import/[jobId]/route";
import { POST as confirmJob } from "@/app/api/mock/import/[jobId]/confirm/route";
import { PUT as correctCategory } from "@/app/api/mock/import/transactions/[id]/category/route";
import type { ImportJob, StagedTransaction } from "@/models";
import { getDb, resetDb } from "./db";
import { STAGED_JOB_ID } from "./seed";
import { json, mockRequest, params } from "./test-helpers";

type JobDetail = { job: ImportJob; staged: StagedTransaction[] };

describe("mock import pipeline (flows/import.md)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("seeds the 214/209/5 staged-review narrative", async () => {
    const detail = await json<JobDetail>(
      await getJob(
        mockRequest(`/api/mock/import/${STAGED_JOB_ID}`),
        params({ jobId: STAGED_JOB_ID }),
      ),
    );
    expect(detail.job.total_parsed).toBe(214);
    expect(detail.job.duplicates_found).toBe(5);
    expect(detail.staged).toHaveLength(214);
    expect(detail.staged.filter((row) => row.is_duplicate)).toHaveLength(5);
  });

  it("confirm imports 209 and discards 5 duplicates, idempotently (MI-3)", async () => {
    const before = getDb().transactions.length;
    const result = await json<{ imported: number; discarded: number }>(
      await confirmJob(
        mockRequest(`/api/mock/import/${STAGED_JOB_ID}/confirm`, {
          method: "POST",
        }),
        params({ jobId: STAGED_JOB_ID }),
      ),
    );
    expect(result).toEqual({ imported: 209, discarded: 5 });
    expect(getDb().transactions.length).toBe(before + 209);

    // Double confirm: idempotent success, no double import.
    const again = await json<{ imported: number; discarded: number }>(
      await confirmJob(
        mockRequest(`/api/mock/import/${STAGED_JOB_ID}/confirm`, {
          method: "POST",
        }),
        params({ jobId: STAGED_JOB_ID }),
      ),
    );
    expect(again.imported).toBe(209);
    expect(getDb().transactions.length).toBe(before + 209);
  });

  it("category correction clears the AI ✨ mark (MI-4)", async () => {
    const row = getDb().stagedTxns.find((item) => item.ai_categorized);
    expect(row).toBeDefined();
    const updated = await json<StagedTransaction>(
      await correctCategory(
        mockRequest(`/api/mock/import/transactions/${row!.id}/category`, {
          method: "PUT",
          body: { category_id: "cat-meals" },
        }),
        params({ id: row!.id }),
      ),
    );
    expect(updated.category_id).toBe("cat-meals");
    expect(updated.ai_categorized).toBe(false);
  });

  it("upload: 202 + idempotency key returns the same job", async () => {
    const file = new File(["date,description,amount"], "statement.csv", {
      type: "text/csv",
    });
    const first = await json<{ job_id: string }>(
      await upload(
        mockRequest("/api/mock/import/upload", {
          method: "POST",
          form: { file },
          idempotencyKey: "11111111-1111-1111-1111-111111111111",
        }),
      ),
    );
    const retry = await json<{ job_id: string }>(
      await upload(
        mockRequest("/api/mock/import/upload", {
          method: "POST",
          form: { file },
          idempotencyKey: "11111111-1111-1111-1111-111111111111",
        }),
      ),
    );
    expect(retry.job_id).toBe(first.job_id); // retries never double-import
  });

  it("upload lifecycle: processing → completed with staged rows", async () => {
    const file = new File(["date,description,amount"], "fresh.csv", {
      type: "text/csv",
    });
    const { job_id } = await json<{ job_id: string }>(
      await upload(
        mockRequest("/api/mock/import/upload", {
          method: "POST",
          form: { file },
        }),
      ),
    );
    // Force the async lifecycle past the processing window.
    getDb().processingSince[job_id] = Date.now() - 5_000;
    const detail = await json<JobDetail>(
      await getJob(
        mockRequest(`/api/mock/import/${job_id}`),
        params({ jobId: job_id }),
      ),
    );
    expect(detail.job.status).toBe("completed");
    expect(detail.staged.length).toBeGreaterThan(0);
  });

  it("failure taxonomy: 415 unsupported_type; password-protected pdf fails the job", async () => {
    const exe = new File(["MZ"], "malware.exe");
    const unsupported = await upload(
      mockRequest("/api/mock/import/upload", {
        method: "POST",
        form: { file: exe },
      }),
    );
    expect(unsupported.status).toBe(415);
    const body = await json<{ error: { code: string } }>(unsupported);
    expect(body.error.code).toBe("unsupported_type");

    const locked = new File(["%PDF"], "password-protected-statement.pdf");
    const { job_id } = await json<{ job_id: string }>(
      await upload(
        mockRequest("/api/mock/import/upload", {
          method: "POST",
          form: { file: locked },
        }),
      ),
    );
    getDb().processingSince[job_id] = Date.now() - 5_000;
    const detail = await json<JobDetail>(
      await getJob(
        mockRequest(`/api/mock/import/${job_id}`),
        params({ jobId: job_id }),
      ),
    );
    expect(detail.job.status).toBe("failed");
    expect(detail.job.error_code).toBe("password_protected_pdf");
  });

  it("discard purges the job and its staging", async () => {
    const response = await discardJob(
      mockRequest(`/api/mock/import/${STAGED_JOB_ID}`, { method: "DELETE" }),
      params({ jobId: STAGED_JOB_ID }),
    );
    expect(response.status).toBe(204);
    expect(
      getDb().stagedTxns.filter((row) => row.job_id === STAGED_JOB_ID),
    ).toHaveLength(0);
  });
});

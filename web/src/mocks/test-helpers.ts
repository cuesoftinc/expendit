/** Test helpers for exercising the mock route handlers directly. */

import { ORG_CUESOFT } from "./seed";

export interface MockRequestInit {
  method?: string;
  orgId?: string | null;
  body?: unknown;
  form?: Record<string, string | File>;
  idempotencyKey?: string;
}

export const mockRequest = (
  path: string,
  init: MockRequestInit = {},
): Request => {
  const headers = new Headers();
  if (init.orgId !== null) headers.set("X-Org-Id", init.orgId ?? ORG_CUESOFT);
  if (init.idempotencyKey) headers.set("Idempotency-Key", init.idempotencyKey);

  let body: BodyInit | undefined;
  if (init.form) {
    const form = new FormData();
    for (const [key, value] of Object.entries(init.form)) {
      form.append(key, value);
    }
    body = form;
  } else if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }

  return new Request(`http://mock.local${path}`, {
    method: init.method ?? "GET",
    headers,
    body,
  });
};

/** Route-handler context helper (Next 16 async params). */
export const params = <T extends Record<string, string>>(
  value: T,
): { params: Promise<T> } => ({ params: Promise.resolve(value) });

export const json = async <T>(response: Response): Promise<T> =>
  (await response.json()) as T;

/**
 * Create-then-upload through the mock (system-design.md §6.1): POST
 * /import with the file's name and size, then POST /uploads with the
 * ticket. Returns the first failing response, else 202 {job_id}.
 */
export const uploadImport = async (
  init: MockRequestInit,
): Promise<Response> => {
  const { POST: createImport } = await import("@/app/api/mock/v1/import/route");
  const { POST: sendUpload } = await import("@/app/api/mock/v1/uploads/route");
  const file = init.form?.file as File;
  const created = await createImport(
    mockRequest("/api/mock/v1/import", {
      method: "POST",
      orgId: init.orgId,
      idempotencyKey: init.idempotencyKey,
      body: { file_name: file.name, size: file.size },
    }),
  );
  if (!created.ok) return created;
  const grant = (await created.clone().json()) as {
    job_id: string;
    upload_ticket?: string;
  };
  if (grant.upload_ticket) {
    const form = new FormData();
    form.append("file", file);
    const uploaded = await sendUpload(
      new Request("http://mock.local/api/mock/v1/uploads", {
        method: "POST",
        headers: { "Upload-Ticket": grant.upload_ticket },
        body: form,
      }),
    );
    if (!uploaded.ok) return uploaded;
  }
  return Response.json({ job_id: grant.job_id }, { status: 202 });
};

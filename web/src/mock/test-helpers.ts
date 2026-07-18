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

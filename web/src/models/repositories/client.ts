/**
 * API client — the single network access point for repositories (MVC:
 * models are the only layer that talks to the network). Targets the in-app
 * mock server in TEST_MODE, /api/v1 otherwise; parses the ecosystem error
 * envelope {"error": {code, message, details}} into ApiError.
 */

import { apiBase } from "@/config/env";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions {
  /** Org context header (api.md §5); absent = personal org. */
  orgId?: string;
  /** Idempotency key for upload/purge/report creation (api.md §4). */
  idempotencyKey?: string;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

const buildUrl = (path: string, query?: RequestOptions["query"]): string => {
  const url = `${apiBase()}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
};

const request = async <T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> => {
  const headers: Record<string, string> = {};
  if (options.orgId) headers["X-Org-Id"] = options.orgId;
  if (options.idempotencyKey)
    headers["Idempotency-Key"] = options.idempotencyKey;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: payload,
    signal: options.signal,
  });

  if (response.status === 204) return undefined as T;

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const envelope = (data ?? {}) as {
      error?: { code?: string; message?: string; details?: object };
    };
    throw new ApiError(
      response.status,
      envelope.error?.code ?? "unknown_error",
      envelope.error?.message ?? response.statusText,
      (envelope.error?.details as Record<string, unknown>) ?? {},
    );
  }

  return data as T;
};

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};

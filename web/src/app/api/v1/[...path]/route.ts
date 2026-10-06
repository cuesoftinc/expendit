/**
 * /api/v1/* proxy: the browser talks only to the web origin, and this
 * route handler forwards to the backend the way the load balancer does in
 * cloud (system-design.md §7.1, S-14): /api/v1/uploads to api/statements,
 * everything else to api/common. Origins are read per request
 * (API_ORIGIN, UPLOADS_ORIGIN), so one build runs in compose and cloud.
 *
 * Server-side code, not a view: no auth logic here. The bearer token and
 * the upload ticket pass through untouched and the services check them.
 */

import { serverEnv } from "@/config/env";

export const dynamic = "force-dynamic";

/** Request headers the backend contract uses (engineering.md §CORS). */
const FORWARD_REQUEST = [
  "authorization",
  "content-type",
  "idempotency-key",
  "x-org-id",
  "upload-ticket",
  "x-request-id",
];
/** Response headers the client reads. */
const FORWARD_RESPONSE = [
  "content-type",
  "retry-after",
  "x-request-id",
  "content-disposition",
];

const proxy = async (
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) => {
  const { path } = await params;
  const { apiOrigin, uploadsOrigin } = serverEnv();
  const origin = path[0] === "uploads" ? uploadsOrigin : apiOrigin;
  const incoming = new URL(request.url);
  const target = `${origin}/api/v1/${path.map(encodeURIComponent).join("/")}${incoming.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Stream the body (uploads are up to 15 MB) instead of buffering.
      ...(hasBody ? { duplex: "half" } : {}),
      cache: "no-store",
      redirect: "manual",
    } as RequestInit);
  } catch {
    return Response.json(
      {
        error: {
          code: "backend_unavailable",
          message: "The Expendit API is not reachable",
          details: {},
        },
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

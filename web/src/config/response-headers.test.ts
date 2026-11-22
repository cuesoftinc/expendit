// @vitest-environment node

import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("production response headers", () => {
  it("restricts framing, script origins, and third-party resource loading", async () => {
    const rules = await nextConfig.headers?.();
    const allRoutes = rules?.find((rule) => rule.source === "/(.*)");
    const headers = Object.fromEntries(
      (allRoutes?.headers ?? []).map(({ key, value }) => [
        key.toLowerCase(),
        value,
      ]),
    );

    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).toContain(
      "https://accounts.google.com",
    );
    expect(headers["content-security-policy"]).toContain(
      "https://api.github.com",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });

  it("enforces HSTS for at least a year and limits browser capabilities", async () => {
    const rules = await nextConfig.headers?.();
    const allRoutes = rules?.find((rule) => rule.source === "/(.*)");
    const headers = Object.fromEntries(
      (allRoutes?.headers ?? []).map(({ key, value }) => [
        key.toLowerCase(),
        value,
      ]),
    );

    const maxAge = headers["strict-transport-security"]?.match(/max-age=(\d+)/);
    expect(Number(maxAge?.[1])).toBeGreaterThanOrEqual(31_536_000);
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["permissions-policy"]).toContain("microphone=()");
    expect(headers["referrer-policy"]).toBe("no-referrer");
  });
});

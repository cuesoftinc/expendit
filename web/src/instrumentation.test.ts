// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { register } from "./instrumentation";

const names = ["debug", "log", "info", "warn", "error"] as const;
const saved = Object.fromEntries(names.map((name) => [name, console[name]]));

let written: string[];

beforeEach(() => {
  written = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    written.push(String(chunk));
    return true;
  });
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("K_SERVICE", "web");
  vi.stubEnv("LOG_LEVEL", "");
});

afterEach(() => {
  Object.assign(console, saved);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function lines() {
  return written.map((line) => JSON.parse(line));
}

describe("server console on Cloud Run", () => {
  it("writes one JSON line per call with a Cloud Logging severity", async () => {
    await register();
    console.log("ready on %s", "8080");
    console.info("served");
    console.warn("slow");
    console.error("failed");
    expect(lines()).toEqual([
      { severity: "INFO", message: "ready on 8080" },
      { severity: "INFO", message: "served" },
      { severity: "WARNING", message: "slow" },
      { severity: "ERROR", message: "failed" },
    ]);
  });

  it("folds an error's stack into one line", async () => {
    await register();
    console.error(new Error("boom"));
    expect(written).toHaveLength(1);
    expect(written[0].trimEnd()).not.toContain("\n");
    expect(lines()[0].severity).toBe("ERROR");
    expect(lines()[0].message).toMatch(/^Error: boom\n\s+at /);
  });

  it("drops debug lines unless LOG_LEVEL is debug", async () => {
    await register();
    console.debug("detail");
    expect(written).toEqual([]);
    vi.stubEnv("LOG_LEVEL", "DEBUG");
    await register();
    console.debug("detail");
    expect(lines()).toEqual([{ severity: "DEBUG", message: "detail" }]);
  });

  it("keeps warnings and errors at LOG_LEVEL=warn", async () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    await register();
    console.log("quiet");
    console.warn("slow");
    console.error("failed");
    expect(lines().map((line) => line.severity)).toEqual(["WARNING", "ERROR"]);
  });

  it("leaves the console alone off Cloud Run and on the edge runtime", async () => {
    vi.stubEnv("K_SERVICE", "");
    await register();
    vi.stubEnv("K_SERVICE", "web");
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await register();
    expect(names.every((name) => console[name] === saved[name])).toBe(true);
  });
});

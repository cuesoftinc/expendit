import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { SsoExchangeChannel } from "./sso";

type Sso = typeof import("./sso");
let clearSsoClientState: Sso["clearSsoClientState"];
let exchangeSsoSelectedChannel: Sso["exchangeSsoSelectedChannel"];
let selectSsoExchangeChannel: Sso["selectSsoExchangeChannel"];
let SsoExchangeError: Sso["SsoExchangeError"];
let startGoogleSso: Sso["startGoogleSso"];

const STORAGE_KEY = "expendit_sso_verifier";
const NOW = 1_800_000_000_000;
const TTL_MS = 10 * 60 * 1_000;
const HANDOFF = "h".repeat(43);
const VERIFIER = "v".repeat(43);
const BODY: SsoExchangeChannel = {
  channel: "body",
  handoff: HANDOFF,
  verifier: VERIFIER,
};

const mocks = vi.hoisted(() => ({
  assign: vi.fn(),
  fetch: vi.fn(),
}));

// The suite runs in TEST_MODE; these tests cover the real API base.
vi.mock("@/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/env")>();
  return { ...actual, env: { ...actual.env, apiBase: "/api/v1" } };
});

// The setup file loads the client before the env mock exists; reload it.
beforeAll(async () => {
  vi.resetModules();
  ({
    clearSsoClientState,
    exchangeSsoSelectedChannel,
    selectSsoExchangeChannel,
    SsoExchangeError,
    startGoogleSso,
  } = await import("./sso"));
});

const createTestStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    },
  };
};

const storeVerifier = (overrides: Record<string, unknown> = {}) => {
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      verifier: VERIFIER,
      owner: window.location.origin,
      createdAt: NOW,
      expiresAt: NOW + TTL_MS,
      ...overrides,
    }),
  );
};

const restoreSsoStartGuard = () => {
  const event = new Event("pageshow");
  Object.defineProperty(event, "persisted", { value: true });
  window.dispatchEvent(event);
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: createTestStorage(),
  });
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createTestStorage(),
  });
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { origin: "http://localhost:3000", assign: mocks.assign },
  });
  mocks.assign.mockReset();
  mocks.fetch.mockReset();
  vi.stubGlobal("fetch", mocks.fetch);
  restoreSsoStartGuard();

  let randomByte = 7;
  const getRandomValues = vi.fn((bytes: Uint8Array) => {
    bytes.fill(randomByte % 256);
    randomByte += 1;
    return bytes;
  });
  const digest = vi.fn(async () => new Uint8Array(32).buffer);
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { getRandomValues, subtle: { digest } },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  clearSsoClientState();
});

describe("startGoogleSso", () => {
  it("stores a verified per-tab verifier and navigates with its challenge", async () => {
    await startGoogleSso();

    const stored = JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    expect(stored).toMatchObject({
      version: 1,
      owner: window.location.origin,
      createdAt: NOW,
      expiresAt: NOW + TTL_MS,
    });
    expect(stored.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(window.sessionStorage.length).toBe(1);
    expect(window.localStorage.length).toBe(0);

    const destination = new URL(
      mocks.assign.mock.calls[0][0],
      "http://localhost:3000",
    );
    expect(destination.pathname).toBe("/api/v1/auth/sso/google");
    expect(destination.searchParams.get("cv")).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("does not start OAuth when browser storage is unavailable", async () => {
    vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    await expect(startGoogleSso()).rejects.toThrow(
      "SSO browser state is unavailable",
    );
    expect(mocks.assign).not.toHaveBeenCalled();
  });

  it("does not navigate when the verifier cannot be stored and confirmed", async () => {
    vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    await expect(startGoogleSso()).rejects.toThrow();
    expect(mocks.assign).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clears the verifier when browser navigation is refused", async () => {
    mocks.assign.mockImplementationOnce(() => {
      throw new Error("Navigation refused");
    });

    await expect(startGoogleSso()).rejects.toThrow("Navigation refused");
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not replace the verifier when sign-in is double-clicked", async () => {
    let resolveDigest!: (value: ArrayBuffer) => void;
    const digest = vi.fn(
      () =>
        new Promise<ArrayBuffer>((resolve) => {
          resolveDigest = resolve;
        }),
    );
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues: vi.fn((bytes: Uint8Array) => bytes.fill(9)),
        subtle: { digest },
      },
    });

    const firstStart = startGoogleSso();
    await startGoogleSso();
    resolveDigest(new Uint8Array(32).buffer);
    await firstStart;

    expect(digest).toHaveBeenCalledOnce();
    expect(mocks.assign).toHaveBeenCalledOnce();
  });

  it("resets the in-flight guard after a bfcache restore", async () => {
    await startGoogleSso();
    restoreSsoStartGuard();
    await startGoogleSso();

    expect(mocks.assign).toHaveBeenCalledTimes(2);
  });
});

describe("clearSsoClientState", () => {
  it("removes SSO records without clearing unrelated data", () => {
    storeVerifier();
    window.sessionStorage.setItem("expendit_sso_old_record", "old");
    window.localStorage.setItem("expendit_sso_old_fallback", "old");
    window.localStorage.setItem("unrelated", "keep");

    expect(clearSsoClientState()).toBe(true);
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem("expendit_sso_old_record")).toBeNull();
    expect(window.localStorage.getItem("expendit_sso_old_fallback")).toBeNull();
    expect(window.localStorage.getItem("unrelated")).toBe("keep");
  });

  it("fails closed when cleanup cannot be confirmed", () => {
    storeVerifier();
    vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    expect(clearSsoClientState()).toBe(false);
  });
});

describe("selectSsoExchangeChannel", () => {
  it("pins the verifier-bound body channel before client state is cleared", () => {
    storeVerifier();

    const selected = selectSsoExchangeChannel(HANDOFF);
    expect(selected).toEqual(BODY);
    expect(clearSsoClientState()).toBe(true);
    expect(selected).toEqual(BODY);
  });

  it("uses the cookie channel when no verifier is available", () => {
    expect(selectSsoExchangeChannel(HANDOFF)).toEqual({ channel: "cookie" });
    expect(selectSsoExchangeChannel(null)).toEqual({ channel: "cookie" });
  });

  it("ignores an expired or foreign verifier record", () => {
    storeVerifier({ expiresAt: NOW - 1 });
    expect(selectSsoExchangeChannel(HANDOFF)).toEqual({ channel: "cookie" });
    storeVerifier({ owner: "https://other.example" });
    expect(selectSsoExchangeChannel(HANDOFF)).toEqual({ channel: "cookie" });
  });
});

describe("exchangeSsoSelectedChannel", () => {
  it("posts the body channel with credentials", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ token: "t" }, 200));

    await expect(exchangeSsoSelectedChannel(BODY)).resolves.toBeUndefined();

    const [url, init] = mocks.fetch.mock.calls[0];
    expect(url).toBe("/api/v1/auth/sso/exchange");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body)).toEqual({
      handoff: HANDOFF,
      verifier: VERIFIER,
    });
  });

  it("redeems the cookie channel only with an empty body", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ token: "t" }, 200));

    await exchangeSsoSelectedChannel({ channel: "cookie" });

    const [, init] = mocks.fetch.mock.calls[0];
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe("include");
  });

  it("retries a dropped response on the same channel", async () => {
    vi.useFakeTimers();
    mocks.fetch
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(jsonResponse({ token: "t" }, 200));

    const exchange = exchangeSsoSelectedChannel(BODY);
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(exchange).resolves.toBeUndefined();
    expect(mocks.fetch.mock.calls.map(([, init]) => init.body)).toEqual([
      JSON.stringify({ handoff: HANDOFF, verifier: VERIFIER }),
      JSON.stringify({ handoff: HANDOFF, verifier: VERIFIER }),
    ]);
  });

  it("does not retry a rejected handoff", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({ error: { code: "handoff_invalid" } }, 401),
    );

    await expect(exchangeSsoSelectedChannel(BODY)).rejects.toMatchObject({
      status: 401,
      code: "handoff_invalid",
    });
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });

  it("reports an unreachable API as status 0 after the retries", async () => {
    vi.useFakeTimers();
    mocks.fetch.mockRejectedValue(new TypeError("network"));

    const exchange = exchangeSsoSelectedChannel(BODY);
    const settled = expect(exchange).rejects.toBeInstanceOf(SsoExchangeError);
    await vi.advanceTimersByTimeAsync(11_000);

    await settled;
    expect(mocks.fetch).toHaveBeenCalledTimes(4);
  });
});

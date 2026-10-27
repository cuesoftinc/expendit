import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

type Provider = typeof import("./session-provider").SessionAuthProvider;

const mocks = vi.hoisted(() => ({ startGoogleSso: vi.fn() }));

vi.mock("@/lib/auth/sso", () => ({ startGoogleSso: mocks.startGoogleSso }));
// The suite runs in TEST_MODE; these tests cover the real API base.
vi.mock("@/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/env")>();
  return { ...actual, env: { ...actual.env, apiBase: "/api/v1" } };
});

const fetchMock = vi.fn();
let SessionAuthProvider: Provider;

// The setup file loads the provider before this mock exists; reload it.
beforeAll(async () => {
  vi.resetModules();
  ({ SessionAuthProvider } = await import("./session-provider"));
});

const me = (status = 200) =>
  new Response(
    JSON.stringify({ user_id: "u1", email: "ada@example.com", org_id: "o1" }),
    { status, headers: { "Content-Type": "application/json" } },
  );

beforeEach(() => {
  fetchMock.mockReset();
  mocks.startGoogleSso.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SessionAuthProvider", () => {
  it("restores the user from /me with the session cookie", async () => {
    fetchMock.mockResolvedValue(me());
    const provider = new SessionAuthProvider();

    await provider.ready();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/me",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
    expect(provider.currentUser()).toEqual({
      uid: "u1",
      name: "ada",
      email: "ada@example.com",
      photo_url: null,
    });
  });

  it("reads a rejected or failed restore as signed out", async () => {
    fetchMock.mockResolvedValueOnce(me(401));
    const rejected = new SessionAuthProvider();
    await rejected.ready();
    expect(rejected.currentUser()).toBeNull();

    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const offline = new SessionAuthProvider();
    await offline.ready();
    expect(offline.currentUser()).toBeNull();
  });

  it("restores once however many callers wait", async () => {
    fetchMock.mockResolvedValue(me());
    const provider = new SessionAuthProvider();

    await Promise.all([provider.ready(), provider.ready()]);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("starts the redirect on sign-in and never resolves", async () => {
    const provider = new SessionAuthProvider();
    const settled = vi.fn();
    void provider.signInWithGoogle().then(settled);

    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.startGoogleSso).toHaveBeenCalledOnce();
    expect(settled).not.toHaveBeenCalled();
  });

  it("signs out locally and clears the server session", async () => {
    fetchMock.mockResolvedValueOnce(me());
    const provider = new SessionAuthProvider();
    await provider.ready();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await provider.signOut();

    expect(provider.currentUser()).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("sends no bearer token", async () => {
    expect(await new SessionAuthProvider().getBearerToken()).toBeNull();
  });
});

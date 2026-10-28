import { describe, expect, it } from "vitest";
import { TestModeAuthProvider, TEST_USER } from "./test-mode-provider";

describe("TestModeAuthProvider (X-1, TEST_MODE)", () => {
  it("signs in instantly with the seeded test user", async () => {
    const provider = new TestModeAuthProvider();
    expect(provider.currentUser()).toBeNull();
    const user = await provider.signInWithGoogle();
    expect(user).toEqual(TEST_USER);
    expect(provider.currentUser()).toEqual(TEST_USER);
    expect(await provider.getBearerToken()).toBe("test-mode-token");
  });

  it("persists under `expendit.test-session` in sessionStorage", async () => {
    const provider = new TestModeAuthProvider();
    await provider.signInWithGoogle();
    // Key convention: `<product>.test-session`, sessionStorage,
    // JSON user payload — one shape across e2e tooling.
    expect(
      JSON.parse(window.sessionStorage.getItem("expendit.test-session")!),
    ).toEqual(TEST_USER);
    expect(window.localStorage.getItem("expendit.test-session")).toBeNull();
    await provider.signOut();
  });

  it("reads a corrupted session as signed out (flows/auth.md §2: null, never throw)", () => {
    window.sessionStorage.setItem("expendit.test-session", "{not json");
    const provider = new TestModeAuthProvider();
    expect(provider.currentUser()).toBeNull();
    window.sessionStorage.removeItem("expendit.test-session");
  });

  it("sign-out clears both the session and the legacy flag", async () => {
    const provider = new TestModeAuthProvider();
    await provider.signInWithGoogle();
    await provider.signOut();
    expect(provider.currentUser()).toBeNull();
    expect(await provider.getBearerToken()).toBeNull();
  });
});

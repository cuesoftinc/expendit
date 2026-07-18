import { describe, expect, it } from "vitest";
import { TestModeAuthProvider, TEST_USER } from "./test-mode-provider";

describe("TestModeAuthProvider (X-1, TEST_MODE)", () => {
  it("signs in instantly with the seeded test user", async () => {
    const provider = new TestModeAuthProvider();
    expect(provider.currentUser()).toBeNull();
    const user = await provider.signInWithGoogle();
    expect(user).toEqual(TEST_USER);
    expect(provider.currentUser()).toEqual(TEST_USER);
    expect(await provider.getIdToken()).toBe("test-mode-token");
  });

  it("sets the legacy RouteProtection flag so pre-W3 pages accept the session", async () => {
    const provider = new TestModeAuthProvider();
    await provider.signInWithGoogle();
    expect(window.localStorage.getItem("ExpenditLoggedIn")).toBe("true");
  });

  it("sign-out clears both the session and the legacy flag", async () => {
    const provider = new TestModeAuthProvider();
    await provider.signInWithGoogle();
    await provider.signOut();
    expect(provider.currentUser()).toBeNull();
    expect(window.localStorage.getItem("ExpenditLoggedIn")).toBeNull();
    expect(await provider.getIdToken()).toBeNull();
  });
});

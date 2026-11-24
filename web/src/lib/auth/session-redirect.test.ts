import { afterEach, expect, it } from "vitest";
import {
  rememberSignInDestination,
  signInDestination,
} from "./session-redirect";

afterEach(() => {
  window.history.replaceState(null, "", "/");
  window.sessionStorage.clear();
});

it("retains the destination across the Google callback", () => {
  window.history.replaceState(
    null,
    "",
    "/signin?next=%2Fdashboard%2Ftransactions%3Fcategory%3Dtravel",
  );
  rememberSignInDestination();
  window.history.replaceState(null, "", "/auth/callback");
  expect(signInDestination()).toBe("/dashboard/transactions?category=travel");
  expect(signInDestination()).toBe("/dashboard");
});

it.each([
  "https://evil.example/dashboard",
  "//evil.example/dashboard",
  "/signin",
  "/auth/callback",
  "http://[",
])("rejects unsafe return destination %s", (next) => {
  window.history.replaceState(
    null,
    "",
    `/signin?${new URLSearchParams({ next })}`,
  );
  rememberSignInDestination();
  window.history.replaceState(null, "", "/auth/callback");
  expect(signInDestination()).toBe("/dashboard");
});

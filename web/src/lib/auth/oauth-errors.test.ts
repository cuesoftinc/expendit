import { describe, expect, it } from "vitest";
import {
  getOAuthRedirectErrorMessage,
  getSsoCompletionErrorMessage,
} from "./oauth-errors";
import { SsoExchangeError } from "./sso";

const query = (value: string) => new URLSearchParams(value);

describe("getOAuthRedirectErrorMessage", () => {
  it("returns null when the query carries no error", () => {
    expect(getOAuthRedirectErrorMessage(query(""))).toBeNull();
  });

  it("maps known codes case-insensitively", () => {
    expect(getOAuthRedirectErrorMessage(query("error=ACCESS_DENIED"))).toMatch(
      /cancelled/i,
    );
    expect(getOAuthRedirectErrorMessage(query("error=invalid_state"))).toMatch(
      /could not be verified/i,
    );
    expect(getOAuthRedirectErrorMessage(query("error=server_error"))).toMatch(
      /temporarily unavailable/i,
    );
  });

  it("never echoes provider text", () => {
    const message = getOAuthRedirectErrorMessage(
      query("error=weird&error_description=leaky+detail&message=more+detail"),
    );
    expect(message).toMatch(/could not be completed/i);
    expect(message).not.toMatch(/leaky|more detail/);
  });

  it("treats a description alone as an error", () => {
    expect(
      getOAuthRedirectErrorMessage(query("error_description=anything")),
    ).toMatch(/could not be completed/i);
  });
});

describe("getSsoCompletionErrorMessage", () => {
  it("explains a consumed or expired handoff", () => {
    expect(
      getSsoCompletionErrorMessage(
        new SsoExchangeError("x", 401, "handoff_invalid"),
      ),
    ).toMatch(/expired or was already used/i);
  });

  it("explains an unreachable API", () => {
    expect(getSsoCompletionErrorMessage(new SsoExchangeError("x", 0))).toMatch(
      /could not reach Expendit/i,
    );
  });

  it("reports server failures as unavailable", () => {
    expect(
      getSsoCompletionErrorMessage(new SsoExchangeError("x", 503)),
    ).toMatch(/temporarily unavailable/i);
  });

  it("falls back for anything else without leaking the message", () => {
    expect(getSsoCompletionErrorMessage(new Error("secret"))).not.toMatch(
      /secret/,
    );
  });
});

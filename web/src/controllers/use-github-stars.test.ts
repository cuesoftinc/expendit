import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { formatStars, useGithubStarsController } from "./use-github-stars";

describe("github stars controller (A8 runtime count + neutral fallback)", () => {
  it("TEST_MODE: never fetches; badge stays neutral (stars = null)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useGithubStarsController());
    // Effect ran; TEST_MODE short-circuits before any network call.
    await waitFor(() => expect(result.current.stars).toBeNull());
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("formatStars renders compact counts", () => {
    expect(formatStars(87)).toBe("87");
    expect(formatStars(1000)).toBe("1k");
    expect(formatStars(1234)).toBe("1.2k");
  });
});

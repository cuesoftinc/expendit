import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSavedViewsController } from "./use-saved-views";

describe("useSavedViewsController (B2 saved filter views)", () => {
  it("saves a named view per org, stripping pagination state", async () => {
    const { result } = renderHook(() => useSavedViewsController("org-x"));
    act(() => {
      result.current.save("June bank", {
        source: "bank",
        date_from: "2026-06-01",
        cursor: "txn-42",
        limit: 50,
      });
    });
    await waitFor(() => expect(result.current.views).toHaveLength(1));
    const view = result.current.views[0];
    expect(view.name).toBe("June bank");
    expect(view.filters.source).toBe("bank");
    expect(view.filters.cursor).toBeUndefined();
    expect(view.filters.limit).toBeUndefined();
    expect(
      JSON.parse(localStorage.getItem("expendit.saved-views.org-x") ?? "[]"),
    ).toHaveLength(1);
  });

  it("scopes views to the org and removes them", async () => {
    const first = renderHook(() => useSavedViewsController("org-a"));
    act(() => {
      first.result.current.save("A view", {});
    });
    const second = renderHook(() => useSavedViewsController("org-b"));
    await waitFor(() => expect(second.result.current.views).toHaveLength(0));

    const id = first.result.current.views[0].id;
    act(() => first.result.current.remove(id));
    await waitFor(() => expect(first.result.current.views).toHaveLength(0));
  });
});

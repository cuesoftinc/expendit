import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Banner from "./Banner";

describe("Banner (design.md §8.2, MI-13)", () => {
  it("renders info / warn / error tints", () => {
    const { rerender } = render(<Banner kind="info">T-30: VAT due</Banner>);
    expect(screen.getByRole("status")).toHaveClass("border-info/40");
    rerender(<Banner kind="warn">T-7: VAT due</Banner>);
    expect(screen.getByRole("status")).toHaveClass("border-warn/40");
    rerender(<Banner kind="error">Bank re-auth needed</Banner>);
    expect(screen.getByRole("status")).toHaveClass("border-expense/40");
  });

  it("carries an action slot and snooze-dismiss", async () => {
    const onDismiss = vi.fn();
    render(
      <Banner
        kind="warn"
        action={<button>Re-link</button>}
        onDismiss={onDismiss}
      >
        Re-auth required
      </Banner>,
    );
    expect(screen.getByRole("button", { name: "Re-link" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

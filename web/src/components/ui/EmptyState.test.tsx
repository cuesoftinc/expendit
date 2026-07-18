import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmptyState from "./EmptyState";

describe("EmptyState (design.md §8.2, MI-16)", () => {
  it("renders the one-line + primary action per kind", async () => {
    const onAction = vi.fn();
    render(<EmptyState kind="transactions" onAction={onAction} />);
    expect(screen.getByText("No transactions yet.")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Upload your first statement" }),
    );
    expect(onAction).toHaveBeenCalled();
  });

  it("covers all five kinds", () => {
    const kinds = [
      "transactions",
      "imports",
      "accounts",
      "ratios",
      "tax",
    ] as const;
    for (const kind of kinds) {
      const { container, unmount } = render(<EmptyState kind={kind} />);
      expect(container.querySelector(`[data-kind="${kind}"]`)).not.toBeNull();
      unmount();
    }
  });

  it("demo-data toggle is clearly badged synthetic", async () => {
    const onChange = vi.fn();
    render(
      <EmptyState
        kind="transactions"
        demoToggle={{ enabled: false, onChange }}
      />,
    );
    expect(screen.getByText("Synthetic")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

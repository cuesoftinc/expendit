import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Toast from "./Toast";

describe("Toast (design.md §8.2)", () => {
  it("renders kinds info/warn/error with data-kind", () => {
    const { rerender } = render(<Toast kind="info">Saved</Toast>);
    expect(screen.getByRole("status")).toHaveAttribute("data-kind", "info");
    rerender(<Toast kind="warn">Careful</Toast>);
    expect(screen.getByRole("status")).toHaveAttribute("data-kind", "warn");
    rerender(<Toast kind="error">Failed</Toast>);
    expect(screen.getByRole("status")).toHaveAttribute("data-kind", "error");
  });

  it("dismiss button fires onDismiss", async () => {
    const onDismiss = vi.fn();
    render(
      <Toast kind="info" onDismiss={onDismiss}>
        214 transactions found
      </Toast>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("renders without a dismiss affordance when transient-only", () => {
    render(<Toast>Copied</Toast>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("carries the Figma inline action slot", () => {
    render(
      <Toast kind="info" action={<button>Download</button>}>
        Report ready
      </Toast>,
    );
    expect(
      screen.getByRole("button", { name: "Download" }),
    ).toBeInTheDocument();
  });
});

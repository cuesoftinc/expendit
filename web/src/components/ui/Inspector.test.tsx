import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Inspector from "./Inspector";

describe("Inspector (design.md §8.2, MI-11)", () => {
  it("renders nothing while closed", () => {
    render(
      <Inspector open={false} onClose={() => undefined} title="Record">
        body
      </Inspector>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("open renders the right slide-in panel with body and footer", () => {
    render(
      <Inspector
        open
        onClose={() => undefined}
        title="Transaction"
        footer={<button>Save</button>}
      >
        Detail body
      </Inspector>,
    );
    const panel = screen.getByRole("dialog", { name: "Transaction" });
    expect(panel).toHaveClass("animate-slide-in-right", "max-w-[400px]");
    expect(screen.getByText("Detail body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("ESC closes (MI-11)", async () => {
    const onClose = vi.fn();
    render(
      <Inspector open onClose={onClose} title="Record">
        body
      </Inspector>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("overlay click closes", async () => {
    const onClose = vi.fn();
    render(
      <Inspector open onClose={onClose} title="Record">
        body
      </Inspector>,
    );
    await userEvent.click(screen.getByTestId("inspector-overlay"));
    expect(onClose).toHaveBeenCalled();
  });

  it("variants set data-variant; trace renders mono body", () => {
    const { rerender } = render(
      <Inspector open onClose={() => undefined} title="Why" variant="anomaly-explain">
        explanation
      </Inspector>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-variant",
      "anomaly-explain",
    );
    rerender(
      <Inspector open onClose={() => undefined} title="Trace" variant="trace">
        current_assets ÷ current_liabilities
      </Inspector>,
    );
    expect(
      screen.getByText("current_assets ÷ current_liabilities").closest(".font-mono"),
    ).not.toBeNull();
  });
});

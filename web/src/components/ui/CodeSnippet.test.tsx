import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import CodeSnippet from "./CodeSnippet";

describe("CodeSnippet (design.md §8.2b)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the mono block on the dark scope", () => {
    render(<CodeSnippet code="docker compose up -d" />);
    const block = screen.getByLabelText("Code snippet");
    expect(block).toHaveClass("font-mono", "text-[13px]");
    expect(block.closest('[data-theme="dark"]')).not.toBeNull();
    expect(screen.getByText("docker compose up -d")).toBeInTheDocument();
  });

  it("copy morphs idle → copied ✓ and resets", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.useFakeTimers();
    render(<CodeSnippet code="make run" />);
    const button = screen.getByRole("button", { name: "Copy code" });
    expect(button).toHaveAttribute("data-state", "idle");
    fireEvent.click(button);
    await act(async () => {
      // flush the clipboard promise
    });
    expect(writeText).toHaveBeenCalledWith("make run");
    expect(screen.getByRole("button", { name: "Copied" })).toHaveAttribute(
      "data-state",
      "copied",
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole("button", { name: "Copy code" })).toHaveAttribute(
      "data-state",
      "idle",
    );
  });
});

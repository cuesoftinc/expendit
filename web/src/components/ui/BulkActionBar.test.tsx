import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulkActionBar from "./BulkActionBar";

describe("BulkActionBar (design.md §8.2b)", () => {
  it("hidden at zero selection", () => {
    render(<BulkActionBar selectedCount={0} />);
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("visible with count + slide-in and fires actions", async () => {
    const onRecategorize = vi.fn();
    const onExport = vi.fn();
    const onClear = vi.fn();
    render(
      <BulkActionBar
        selectedCount={12}
        onRecategorize={onRecategorize}
        onExport={onExport}
        onClear={onClear}
      />,
    );
    const bar = screen.getByRole("toolbar", { name: "Bulk actions" });
    expect(bar).toHaveClass("animate-slide-in-up", "motion-reduce:animate-none");
    expect(screen.getByText("12 selected")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Re-categorize/ }));
    await userEvent.click(screen.getByRole("button", { name: /Export/ }));
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onRecategorize).toHaveBeenCalled();
    expect(onExport).toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
  });
});

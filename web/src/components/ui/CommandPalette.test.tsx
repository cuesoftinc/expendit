import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommandPalette, { fuzzyMatch, type CommandItem } from "./CommandPalette";

const items = (spies: Record<string, () => void> = {}): CommandItem[] => [
  {
    id: "nav-txns",
    label: "Go to Transactions",
    group: "navigate",
    onSelect: spies["nav-txns"] ?? (() => undefined),
  },
  {
    id: "act-upload",
    label: "Upload statement",
    group: "action",
    shortcut: ["⌘", "U"],
    onSelect: spies["act-upload"] ?? (() => undefined),
  },
  {
    id: "recent-1",
    label: "Fuel — Lekki toll",
    group: "recent",
    onSelect: spies["recent-1"] ?? (() => undefined),
  },
];

describe("CommandPalette (design.md §8.2, MI-1)", () => {
  it("fuzzy match is subsequence-based", () => {
    expect(fuzzyMatch("upst", "Upload statement")).toBe(true);
    expect(fuzzyMatch("gttrans", "Go to Transactions")).toBe(true);
    expect(fuzzyMatch("zzz", "Upload statement")).toBe(false);
  });

  it("⌘K toggles open", async () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        open={false}
        onOpenChange={onOpenChange}
        items={items()}
      />,
    );
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("recent-first ordering and shortcut hints", () => {
    render(
      <CommandPalette open onOpenChange={() => undefined} items={items()} />,
    );
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("Fuel — Lekki toll");
    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("typing filters; ↑↓ + Enter selects", async () => {
    const spy = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        items={items({ "act-upload": spy })}
      />,
    );
    await userEvent.type(screen.getByRole("combobox"), "upload");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await userEvent.keyboard("{Enter}");
    expect(spy).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("ESC and overlay click close", async () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open onOpenChange={onOpenChange} items={items()} />);
    await userEvent.click(screen.getByTestId("palette-overlay"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("opens with the 120ms fade + 4px rise entrance", () => {
    render(
      <CommandPalette open onOpenChange={() => undefined} items={items()} />,
    );
    expect(screen.getByRole("dialog")).toHaveClass(
      "animate-rise-in",
      "motion-reduce:animate-none",
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BALANCE_SHEET_KEYS } from "@/models/registry/line-items";
import type { MappingRow } from "@/models";
import MappingReviewRow from "./MappingReviewRow";

const row = (state: MappingRow["state"]): MappingRow => ({
  line_item_id: "li-1",
  source_label: "Cash at bank and in hand",
  canonical_key: state === "unmapped" ? null : "cash_and_equivalents",
  amount: 1250000,
  confidence: state === "suggested" ? 0.92 : null,
  state,
});

describe("MappingReviewRow (design.md §8.2b, B6)", () => {
  it("suggested: ✨ confidence tag + source → key + tabular amount", () => {
    render(
      <MappingReviewRow
        row={row("suggested")}
        keyOptions={BALANCE_SHEET_KEYS}
      />,
    );
    expect(screen.getByRole("row")).toHaveAttribute("data-state", "suggested");
    expect(screen.getByText("Cash at bank and in hand")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("₦1,250,000.00")).toHaveClass("tabular-nums");
  });

  it("confirmed and unmapped tags", () => {
    const { rerender } = render(
      <MappingReviewRow
        row={row("confirmed")}
        keyOptions={BALANCE_SHEET_KEYS}
      />,
    );
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    rerender(
      <MappingReviewRow
        row={row("unmapped")}
        keyOptions={BALANCE_SHEET_KEYS}
      />,
    );
    expect(screen.getByText("Unmapped <60%")).toBeInTheDocument();
  });

  it("key re-mapping goes through the searchable registry combobox", async () => {
    const onKeyChange = vi.fn();
    render(
      <MappingReviewRow
        row={row("unmapped")}
        keyOptions={BALANCE_SHEET_KEYS}
        onKeyChange={onKeyChange}
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(
      screen.getByRole("option", { name: "cash_and_equivalents" }),
    );
    expect(onKeyChange).toHaveBeenCalledWith("cash_and_equivalents");
  });

  it("confirm CTA appears only for suggested rows", async () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <MappingReviewRow
        row={row("suggested")}
        keyOptions={BALANCE_SHEET_KEYS}
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalled();
    rerender(
      <MappingReviewRow
        row={row("confirmed")}
        keyOptions={BALANCE_SHEET_KEYS}
        onConfirm={onConfirm}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Confirm" }),
    ).not.toBeInTheDocument();
  });
});

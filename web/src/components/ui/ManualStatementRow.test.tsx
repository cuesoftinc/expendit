import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BALANCE_SHEET_KEYS } from "@/models/registry/line-items";
import ManualStatementRow from "./ManualStatementRow";

describe("ManualStatementRow (design.md §8.2)", () => {
  it("offers the closed canonical-key vocabulary in a searchable combobox", async () => {
    const onKeyChange = vi.fn();
    render(
      <ManualStatementRow
        keyOptions={BALANCE_SHEET_KEYS}
        canonicalKey={null}
        amount=""
        onKeyChange={onKeyChange}
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getAllByRole("option")).toHaveLength(
      BALANCE_SHEET_KEYS.length,
    );
    await userEvent.click(
      screen.getByRole("option", { name: BALANCE_SHEET_KEYS[0] }),
    );
    expect(onKeyChange).toHaveBeenCalledWith(BALANCE_SHEET_KEYS[0]);
  });

  it("amount input is right-aligned tabular and editable", async () => {
    const onAmountChange = vi.fn();
    render(
      <ManualStatementRow
        keyOptions={BALANCE_SHEET_KEYS}
        canonicalKey={BALANCE_SHEET_KEYS[0]}
        amount=""
        onAmountChange={onAmountChange}
      />,
    );
    const amount = screen.getByLabelText("Amount");
    expect(amount).toHaveClass("tabular-nums", "text-right");
    await userEvent.type(amount, "5");
    expect(onAmountChange).toHaveBeenCalledWith("5");
  });

  it("error state surfaces the identity-check message", () => {
    render(
      <ManualStatementRow
        keyOptions={BALANCE_SHEET_KEYS}
        canonicalKey={BALANCE_SHEET_KEYS[0]}
        amount="100"
        error="Assets must equal liabilities + equity"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Assets must equal liabilities + equity",
    );
  });

  it("remove affordance fires onRemove", async () => {
    const onRemove = vi.fn();
    render(
      <ManualStatementRow
        keyOptions={BALANCE_SHEET_KEYS}
        canonicalKey={null}
        amount=""
        onRemove={onRemove}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove row" }));
    expect(onRemove).toHaveBeenCalled();
  });
});

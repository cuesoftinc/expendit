import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MoneyCell from "./MoneyCell";

describe("MoneyCell (design.md §3/§8.2)", () => {
  it("formats money with sign + direction color for income", () => {
    render(<MoneyCell amount={1240300.5} direction="income" />);
    const cell = screen
      .getByText("+₦1,240,300.50")
      .closest("span[data-direction]");
    expect(cell).toHaveAttribute("data-direction", "income");
    expect(cell).toHaveClass("text-income", "tabular-nums");
  });

  it("expense renders a minus sign and expense color", () => {
    render(<MoneyCell amount={500} direction="expense" />);
    const cell = screen.getByText("−₦500.00").closest("span[data-direction]");
    expect(cell).toHaveClass("text-expense");
  });

  it("never colors zero and drops the direction icon", () => {
    const { container } = render(<MoneyCell amount={0} direction="zero" />);
    const cell = screen.getByText("₦0.00").closest("span[data-direction]");
    expect(cell).toHaveClass("text-text");
    expect(cell).not.toHaveClass("text-income");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("stat size renders the large ramp and other currencies", () => {
    render(
      <MoneyCell amount={99.9} direction="income" size="stat" currency="USD" />,
    );
    const cell = screen.getByText("+$99.90").closest("span[data-direction]");
    // Figma stat ramp: Display/32 Bold.
    expect(cell).toHaveClass("text-[32px]", "font-bold");
  });
});

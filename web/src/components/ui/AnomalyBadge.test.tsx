import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnomalyBadge from "./AnomalyBadge";

describe("AnomalyBadge (design.md §8.2, MI-5)", () => {
  it("labels each anomaly type accessibly", () => {
    const { rerender } = render(
      <AnomalyBadge type="large_transaction" severity="warn" />,
    );
    expect(
      screen.getByRole("button", { name: "Large transaction (warn)" }),
    ).toBeInTheDocument();
    rerender(<AnomalyBadge type="duplicate_charge" severity="info" />);
    expect(
      screen.getByRole("button", { name: "Possible duplicate (info)" }),
    ).toBeInTheDocument();
  });

  it("tint keys off the anomaly type (Figma: spike = expense)", () => {
    const { rerender } = render(
      <AnomalyBadge type="spending_spike" severity="warn" />,
    );
    expect(screen.getByRole("button")).toHaveClass("text-expense");
    rerender(<AnomalyBadge type="abnormal_category" severity="info" />);
    expect(screen.getByRole("button")).toHaveClass("text-info");
    rerender(<AnomalyBadge type="large_transaction" severity="warn" />);
    expect(screen.getByRole("button")).toHaveClass("text-warn");
  });

  it("inline shows the Figma short label", () => {
    render(<AnomalyBadge type="large_transaction" severity="warn" />);
    expect(screen.getByText("Large txn")).toBeInTheDocument();
  });

  it("feed variant renders title, description and timestamp", () => {
    render(
      <AnomalyBadge
        type="spending_spike"
        severity="warn"
        variant="feed"
        description="Dining out is up 62% vs last month"
        timestamp="2h"
      />,
    );
    expect(screen.getByText("Spending spike")).toBeInTheDocument();
    expect(
      screen.getByText("Dining out is up 62% vs last month"),
    ).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
  });

  it("MI-5 pulse class applies on first render only when asked", () => {
    render(<AnomalyBadge type="spending_spike" severity="warn" pulse />);
    expect(screen.getByRole("button")).toHaveClass("animate-pulse");
  });

  it("click routes to the inspector explanation", async () => {
    const onClick = vi.fn();
    render(
      <AnomalyBadge
        type="large_transaction"
        severity="warn"
        onClick={onClick}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});

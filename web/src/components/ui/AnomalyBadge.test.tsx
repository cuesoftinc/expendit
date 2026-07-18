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
      screen.getByRole("button", { name: "Possible duplicate charge (info)" }),
    ).toBeInTheDocument();
  });

  it("severity picks the tint", () => {
    const { rerender } = render(
      <AnomalyBadge type="spending_spike" severity="warn" />,
    );
    expect(screen.getByRole("button")).toHaveClass("text-warn");
    rerender(<AnomalyBadge type="spending_spike" severity="info" />);
    expect(screen.getByRole("button")).toHaveClass("text-info");
  });

  it("feed variant shows the label text; inline is icon-only", () => {
    const { rerender } = render(
      <AnomalyBadge type="abnormal_category" severity="warn" variant="feed" />,
    );
    expect(screen.getByText("Abnormal for category")).toBeInTheDocument();
    rerender(
      <AnomalyBadge
        type="abnormal_category"
        severity="warn"
        variant="inline"
      />,
    );
    expect(screen.queryByText("Abnormal for category")).not.toBeInTheDocument();
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

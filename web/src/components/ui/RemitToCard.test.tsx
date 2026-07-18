import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import RemitToCard from "./RemitToCard";

const lirs = {
  code: "LIRS",
  name: "Lagos State Internal Revenue Service",
  payment_channels: ["eTax portal", "Bank branch"],
};

describe("RemitToCard (design.md §8.2)", () => {
  it("renders authority, amount due, deadline, and channels", () => {
    render(
      <RemitToCard
        kind="pit"
        authority={lirs}
        amountDue={342500.75}
        dueDate="2027-03-31"
      />,
    );
    expect(
      screen.getByText(/Remit to Lagos State Internal Revenue Service/),
    ).toBeInTheDocument();
    expect(screen.getByText("(LIRS)")).toBeInTheDocument();
    expect(screen.getByText("₦342,500.75")).toHaveClass("tabular-nums");
    expect(screen.getByText("due 2027-03-31")).toBeInTheDocument();
    expect(screen.getByText("eTax portal")).toBeInTheDocument();
    expect(screen.getByText("Bank branch")).toBeInTheDocument();
  });

  it("covers pit / cit / vat kinds", () => {
    const kinds = [
      ["pit", "Personal income tax"],
      ["cit", "Company income tax"],
      ["vat", "VAT"],
    ] as const;
    for (const [kind, label] of kinds) {
      const { container, unmount } = render(
        <RemitToCard
          kind={kind}
          authority={lirs}
          amountDue={1}
          dueDate="2027-01-01"
        />,
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(container.querySelector(`[data-kind="${kind}"]`)).not.toBeNull();
      unmount();
    }
  });
});

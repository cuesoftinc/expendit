import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MonthlyFlowReport } from "@/models";
import { OverviewStats } from "./OverviewStats";

vi.mock("@/components/ui/StatCard", () => ({
  default: ({ label }: { label: string }) => <div>{label}</div>,
}));

const flows: MonthlyFlowReport = {
  currency: "NGN",
  items: [
    { month: "2026-06", income: 100_000, expense: 40_000 },
    { month: "2026-07", income: 120_000, expense: 50_000 },
  ],
  runway: { months: null, na_reason: "n/a — runway tracks company orgs" },
};

describe("OverviewStats", () => {
  it("omits runway for personal organizations and uses three desktop columns", () => {
    const { container } = render(
      <OverviewStats flows={flows} currency="NGN" orgKind="personal" />,
    );

    expect(screen.queryByText("Runway")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass("lg:grid-cols-3");
  });

  it("keeps runway for company organizations and uses four desktop columns", () => {
    const { container } = render(
      <OverviewStats flows={flows} currency="NGN" orgKind="company" />,
    );

    expect(screen.getByText("Runway")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("lg:grid-cols-4");
  });
});

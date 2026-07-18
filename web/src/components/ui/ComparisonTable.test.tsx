import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ComparisonTable, { type ComparisonRow } from "./ComparisonTable";

const rows: ComparisonRow[] = [
  {
    feature: "AI categorization",
    cloud: { kind: "check" },
    selfHost: { kind: "check" },
  },
  {
    feature: "Managed upgrades",
    cloud: { kind: "check" },
    selfHost: { kind: "x" },
  },
  {
    feature: "Price",
    cloud: { kind: "text", text: "Announced at GA" },
    selfHost: { kind: "text", text: "Free forever" },
  },
];

describe("ComparisonTable (design.md §8.2b)", () => {
  it("renders Cloud vs Self-host columns with check/x/text cells", () => {
    render(<ComparisonTable rows={rows} />);
    expect(
      screen.getByRole("columnheader", { name: "Cloud" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Self-host" }),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText("Included")).toHaveLength(3);
    expect(screen.getByLabelText("Not included")).toBeInTheDocument();
    expect(screen.getByText("Announced at GA")).toBeInTheDocument();
    expect(screen.getByText("Free forever")).toBeInTheDocument();
  });

  it("carries the canonical pricing caption (marketing accuracy)", () => {
    render(<ComparisonTable rows={rows} />);
    expect(
      screen.getByText(
        "Cloud pricing is announced at GA — self-hosting is free forever",
      ),
    ).toBeInTheDocument();
  });

  it("per-column CTA footer row", () => {
    render(
      <ComparisonTable
        rows={rows}
        cloudCta={<button>Try Cloud</button>}
        selfHostCta={<button>Read the docs</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Try Cloud" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Read the docs" }),
    ).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import RatioGauge from "./RatioGauge";

describe("RatioGauge (design.md §8.2, MI-8)", () => {
  it("renders value, label, and status color", () => {
    render(
      <RatioGauge
        label="Current ratio"
        value={1.85}
        display="1.85"
        status="healthy"
        min={0}
        max={3}
      />,
    );
    // Figma: the value reads in body text color; status colors the arc.
    expect(screen.getByText("1.85")).toHaveClass("text-text", "tabular-nums");
    expect(screen.getByText("Current ratio")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Current ratio: 1.85" }),
    ).toBeInTheDocument();
  });

  it("covers healthy / warning / critical statuses", () => {
    const statuses = ["healthy", "warning", "critical"] as const;
    for (const status of statuses) {
      const { container, unmount } = render(
        <RatioGauge label="Quick ratio" value={1} status={status} />,
      );
      expect(
        container.querySelector(`[data-status="${status}"]`),
      ).not.toBeNull();
      unmount();
    }
  });

  it("n-a renders the missing-input reason with the band off", () => {
    render(
      <RatioGauge
        label="Debt to equity"
        value={null}
        status="na"
        naReason="n/a — negative equity"
        band={{ from: 1, to: 2 }}
      />,
    );
    // Figma n-a: dash in the value slot + reason caption.
    expect(screen.getByTestId("gauge-na-dash")).toBeInTheDocument();
    expect(screen.getByText("n/a — negative equity")).toBeInTheDocument();
    // As built: n-a ships band=off only.
    expect(screen.queryByTestId("gauge-band")).not.toBeInTheDocument();
  });

  it("benchmark band renders (fades in after the needle)", () => {
    render(
      <RatioGauge
        label="Current ratio"
        value={1.85}
        status="healthy"
        band={{ from: 1, to: 2 }}
      />,
    );
    const band = screen.getByTestId("gauge-band");
    expect(band).toHaveClass("animate-fade-in", "motion-reduce:animate-none");
  });

  it("MI-8: formula tooltip trigger wraps the gauge; arc eases 600ms", () => {
    render(
      <RatioGauge
        label="Current ratio"
        value={1.85}
        status="healthy"
        formula="Current ratio = current assets ÷ current liabilities"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Current ratio formula" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("gauge-value-arc")).toHaveClass(
      "duration-[600ms]",
      "motion-reduce:transition-none",
    );
  });

  it("renders the Figma delta line colored by sign", () => {
    render(
      <RatioGauge
        label="Current ratio"
        value={1.82}
        status="healthy"
        delta={0.21}
        deltaCaption="vs Q1"
      />,
    );
    const delta = screen.getByTestId("gauge-delta");
    expect(delta).toHaveTextContent("+0.21 vs Q1");
    expect(delta).toHaveClass("text-income");
  });

  it("formats a computed delta to 2dp — never the raw float — keeping the sign", () => {
    render(
      <RatioGauge
        label="Current ratio"
        value={3.05}
        status="healthy"
        delta={1.2254901960784315}
        deltaCaption="vs FY2024"
      />,
    );
    expect(screen.getByTestId("gauge-delta")).toHaveTextContent(
      "+1.23 vs FY2024",
    );

    render(
      <RatioGauge
        label="Quick ratio"
        value={0.9}
        status="warning"
        delta={-0.5}
        deltaCaption="vs FY2024"
      />,
    );
    const negative = screen.getAllByTestId("gauge-delta")[1];
    expect(negative).toHaveTextContent("−0.50 vs FY2024");
    expect(negative).toHaveClass("text-expense");
  });

  it("deltaDisplay keeps the metric's own style (days stay integer)", () => {
    render(
      <RatioGauge
        label="Receivables days"
        value={38}
        status="healthy"
        delta={-3.2254901960784315}
        deltaDisplay="3 days"
        deltaCaption="vs FY2024"
      />,
    );
    expect(screen.getByTestId("gauge-delta")).toHaveTextContent(
      "−3 days vs FY2024",
    );
  });
});

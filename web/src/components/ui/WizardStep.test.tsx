import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressBar from "./ProgressBar";
import WizardStep from "./WizardStep";

describe("WizardStep (design.md §8.2b, MI-9/MI-10)", () => {
  it("covers todo / current / done / error states", () => {
    const states = ["todo", "current", "done", "error"] as const;
    for (const state of states) {
      const { container, unmount } = render(
        <WizardStep state={state} label="Connect" index={1} />,
      );
      expect(container.querySelector(`[data-state="${state}"]`)).not.toBeNull();
      unmount();
    }
  });

  it("current step is aria-current", () => {
    render(<WizardStep state="current" label="Consent" index={2} />);
    expect(
      screen.getByText("Consent").closest("[aria-current]"),
    ).toHaveAttribute("aria-current", "step");
  });

  it("with-progress slot renders the live counter (MI-9)", () => {
    render(
      <WizardStep
        state="current"
        label="Syncing"
        index={3}
        orientation="horizontal"
        progress={<ProgressBar value={40} label="Synced 124 transactions" />}
      />,
    );
    expect(screen.getByTestId("wizard-step-progress")).toBeInTheDocument();
    expect(screen.getByText("Synced 124 transactions")).toBeInTheDocument();
  });
});

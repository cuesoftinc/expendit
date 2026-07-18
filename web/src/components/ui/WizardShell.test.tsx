import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import WizardShell from "./WizardShell";
import WizardStep from "./WizardStep";

describe("WizardShell (design.md §8.1 chrome)", () => {
  it("renders step rail, content, and sticky summary", () => {
    render(
      <WizardShell
        steps={
          <>
            <WizardStep state="done" label="Profile" index={1} />
            <WizardStep state="current" label="Data review" index={2} />
          </>
        }
        summary={<p>PIT · 2026</p>}
      >
        <p>Step content</p>
      </WizardShell>,
    );
    expect(
      screen.getByRole("navigation", { name: "Wizard steps" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step content")).toBeInTheDocument();
    expect(screen.getByText("PIT · 2026").closest(".sticky")).not.toBeNull();
  });

  it("summary panel is optional", () => {
    render(
      <WizardShell steps={<WizardStep state="current" label="A" index={1} />}>
        body
      </WizardShell>,
    );
    expect(screen.queryByLabelText("Summary")).not.toBeInTheDocument();
  });
});

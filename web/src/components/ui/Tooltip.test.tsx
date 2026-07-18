import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Tooltip from "./Tooltip";

describe("Tooltip (design.md §8.2b)", () => {
  it("shows text content on focus", async () => {
    render(
      <Tooltip content="Edit category">
        <button>e</button>
      </Tooltip>,
    );
    await userEvent.tab();
    const tips = await screen.findAllByText("Edit category");
    expect(tips.length).toBeGreaterThan(0);
  });

  it("formula kind renders a mono body (MI-8)", async () => {
    render(
      <Tooltip
        kind="formula"
        content="Current ratio = current assets ÷ current liabilities"
      >
        <button>gauge</button>
      </Tooltip>,
    );
    await userEvent.tab();
    const tips = await screen.findAllByText(/Current ratio =/);
    expect(
      tips.some((tip) => tip.closest(".font-mono") !== null),
    ).toBe(true);
  });
});

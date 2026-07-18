import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Accordion from "./Accordion";

const items = [
  {
    id: "one",
    title: "How we got this",
    content: "net_income ÷ revenue",
    variant: "trace" as const,
  },
  { id: "two", title: "Plain section", content: "Body text" },
];

describe("Accordion (design.md §8.2b, MI-8/MI-10)", () => {
  it("opens and closes on trigger click", async () => {
    render(<Accordion items={items} />);
    expect(screen.queryByText("Body text")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Plain section" }),
    );
    expect(screen.getByText("Body text")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Plain section" }),
    );
    expect(screen.queryByText("Body text")).not.toBeInTheDocument();
  });

  it("trace variant renders a mono formula body", async () => {
    render(<Accordion items={items} defaultOpen={["one"]} />);
    const body = screen.getByText("net_income ÷ revenue");
    expect(body.closest(".font-mono")).not.toBeNull();
  });
});

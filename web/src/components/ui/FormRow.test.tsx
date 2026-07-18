import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FormRow from "./FormRow";
import Input from "./Input";

describe("FormRow (design.md §8.2)", () => {
  it("wires the label to the control id", () => {
    render(
      <FormRow label="TIN" helper="Your tax identification number">
        {(id) => <input id={id} />}
      </FormRow>,
    );
    expect(screen.getByLabelText("TIN")).toBeInTheDocument();
    expect(
      screen.getByText("Your tax identification number"),
    ).toBeInTheDocument();
  });

  it("error replaces helper and sets the row state", () => {
    render(
      <FormRow label="State" helper="Resolves your State IRS" error="Required">
        {(id) => <input id={id} />}
      </FormRow>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.queryByText("Resolves your State IRS")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/State/).closest("[data-state]")).toHaveAttribute(
      "data-state",
      "error",
    );
  });

  it("required marks the label; disabled dims the row", () => {
    render(
      <FormRow label="RC number" required disabled>
        {(id) => <Input id={id} name="rc" disabled />}
      </FormRow>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/RC number/).closest("[data-state]"),
    ).toHaveAttribute("data-state", "disabled");
  });
});

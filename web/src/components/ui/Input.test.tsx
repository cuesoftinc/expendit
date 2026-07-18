import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "./Input";

describe("Input (design.md §8.2)", () => {
  it("renders a labelled text input", async () => {
    render(<Input label="Description" name="description" />);
    const input = screen.getByLabelText("Description");
    await userEvent.type(input, "Fuel");
    expect(input).toHaveValue("Fuel");
  });

  it("search type renders the search affordance", () => {
    render(<Input type="search" placeholder="Search transactions" />);
    const input = screen.getByPlaceholderText("Search transactions");
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveClass("pl-9");
  });

  it("error state sets aria-invalid and shows the message", () => {
    render(<Input label="Amount" name="amount" error="Amount is required" />);
    expect(screen.getByLabelText("Amount")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Amount is required");
  });

  it("disabled state blocks input", () => {
    render(<Input label="TIN" name="tin" disabled />);
    expect(screen.getByLabelText("TIN")).toBeDisabled();
  });
});

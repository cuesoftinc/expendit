import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Select, { type SelectOption } from "./Select";

const options: SelectOption[] = [
  { value: "cash", label: "cash_and_equivalents", mono: true },
  { value: "recv", label: "accounts_receivable", mono: true },
  { value: "inv", label: "inventory", mono: true },
];

describe("Select/Menu (design.md §8.2b)", () => {
  it("opens on click and commits an option", async () => {
    const onValueChange = vi.fn();
    render(
      <Select options={options} value={null} onValueChange={onValueChange} />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("option", { name: /accounts_receivable/ }),
    );
    expect(onValueChange).toHaveBeenCalledWith("recv");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keyboard: ArrowDown + Enter selects", async () => {
    const onValueChange = vi.fn();
    render(
      <Select options={options} value="cash" onValueChange={onValueChange} />,
    );
    const trigger = screen.getByRole("combobox");
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("recv");
  });

  it("searchable combobox filters options", async () => {
    render(<Select options={options} value={null} searchable />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(screen.getByPlaceholderText("Search"), "invent");
    expect(
      screen.getByRole("option", { name: /inventory/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /cash_and_equivalents/ }),
    ).not.toBeInTheDocument();
  });

  it("error and disabled states", () => {
    const { rerender } = render(
      <Select options={options} value={null} error="Required" />,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    rerender(<Select options={options} value={null} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("marks the selected option", async () => {
    render(<Select options={options} value="inv" />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: /inventory/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

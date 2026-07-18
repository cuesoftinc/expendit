import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryChip, { type CategoryOption } from "./CategoryChip";

const groceries: CategoryOption = {
  id: "cat-1",
  name: "Groceries",
  color: "#1B7F4B",
};
const options: CategoryOption[] = [
  groceries,
  { id: "cat-2", name: "Transport", color: "#2456D6" },
];

describe("CategoryChip (design.md §8.2, MI-4)", () => {
  it("renders the color dot and label", () => {
    render(<CategoryChip category={groceries} />);
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByTestId("category-dot")).toHaveStyle({
      backgroundColor: "#1B7F4B",
    });
  });

  it("AI-suggested chips carry the ✨ mark until confirmed", () => {
    const { rerender } = render(
      <CategoryChip category={groceries} aiSuggested />,
    );
    expect(screen.getByTestId("category-ai-mark")).toBeInTheDocument();
    rerender(<CategoryChip category={groceries} aiSuggested={false} />);
    expect(screen.queryByTestId("category-ai-mark")).not.toBeInTheDocument();
  });

  it("editing opens the registry-only combobox and commits a selection", async () => {
    const onSelect = vi.fn();
    render(
      <CategoryChip
        category={groceries}
        options={options}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: /Transport/ }));
    expect(onSelect).toHaveBeenCalledWith("cat-2");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("combobox search filters registry categories", async () => {
    render(
      <CategoryChip
        category={groceries}
        options={options}
        onSelect={() => undefined}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    await userEvent.type(
      screen.getByPlaceholderText("Search categories"),
      "zzz",
    );
    expect(screen.getByText("No matching category")).toBeInTheDocument();
  });

  it("without options/onSelect the chip is not editable", () => {
    render(<CategoryChip category={groceries} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

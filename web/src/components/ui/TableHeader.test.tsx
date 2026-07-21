import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TableHeader, { type TableColumn } from "./TableHeader";

const columns: TableColumn[] = [
  { id: "date", label: "Date", sortable: true, widthClass: "w-24" },
  { id: "description", label: "Description" },
  { id: "amount", label: "Amount", numeric: true, sortable: true },
];

// Real <thead> needs a table context (semantic-HTML directive).
const InTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <table>{children}</table>
);

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: InTable });

describe("TableHeader (design.md §8.2b)", () => {
  it("renders columns; numeric columns right-align", () => {
    render(<TableHeader columns={columns} />);
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Amount").closest("th")).toHaveClass("text-right");
  });

  it("sort cycles none → asc → desc → none", async () => {
    const onSortChange = vi.fn();
    const { rerender } = render(
      <TableHeader columns={columns} sort={null} onSortChange={onSortChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Date" }));
    expect(onSortChange).toHaveBeenLastCalledWith("date", "asc");
    rerender(
      <TableHeader
        columns={columns}
        sort={{ columnId: "date", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );
    expect(screen.getByText("Date").closest("th")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await userEvent.click(screen.getByRole("button", { name: "Date" }));
    expect(onSortChange).toHaveBeenLastCalledWith("date", "desc");
    rerender(
      <TableHeader
        columns={columns}
        sort={{ columnId: "date", direction: "desc" }}
        onSortChange={onSortChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Date" }));
    expect(onSortChange).toHaveBeenLastCalledWith("date", "none");
  });

  it("density switches header height; sticky opts in", () => {
    const { rerender } = render(
      <TableHeader columns={columns} density="compact" sticky />,
    );
    const row = screen.getByRole("row");
    expect(row).toHaveClass("h-[32px]", "sticky");
    rerender(<TableHeader columns={columns} density="comfortable" />);
    expect(screen.getByRole("row")).toHaveClass("h-[44px]");
  });

  it("select-all slot wires the checkbox and names it (a11y audit)", async () => {
    const onCheckedChange = vi.fn();
    render(
      <TableHeader
        columns={columns}
        selectAll={{
          checked: "indeterminate",
          onCheckedChange,
          label: "Select all transactions",
        }}
      />,
    );
    const box = screen.getByRole("checkbox", {
      name: "Select all transactions",
    });
    expect(box).toHaveAttribute("aria-checked", "mixed");
    await userEvent.click(box);
    expect(onCheckedChange).toHaveBeenCalled();
    // The th itself carries the name too (axe `empty-table-header`:
    // the checkbox's aria-label doesn't name the cell). Regex: the
    // cell's name concatenates the sr-only text with the checkbox's.
    expect(
      screen.getByRole("columnheader", { name: /Select all transactions/ }),
    ).toBeInTheDocument();
  });

  it("selectHeader renders an sr-only named th for select-cell rows", () => {
    // axe `td-has-header` class (2026-07-21 audit): demo/read-only tables
    // pair TxnTableRow select cells with a header that had no matching th.
    render(<TableHeader columns={columns} selectHeader="Select" />);
    const th = screen.getByRole("columnheader", { name: "Select" });
    expect(th).toHaveClass("w-4");
  });

  it("srOnly columns name the th without visible text (actions column)", () => {
    render(
      <TableHeader
        columns={[
          ...columns,
          { id: "actions", label: "Actions", srOnly: true },
        ]}
      />,
    );
    const th = screen.getByRole("columnheader", { name: "Actions" });
    expect(th.querySelector("span")).toHaveClass("sr-only");
  });
});

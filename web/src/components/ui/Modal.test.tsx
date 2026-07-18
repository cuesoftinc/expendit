import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./Modal";

describe("Modal/Dialog (design.md §8.2b)", () => {
  it("renders title, description, body, and closes via the X", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal
        open
        onOpenChange={onOpenChange}
        title="Edit member"
        description="Change role"
      >
        <p>Body content</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit member")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("ESC closes (Radix semantics)", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="T">
        x
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("MI-15 danger: confirm stays disabled until the phrase is typed", async () => {
    const onConfirm = vi.fn();
    render(
      <Modal
        open
        onOpenChange={() => undefined}
        title="Purge all data"
        variant="danger"
        confirmPhrase="personal-org"
        confirmLabel="Purge"
        onConfirm={onConfirm}
      >
        This cannot be undone.
      </Modal>,
    );
    const confirm = screen.getByRole("button", { name: "Purge" });
    expect(confirm).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText('Type "personal-org" to confirm'),
      "personal-org",
    );
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalled();
  });

  it("sheet variant renders right-anchored chrome", () => {
    render(
      <Modal open onOpenChange={() => undefined} title="Sheet" variant="sheet">
        x
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("right-0");
  });
});

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

  it("MI-15 danger: typed phrase alone does not fire — the 5s arming countdown must also elapse", async () => {
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
    // Countdown pill renders while armed (Figma "Purge everything 5s");
    // the elapse→enabled path is covered by the Button danger-armed test.
    const confirm = screen.getByRole("button", { name: /Purge/ });
    expect(confirm).toBeDisabled();
    expect(screen.getByTestId("button-countdown")).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Type "personal-org" to confirm'),
      "personal-org",
    );
    expect(confirm).toBeDisabled(); // still inside the arming window
    expect(onConfirm).not.toHaveBeenCalled();
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

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import CategoryEditor, { PRESET_COLORS } from "./CategoryEditor";

it("creates through the shared name, type and color editor", async () => {
  const create = vi.fn().mockImplementation(async (input) => ({
    ...input,
    id: "cat-new",
    org_id: "org",
  }));
  const saved = vi.fn();
  const close = vi.fn();
  render(
    <CategoryEditor
      initialDraft={{ name: "", type: "income", color: PRESET_COLORS[0] }}
      createCategory={create}
      onSaved={saved}
      onClose={close}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Create" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
  expect(create).not.toHaveBeenCalled();
  await userEvent.type(
    screen.getByRole("textbox", { name: "Name" }),
    " Consulting ",
  );
  await userEvent.click(screen.getByRole("radio", { name: "Expense" }));
  await userEvent.click(screen.getByRole("button", { name: "Create" }));
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Consulting",
      type: "expense",
      color: PRESET_COLORS[0],
    }),
  );
  expect(saved).toHaveBeenCalledWith(
    expect.objectContaining({ id: "cat-new" }),
  );
  expect(close).toHaveBeenCalled();
});

it("keeps the editor open on failure and saves existing categories through update", async () => {
  const update = vi
    .fn()
    .mockRejectedValueOnce(new Error("Save unavailable"))
    .mockResolvedValue({ id: "cat-existing" });
  const close = vi.fn();
  render(
    <CategoryEditor
      initialDraft={{
        id: "cat-existing",
        name: "Tools",
        type: "expense",
        color: PRESET_COLORS[0],
      }}
      createCategory={vi.fn()}
      updateCategory={update}
      onSaved={vi.fn()}
      onClose={close}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Save unavailable");
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox")).toHaveValue("Tools");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(update).toHaveBeenCalledWith("cat-existing", {
    name: "Tools",
    color: PRESET_COLORS[0],
  });
  expect(close).toHaveBeenCalled();
});

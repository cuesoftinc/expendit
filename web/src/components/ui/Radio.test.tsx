import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Radio, { type RadioOption } from "./Radio";

const options: RadioOption[] = [
  { value: "keep", label: "Keep transactions" },
  {
    value: "purge",
    label: "Purge transactions",
    description: "Deletes every imported row from this link",
  },
];

describe("Radio (design.md §8.2b)", () => {
  it("selects the given value and changes on click", async () => {
    const onValueChange = vi.fn();
    render(
      <Radio value="keep" onValueChange={onValueChange} options={options} />,
    );
    expect(
      screen.getByRole("radio", { name: /Keep transactions/ }),
    ).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: /Purge/ }));
    expect(onValueChange).toHaveBeenCalledWith("purge");
  });

  it("choice-card variant renders descriptions", () => {
    render(<Radio value="purge" options={options} variant="choice-card" />);
    expect(
      screen.getByText("Deletes every imported row from this link"),
    ).toBeInTheDocument();
  });

  it("disabled options cannot be chosen", async () => {
    const onValueChange = vi.fn();
    render(
      <Radio
        value="keep"
        onValueChange={onValueChange}
        options={[options[0], { ...options[1], disabled: true }]}
      />,
    );
    await userEvent
      .click(screen.getByRole("radio", { name: /Purge/ }))
      .catch(() => undefined);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GoogleAuthButton from "./GoogleAuthButton";

describe("GoogleAuthButton (the single X-1 auth CTA)", () => {
  it("renders the canonical label and fires onClick", async () => {
    const onClick = vi.fn();
    render(<GoogleAuthButton onClick={onClick} />);
    const button = screen.getByRole("button", {
      name: "Continue with Google",
    });
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("loading state disables the button and swaps the mark for a spinner", () => {
    render(<GoogleAuthButton loading />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("google-auth-loading")).toBeInTheDocument();
  });

  it("disabled state blocks clicks", async () => {
    const onClick = vi.fn();
    render(<GoogleAuthButton disabled onClick={onClick} />);
    await userEvent.click(screen.getByRole("button")).catch(() => undefined);
    expect(onClick).not.toHaveBeenCalled();
  });
});

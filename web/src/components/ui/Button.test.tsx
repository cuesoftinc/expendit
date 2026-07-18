import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "./Button";

describe("Button (design.md §8.2)", () => {
  it("renders each kind with token-bound classes", () => {
    const { rerender } = render(<Button kind="primary">Save</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-accent");
    expect(screen.getByRole("button")).toHaveClass("text-on-accent");
    rerender(<Button kind="quiet">Save</Button>);
    expect(screen.getByRole("button")).toHaveClass("border-border");
    rerender(<Button kind="destructive">Delete</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-expense");
  });

  it("supports md/sm sizes", () => {
    const { rerender } = render(<Button size="md">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-10");
    rerender(<Button size="sm">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-8");
  });

  it("loading state disables and shows the spinner", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("button-spinner")).toBeInTheDocument();
  });

  it("MI-15: danger-armed counts down before it can fire", () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(
      <Button kind="danger-armed" armedSeconds={2} onClick={onClick}>
        Purge
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(screen.getByTestId("button-countdown")).toHaveTextContent("(2)");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("button-countdown")).toHaveTextContent("(1)");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId("button-countdown")).not.toBeInTheDocument();
    expect(button).toBeEnabled();
    vi.useRealTimers();
  });

  it("fires onClick when enabled", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

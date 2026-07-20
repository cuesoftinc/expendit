import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import CodeSnippet from "./CodeSnippet";

const TABS = [
  {
    label: "Docker Compose",
    code: "git clone https://github.com/cuesoftinc/expendit\ncd expendit && docker compose up --build -d",
  },
  {
    label: "Helm",
    code: "git clone https://github.com/cuesoftinc/expendit\ncd expendit && helm install expendit deploy/helm",
  },
];

describe("CodeSnippet (design.md §8.2b)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the mono block on the dark scope", () => {
    render(<CodeSnippet code="docker compose up -d" />);
    const block = screen.getByLabelText("Code snippet");
    expect(block).toHaveClass("font-mono", "text-[13px]");
    expect(block.closest('[data-theme="dark"]')).not.toBeNull();
    expect(screen.getByText("docker compose up -d")).toBeInTheDocument();
  });

  it("tabbed mode (A8c): mirrored tabs, active-tab copy payload, prompt decor", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <CodeSnippet
        tabs={TABS}
        tabsLabel="Install method"
        label="Self-host commands"
      />,
    );

    // tablist semantics — docker active by default, helm panel unmounted
    const tablist = screen.getByRole("tablist", { name: "Install method" });
    expect(tablist).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Docker Compose" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByText(/docker compose up --build -d/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/helm install expendit/)).not.toBeInTheDocument();

    // switch to Helm — the mirrored two-line block swaps in
    fireEvent.click(screen.getByRole("tab", { name: "Helm" }));
    expect(screen.getByRole("tab", { name: "Helm" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByText(/helm install expendit deploy\/helm/),
    ).toBeInTheDocument();

    // copy targets the ACTIVE tab's full block — `$ ` prompts stay out
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await act(async () => {
      // flush the clipboard promise
    });
    expect(writeText).toHaveBeenCalledWith(TABS[1].code);

    // switching tabs resets the copied morph
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Docker Compose" }));
    expect(
      screen.getByRole("button", { name: "Copy code" }),
    ).toBeInTheDocument();
  });

  it("tabbed mode: arrow keys rove focus across the tablist (Radix)", () => {
    render(<CodeSnippet tabs={TABS} />);
    const docker = screen.getByRole("tab", { name: "Docker Compose" });
    const helm = screen.getByRole("tab", { name: "Helm" });
    docker.focus();
    fireEvent.keyDown(docker, { key: "ArrowRight" });
    expect(helm).toHaveFocus();
  });

  it("copy morphs idle → copied ✓ and resets", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.useFakeTimers();
    render(<CodeSnippet code="make run" />);
    const button = screen.getByRole("button", { name: "Copy code" });
    expect(button).toHaveAttribute("data-state", "idle");
    fireEvent.click(button);
    await act(async () => {
      // flush the clipboard promise
    });
    expect(writeText).toHaveBeenCalledWith("make run");
    expect(screen.getByRole("button", { name: "Copied" })).toHaveAttribute(
      "data-state",
      "copied",
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole("button", { name: "Copy code" })).toHaveAttribute(
      "data-state",
      "idle",
    );
  });
});

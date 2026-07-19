import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FaqSection } from "./CompareFaqCta";

describe("A10a — FAQ accordion (one open at a time, faq_open events)", () => {
  beforeEach(() => {
    window.__expenditEvents = [];
  });

  it("boots with the bank-safety answer open (Figma default)", () => {
    render(<FaqSection />);
    expect(screen.getByText(/Bank sign-in happens inside Mono/)).toBeVisible();
  });

  it("opens one item at a time and emits faq_open", async () => {
    render(<FaqSection />);
    await userEvent.click(
      screen.getByRole("button", { name: "What’s the license?" }),
    );
    expect(screen.getByText(/MIT\. Cloud and self-host/)).toBeVisible();
    // The previously-open item closed (single mode — Radix unmounts it).
    expect(screen.queryByText(/Bank sign-in happens inside Mono/)).toBeNull();
    expect(window.__expenditEvents?.at(-1)).toMatchObject({
      event: "faq_open",
      props: { question: "license" },
    });
  });
});

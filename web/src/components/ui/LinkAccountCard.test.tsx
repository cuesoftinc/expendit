import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BankLink, BankLinkStatus } from "@/models";
import LinkAccountCard from "./LinkAccountCard";

const link = (status: BankLinkStatus): BankLink => ({
  id: "bl-1",
  org_id: "org-1",
  provider: "mono",
  institution: "GTBank",
  masked_account: "•••• 4521",
  status,
  last_synced_at: "2026-07-17",
  auto_confirm: false,
  imported_txn_count: 120,
  created_at: "2026-01-01T00:00:00Z",
});

describe("LinkAccountCard (design.md §8.2, MI-9)", () => {
  it("renders institution, masked account, and last-synced", () => {
    render(<LinkAccountCard link={link("active")} />);
    expect(screen.getByText("GTBank")).toBeInTheDocument();
    expect(screen.getByText("•••• 4521")).toBeInTheDocument();
    expect(screen.getByText(/last synced 2026-07-17/)).toBeInTheDocument();
  });

  it("covers all five BANK_LINK states", () => {
    const states: BankLinkStatus[] = [
      "pending",
      "active",
      "reauth_required",
      "degraded",
      "paused",
    ];
    for (const status of states) {
      const { container, unmount } = render(
        <LinkAccountCard link={link(status)} />,
      );
      expect(
        container.querySelector(`[data-status="${status}"]`),
      ).not.toBeNull();
      unmount();
    }
  });

  it("active status breathes the sync dot (reduced-motion safe)", () => {
    render(<LinkAccountCard link={link("active")} />);
    const dot = screen.getByTestId("sync-dot");
    expect(dot).toHaveClass("animate-breathe", "motion-reduce:animate-none");
  });

  it("reauth_required tints the card border", () => {
    render(<LinkAccountCard link={link("reauth_required")} />);
    expect(screen.getByText("Re-auth required")).toBeInTheDocument();
  });
});

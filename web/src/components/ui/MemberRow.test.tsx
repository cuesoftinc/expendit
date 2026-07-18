import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Member } from "@/models";
import MemberRow from "./MemberRow";

const member = (overrides: Partial<Member> = {}): Member => ({
  org_id: "org-1",
  user_id: "u-1",
  name: "Ada Obi",
  email: "ada@bellafricana.ng",
  role: "member",
  status: "active",
  joined_at: "2026-02-01",
  ...overrides,
});

describe("MemberRow (design.md §8.2b)", () => {
  it("renders avatar, name, email, and the role select", () => {
    render(<MemberRow member={member()} />);
    expect(screen.getByText("Ada Obi")).toBeInTheDocument();
    expect(screen.getByText("ada@bellafricana.ng")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("row")).toHaveAttribute("data-state", "default");
  });

  it("role change goes through the select", async () => {
    const onRoleChange = vi.fn();
    render(<MemberRow member={member()} onRoleChange={onRoleChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: /Admin/ }));
    expect(onRoleChange).toHaveBeenCalledWith("admin");
  });

  it("pending-invite state shows the Invited tag", () => {
    render(
      <MemberRow member={member({ status: "pending", joined_at: null })} />,
    );
    expect(screen.getByRole("row")).toHaveAttribute(
      "data-state",
      "pending-invite",
    );
    expect(screen.getByText("Invited")).toBeInTheDocument();
  });

  it("owner row is immutable — no role select, no remove", () => {
    render(
      <MemberRow
        member={member({ role: "owner" })}
        onRemove={() => undefined}
      />,
    );
    expect(screen.getByRole("row")).toHaveAttribute("data-state", "owner");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Remove/ }),
    ).not.toBeInTheDocument();
  });

  it("remove fires for non-owner members", async () => {
    const onRemove = vi.fn();
    render(<MemberRow member={member()} onRemove={onRemove} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Ada Obi" }),
    );
    expect(onRemove).toHaveBeenCalled();
  });
});

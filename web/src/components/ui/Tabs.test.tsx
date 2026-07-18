import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Tabs, { TabItem, TabPanel } from "./Tabs";

const renderTabs = (
  kind: "underline" | "pill",
  onValueChange = vi.fn(),
  value = "profile",
) =>
  render(
    <Tabs
      value={value}
      onValueChange={onValueChange}
      kind={kind}
      aria-label="Settings"
      items={
        <>
          <TabItem value="profile" kind={kind}>
            Profile
          </TabItem>
          <TabItem value="members" kind={kind}>
            Members
          </TabItem>
          <TabItem value="rights" kind={kind} disabled>
            Rights
          </TabItem>
        </>
      }
    >
      <TabPanel value="profile">Profile panel</TabPanel>
      <TabPanel value="members">Members panel</TabPanel>
    </Tabs>,
  );

describe("Tabs + TabItem (design.md §8.2b)", () => {
  it("marks the active tab and shows its panel", () => {
    renderTabs("underline");
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Profile panel")).toBeInTheDocument();
    expect(screen.queryByText("Members panel")).not.toBeInTheDocument();
  });

  it("switches tabs on click", async () => {
    const onValueChange = vi.fn();
    renderTabs("underline", onValueChange);
    await userEvent.click(screen.getByRole("tab", { name: "Members" }));
    expect(onValueChange).toHaveBeenCalledWith("members");
  });

  it("disabled TabItem cannot be activated", async () => {
    const onValueChange = vi.fn();
    renderTabs("underline", onValueChange);
    await userEvent
      .click(screen.getByRole("tab", { name: "Rights" }))
      .catch(() => undefined);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("pill kind renders rounded triggers", () => {
    renderTabs("pill");
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveClass(
      "rounded-full",
    );
  });
});

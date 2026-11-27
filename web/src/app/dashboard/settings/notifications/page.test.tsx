import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotificationsSettingsPage from "./page";

describe("Notifications settings page", () => {
  it("shows an unavailable message in the labelled Notifications section", () => {
    render(<NotificationsSettingsPage />);

    const section = screen.getByRole("region", { name: "Notifications" });
    expect(
      within(section).getByRole("heading", { name: "Notifications", level: 2 }),
    ).toBeInTheDocument();
    expect(
      within(section).getByText("Notification settings are not available yet."),
    ).toBeVisible();
  });

  it("offers no placeholder notification switches or labels", () => {
    render(<NotificationsSettingsPage />);

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByText("Deadline reminders")).not.toBeInTheDocument();
    expect(screen.queryByText("Import summaries")).not.toBeInTheDocument();
  });
});

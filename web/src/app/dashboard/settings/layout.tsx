import React from "react";
import RouteTabs from "@/components/ui/RouteTabs";
import PageHeader from "../PageHeader";
import { SETTINGS_TABS } from "./tabs";

/**
 * B9 `/dashboard/settings` — the Settings shell (ratified 2026-07-20):
 * page title + routed tab bar; every tab is a real sub-route rendering
 * one section pane, so tabs deep-link and back/forward work. AppNav's
 * Settings entry stays highlighted across all sub-routes (nested match).
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace, people, privacy, and appearance."
        className="mb-4"
      />
      <RouteTabs
        tabs={[...SETTINGS_TABS]}
        aria-label="Settings sections"
        paneClassName="max-w-[860px]"
      >
        {children}
      </RouteTabs>
    </>
  );
}

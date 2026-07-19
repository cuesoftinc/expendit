import React from "react";
import DashboardShell from "./DashboardShell";

/**
 * /dashboard/<area> — the authed app (pages.md Part B, route canon
 * web-implementation.md §4). The client shell carries the app chrome,
 * guards, and the global ⌘K palette; screens render inside.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}

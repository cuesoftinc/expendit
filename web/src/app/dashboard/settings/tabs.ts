/**
 * B9 settings tab manifest — the routed sub-tabs under
 * /dashboard/settings (user-ratified 2026-07-20, B9b frame reference:
 * four tabs). Each entry is a REAL sub-route; the bare
 * /dashboard/settings redirects to the first tab.
 */
export const SETTINGS_TABS = [
  { href: "/dashboard/settings/organization", label: "Organization" },
  { href: "/dashboard/settings/members", label: "Members" },
  { href: "/dashboard/settings/data-privacy", label: "Data & privacy" },
  { href: "/dashboard/settings/notifications", label: "Notifications" },
] as const;

export const FIRST_SETTINGS_TAB = SETTINGS_TABS[0].href;

/**
 * B8 `/dashboard/categories` — the registry's routed tab bar (ratified
 * 2026-07-21): every tab is a real sub-route (RouteTabs idiom), so the
 * archive deep-links and back/forward work. Active is the bare route.
 */

export const CATEGORY_TABS = [
  { href: "/dashboard/categories", label: "Active" },
  { href: "/dashboard/categories/archive", label: "Archive" },
] as const;

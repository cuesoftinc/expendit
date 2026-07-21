"use client";

/**
 * Dashboard shell — the Part B app chrome (pages.md Part B): left nav
 * (AppNav 240px ⇄ 64px rail) with the org switcher atop, MI-5 anomaly
 * badge on Transactions, the global ⌘K palette (MI-1), the chrome theme
 * toggle (parity canon), and the auth + first-run guards. The theme
 * itself applies pre-paint via the root-layout ThemeProvider script. Views render inside; controllers own
 * every piece of state.
 */

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeftRight,
  Calculator,
  FileSpreadsheet,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Settings as SettingsIcon,
  Tag as TagIcon,
  TrendingUp,
  Upload,
} from "lucide-react";
import {
  OrgProvider,
  useAnomalyBadgeController,
  useAuthController,
  useOrg,
  useRequireAuth,
} from "@/controllers";
import AppNav, { NavGroupLabel, NavItem } from "@/components/ui/AppNav";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Avatar from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import CommandPalette, {
  type CommandItem,
} from "@/components/ui/CommandPalette";
import OrgSwitcher from "@/components/ui/OrgSwitcher";

const COLLAPSED_KEY = "expendit.nav-collapsed";

interface NavRoute {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Active on nested paths too (e.g. /dashboard/imports/{job_id}). */
  nested?: boolean;
  group?: string;
}

const NAV_ROUTES: NavRoute[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  {
    href: "/dashboard/transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
  },
  { href: "/dashboard/imports", label: "Imports", icon: Upload, nested: true },
  { href: "/dashboard/accounts", label: "Accounts", icon: Landmark },
  // Icons per the AppNav master: file-text (Reports), file-spreadsheet
  // (Statements) — audit B1/B6 low rows.
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  {
    href: "/dashboard/company",
    label: "Statements",
    icon: FileSpreadsheet,
    nested: true,
    group: "Company",
  },
  {
    href: "/dashboard/company/ratios",
    label: "Ratios",
    icon: TrendingUp,
    group: "Company",
  },
  {
    href: "/dashboard/taxes",
    label: "Tax center",
    icon: Calculator,
    nested: true,
    group: "Taxes",
  },
  // nested: the routed registry tabs (/dashboard/categories/archive)
  // keep the Categories entry highlighted (ratified 2026-07-21).
  {
    href: "/dashboard/categories",
    label: "Categories",
    icon: TagIcon,
    nested: true,
  },
  // nested: the routed settings tabs (/dashboard/settings/<tab>) keep
  // the Settings entry highlighted (ratified 2026-07-20).
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: SettingsIcon,
    nested: true,
  },
];

const isActive = (pathname: string, route: NavRoute): boolean => {
  if (pathname === route.href) return true;
  if (!route.nested) return false;
  // Nested drill-ins keep the section active — but a sibling route that
  // extends the same prefix (company/ratios under company) wins its own.
  const deeper = NAV_ROUTES.some(
    (other) =>
      other.href !== route.href &&
      other.href.startsWith(`${route.href}/`) &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`)),
  );
  return !deeper && pathname.startsWith(`${route.href}/`);
};

const ShellChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const { signOut, user } = useAuthController();
  const { orgs, activeOrg, activeOrgId, switchOrg, loading } = useOrg();
  const { count: anomalyCount } = useAnomalyBadgeController(activeOrgId);
  const [collapsed, setCollapsed] = useState(false);
  // Below md the nav always rides the 64px icon rail — a fixed 240px
  // column left ~150px of content at 390w (system QA 2026-07-19).
  // Expansion at <md opens an OVERLAY DRAWER instead (canon 2026-07-19):
  // the content keeps its full width beneath a scrim; the persisted
  // expanded state applies only ≥md, so mobile always boots collapsed.
  // Initialized synchronously — a false initial value painted the 240px
  // nav for the first frames at 390 (mobile-boot FOUC, e2e-caught); the
  // shell only renders client-side post-auth, so this is hydration-safe.
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const effectiveCollapsed = collapsed || isMobile;

  // Crossing up to ≥md dismisses the drawer — the in-flow nav takes
  // over. Adjust-state-during-render, no effect (react-hooks rule).
  const [prevIsMobile, setPrevIsMobile] = useState(isMobile);
  if (prevIsMobile !== isMobile) {
    setPrevIsMobile(isMobile);
    if (!isMobile) setDrawerOpen(false);
  }

  // First-run guard: a signed-in user with no org lands on B0.
  useEffect(() => {
    if (!loading && orgs.length === 0) router.replace("/onboarding");
  }, [loading, orgs.length, router]);

  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window !== "undefined") {
        setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
      }
    });
  }, []);

  const onCollapsedChange = (next: boolean) => {
    setCollapsed(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    }
  };

  // MI-1: navigate + actions ("upload statement", "new transaction",
  // "new category" — design.md §3), with shortcut hints.
  const paletteItems = useMemo<CommandItem[]>(() => {
    const go = (href: string) => () => router.push(href);
    const actions: CommandItem[] = [
      {
        id: "action-new-txn",
        label: "New transaction",
        group: "action",
        shortcut: ["N"],
        onSelect: go("/dashboard/transactions?new=1"),
      },
      {
        id: "action-upload-statement",
        label: "Upload statement",
        group: "action",
        shortcut: ["U"],
        onSelect: go("/dashboard/imports?upload=1"),
      },
      {
        id: "action-upload-company-statement",
        label: "Upload company statement",
        group: "action",
        onSelect: go("/dashboard/company?upload=1"),
      },
      {
        id: "action-new-category",
        label: "New category",
        group: "action",
        onSelect: go("/dashboard/categories?new=1"),
      },
      {
        id: "action-generate-report",
        label: "Generate report",
        group: "action",
        onSelect: go("/dashboard/reports?generate=1"),
      },
      {
        id: "action-link-account",
        label: "Link bank account",
        group: "action",
        onSelect: go("/dashboard/accounts?link=1"),
      },
      {
        id: "action-start-filing",
        label: "Start tax filing",
        group: "action",
        onSelect: go("/dashboard/taxes/file"),
      },
    ];
    const navigation: CommandItem[] = NAV_ROUTES.map((route) => ({
      id: `nav-${route.href}`,
      label:
        route.group === "Company"
          ? `Company ${route.label.toLowerCase()}`
          : route.label,
      group: "navigate",
      onSelect: go(route.href),
    }));
    return [...actions, ...navigation];
  }, [router]);

  // Shared by the in-flow rail and the mobile drawer (drawer clicks
  // dismiss it before navigating).
  const renderNavItems = (onNavigate?: () => void) =>
    NAV_ROUTES.map((route, index) => {
      const groupLabel =
        route.group && route.group !== NAV_ROUTES[index - 1]?.group
          ? route.group
          : null;
      return (
        <React.Fragment key={route.href}>
          {groupLabel ? <NavGroupLabel>{groupLabel}</NavGroupLabel> : null}
          <NavItem
            icon={route.icon}
            label={route.label}
            href={route.href}
            active={isActive(pathname, route)}
            badgeCount={
              route.href === "/dashboard/transactions"
                ? anomalyCount
                : undefined
            }
            onClick={onNavigate}
          />
        </React.Fragment>
      );
    });

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <AppNav
        collapsed={effectiveCollapsed}
        // <md: the rail's expand affordance opens the overlay drawer —
        // the in-flow column never widens, so content keeps its width
        // (canon 2026-07-19); ≥md it toggles + persists as before.
        onCollapsedChange={
          isMobile ? () => setDrawerOpen(true) : onCollapsedChange
        }
        orgSwitcher={
          activeOrgId ? (
            <OrgSwitcher
              orgs={orgs}
              currentOrgId={activeOrgId}
              onSelect={switchOrg}
              onCreate={() => router.push("/onboarding?create=1")}
              compact={effectiveCollapsed}
            />
          ) : null
        }
        footer={
          <div
            className={cn(
              "mb-1 flex items-center gap-2 px-2.5 py-1.5",
              effectiveCollapsed && "flex-col",
            )}
          >
            {!effectiveCollapsed ? (
              <>
                <Avatar name={user?.name ?? "…"} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-text-2">
                  {user?.name}
                </span>
              </>
            ) : null}
            {/* Theme parity canon (2026-07-19): the toggle lives in the
                dashboard chrome too, same ThemeProvider contract. */}
            <ThemeToggle className="p-1" />
            <button
              type="button"
              aria-label="Sign out"
              onClick={() => void signOut()}
              className="rounded p-1 text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        }
      >
        {renderNavItems()}
      </AppNav>

      {/* Mobile overlay drawer (canon 2026-07-19): expansion below md
          paints the 240px nav OVER the content behind a scrim — the
          content column never reflows. Radix supplies the focus trap,
          Escape and scrim-tap dismissal; the expanded state is never
          persisted from here, so mobile always boots on the rail. */}
      {isMobile ? (
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Dialog.Portal>
            <Dialog.Overlay
              data-testid="nav-drawer-scrim"
              className="fixed inset-0 z-overlay bg-bg-editorial/40 animate-fade-in motion-reduce:animate-none"
            />
            <Dialog.Content
              aria-label="Navigation drawer"
              // The drawer opens programmatically (no Dialog.Trigger), so
              // closing must hand focus back to the rail's expand button
              // explicitly (a11y contract: focus returns to the opener).
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                document
                  .querySelector<HTMLButtonElement>(
                    'button[aria-label="Expand navigation"]',
                  )
                  ?.focus();
              }}
              className="fixed inset-y-0 left-0 z-modal flex w-60 flex-col border-r border-border bg-bg font-sans shadow-lg focus:outline-none"
            >
              {activeOrgId ? (
                <div className="border-b border-border p-2">
                  <OrgSwitcher
                    orgs={orgs}
                    currentOrgId={activeOrgId}
                    onSelect={switchOrg}
                    onCreate={() => {
                      setDrawerOpen(false);
                      router.push("/onboarding?create=1");
                    }}
                  />
                </div>
              ) : null}
              <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
                {renderNavItems(() => setDrawerOpen(false))}
              </div>
              <div className="border-t border-border p-2">
                <div className="mb-1 flex items-center gap-2 px-2.5 py-1.5">
                  <Avatar name={user?.name ?? "…"} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-text-2">
                    {user?.name}
                  </span>
                  <ThemeToggle className="p-1" />
                  <button
                    type="button"
                    aria-label="Sign out"
                    onClick={() => void signOut()}
                    className="rounded p-1 text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
          {activeOrg ? children : null}
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={paletteItems}
      />
    </div>
  );
};

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, checked } = useRequireAuth();

  if (!checked || !user) return null;

  return (
    <OrgProvider>
      <ShellChrome>{children}</ShellChrome>
    </OrgProvider>
  );
};

export default DashboardShell;

"use client";

/**
 * OrgSwitcher — design.md §8.2b: closed / open (menu) · org kind
 * personal / company · current + list rows.
 */

import React, { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import type { Org } from "@/models";
import { cn } from "@/lib/cn";
import { useViewportShiftX } from "@/lib/use-viewport-clamp";

export interface OrgSwitcherProps {
  orgs: Org[];
  currentOrgId: string;
  onSelect?: (orgId: string) => void;
  /** Figma: "+ Create organization" row at the bottom of the menu. */
  onCreate?: () => void;
  /** Collapsed nav rail renders the icon-only trigger. */
  compact?: boolean;
  className?: string;
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

/**
 * Figma org tile: company = info-tinted building icon; personal =
 * accent-tinted initials.
 */
const OrgTile: React.FC<{ org: Org; className?: string }> = ({
  org,
  className,
}) => (
  <span
    aria-hidden
    className={cn(
      "flex shrink-0 items-center justify-center rounded",
      org.kind === "company"
        ? "bg-info/[0.12] text-info"
        : "bg-accent/[0.12] text-accent",
      className,
    )}
  >
    {org.kind === "company" ? (
      <Building2 className="h-3.5 w-3.5" />
    ) : (
      <span className="text-[10px] font-semibold leading-none">
        {initialsOf(org.name)}
      </span>
    )}
  </span>
);

export const OrgSwitcher: React.FC<OrgSwitcherProps> = ({
  orgs,
  currentOrgId,
  onSelect,
  onCreate,
  compact = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  // w-56 menu vs the narrow compact trigger — clamp keeps it fully in
  // the viewport at any anchor position (floating-layer sweep 2026-07-19).
  const shiftX = useViewportShiftX(open, menuRef);
  const current = orgs.find((org) => org.id === currentOrgId) ?? orgs[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!current) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={compact ? `Organization: ${current.name}` : undefined}
        data-kind={current.kind}
        onClick={() => setOpen((state) => !state)}
        className={cn(
          // Figma: bordered trigger; accent border while open.
          "flex w-full items-center gap-2 rounded border bg-bg px-2 py-1.5 text-left",
          open ? "border-accent" : "border-border",
          "transition-colors duration-fast ease-standard hover:bg-bg-elev",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          compact && "justify-center border-transparent",
        )}
      >
        <OrgTile org={current} className="h-6 w-6" />
        {!compact ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-text">
                {current.name}
              </span>
              <span className="block text-[11px] text-text-2">
                {current.kind === "company" ? "Company" : "Personal"}
              </span>
            </span>
            <ChevronsUpDown
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 text-text-2"
            />
          </>
        ) : null}
      </button>

      {open ? (
        <ul
          ref={menuRef}
          role="listbox"
          aria-label="Organizations"
          style={shiftX ? { transform: `translateX(${shiftX}px)` } : undefined}
          className="absolute left-0 top-full z-dropdown mt-1 w-56 rounded border border-border bg-bg py-1 shadow-lg"
        >
          {orgs.map((org) => (
            <li key={org.id}>
              <button
                type="button"
                role="option"
                aria-selected={org.id === currentOrgId}
                onClick={() => {
                  onSelect?.(org.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-text",
                  "transition-colors duration-fast ease-standard hover:bg-bg-elev",
                  org.id === currentOrgId && "bg-bg-elev",
                )}
              >
                <OrgTile org={org} className="h-5 w-5" />
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                {org.id === currentOrgId ? (
                  <Check aria-hidden className="h-3.5 w-3.5 text-accent" />
                ) : null}
              </button>
            </li>
          ))}
          {onCreate ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onCreate();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-text-2",
                  "transition-colors duration-fast ease-standard hover:bg-bg-elev hover:text-text",
                )}
              >
                <Plus aria-hidden className="h-3.5 w-3.5" />
                Create organization
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
};

export default OrgSwitcher;

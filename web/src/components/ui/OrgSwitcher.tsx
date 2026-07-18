"use client";

/**
 * OrgSwitcher — design.md §8.2b: closed / open (menu) · org kind
 * personal / company · current + list rows.
 */

import React, { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronsUpDown, User } from "lucide-react";
import type { Org } from "@/models";
import { cn } from "@/lib/cn";

export interface OrgSwitcherProps {
  orgs: Org[];
  currentOrgId: string;
  onSelect?: (orgId: string) => void;
  /** Collapsed nav rail renders the icon-only trigger. */
  compact?: boolean;
  className?: string;
}

const KindIcon: React.FC<{ kind: Org["kind"]; className?: string }> = ({
  kind,
  className,
}) =>
  kind === "company" ? (
    <Building2 aria-hidden className={className} />
  ) : (
    <User aria-hidden className={className} />
  );

export const OrgSwitcher: React.FC<OrgSwitcherProps> = ({
  orgs,
  currentOrgId,
  onSelect,
  compact = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
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
          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left",
          "transition-colors duration-fast ease-standard hover:bg-bg-elev",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          compact && "justify-center",
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-bg-elev">
          <KindIcon kind={current.kind} className="h-3.5 w-3.5 text-text-2" />
        </span>
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
          role="listbox"
          aria-label="Organizations"
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
                )}
              >
                <KindIcon kind={org.kind} className="h-3.5 w-3.5 text-text-2" />
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                {org.id === currentOrgId ? (
                  <Check aria-hidden className="h-3.5 w-3.5 text-accent" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default OrgSwitcher;

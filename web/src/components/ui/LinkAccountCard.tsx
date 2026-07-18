/**
 * LinkAccountCard — design.md §3/§8.2: bank logo · masked account · sync
 * status dot · last-synced. States pending / active (breathing dot,
 * MI-9) / reauth_required / degraded / paused.
 */

import React from "react";
import { Landmark } from "lucide-react";
import type { BankLink, BankLinkStatus } from "@/models";
import { cn } from "@/lib/cn";

const STATUS_META: Record<
  BankLinkStatus,
  { label: string; dotClass: string; breathe?: boolean }
> = {
  pending: { label: "Connecting…", dotClass: "bg-text-2" },
  active: { label: "Active", dotClass: "bg-income", breathe: true },
  reauth_required: { label: "Re-auth required", dotClass: "bg-expense" },
  degraded: { label: "Degraded", dotClass: "bg-warn" },
  paused: { label: "Paused", dotClass: "bg-text-2" },
};

export interface LinkAccountCardProps {
  link: BankLink;
  /** Breathing dot applies while a sync is running (MI-9). */
  syncing?: boolean;
  action?: React.ReactNode;
  className?: string;
}

export const LinkAccountCard: React.FC<LinkAccountCardProps> = ({
  link,
  syncing = false,
  action,
  className,
}) => {
  const meta = STATUS_META[link.status];
  return (
    <div
      data-status={link.status}
      className={cn(
        "flex items-center gap-3 rounded border bg-bg-elev p-4",
        link.status === "reauth_required"
          ? "border-expense/40"
          : "border-border",
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-bg">
        <Landmark aria-hidden className="h-5 w-5 text-text-2" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text">
            {link.institution}
          </span>
          <span className="font-mono text-[12px] tabular-nums text-text-2">
            {link.masked_account}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-text-2">
          <span
            data-testid="sync-dot"
            aria-hidden
            className={cn(
              "h-2 w-2 rounded-full",
              meta.dotClass,
              (syncing || (meta.breathe && link.status === "active")) &&
                "animate-breathe motion-reduce:animate-none",
            )}
          />
          <span>{meta.label}</span>
          {link.last_synced_at ? (
            <span className="tabular-nums">
              · last synced {link.last_synced_at}
            </span>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
};

export default LinkAccountCard;

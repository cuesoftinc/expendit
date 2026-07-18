/**
 * LinkAccountCard — design.md §3/§8.2, Figma Stage 2 (node 65:323): white
 * card · 32px icon well · institution + masked account (mono) · tinted
 * status pill top-right · status caption line · optional action. States
 * pending / active (breathing dot, MI-9) / reauth_required / degraded /
 * paused. Pill tints: pending=info, active=income, reauth/degraded=warn,
 * paused=neutral.
 */

import React from "react";
import { Landmark } from "lucide-react";
import type { BankLink, BankLinkStatus } from "@/models";
import { cn } from "@/lib/cn";

const STATUS_META: Record<
  BankLinkStatus,
  { label: string; pillClass: string; dotClass: string; breathe?: boolean }
> = {
  pending: {
    label: "Connecting…",
    pillClass: "bg-info/[0.12] text-info",
    dotClass: "bg-info",
  },
  active: {
    label: "Active",
    pillClass: "bg-income/[0.12] text-income",
    dotClass: "bg-income",
    breathe: true,
  },
  reauth_required: {
    label: "Re-auth required",
    pillClass: "bg-warn/[0.12] text-warn",
    dotClass: "bg-warn",
  },
  degraded: {
    label: "Degraded",
    pillClass: "bg-warn/[0.12] text-warn",
    dotClass: "bg-warn",
  },
  paused: {
    label: "Paused",
    pillClass: "bg-bg-elev text-text-2",
    dotClass: "bg-text-2",
  },
};

/** Figma caption line per status (data-driven where the model allows). */
const caption = (link: BankLink): string => {
  switch (link.status) {
    case "pending":
      return `Waiting for ${link.provider === "mono" ? "Mono" : link.provider} consent`;
    case "active":
      return `Last synced ${link.last_synced_at ?? "—"} · ${link.imported_txn_count.toLocaleString("en-NG")} transactions`;
    case "reauth_required":
      return `Sync paused since ${link.last_synced_at ?? "—"}`;
    case "degraded":
      return "Failed syncs — retrying hourly";
    case "paused":
      return "Paused by you · syncs stop until resumed";
  }
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
        "flex items-start gap-3 rounded border border-border bg-bg p-4",
        className,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-bg-elev">
        <Landmark aria-hidden className="h-4 w-4 text-text" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium leading-5 text-text">
              {link.institution}
            </div>
            <div className="font-mono text-[13px] leading-4 tabular-nums text-text-2">
              {link.masked_account}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-[3px]",
              "text-[13px] font-medium leading-4",
              meta.pillClass,
            )}
          >
            <span
              data-testid="sync-dot"
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                meta.dotClass,
                (syncing || (meta.breathe && link.status === "active")) &&
                  "animate-breathe motion-reduce:animate-none",
              )}
            />
            {meta.label}
          </span>
        </div>
        <div className="mt-2 text-[13px] leading-4 text-text-2">
          {caption(link)}
        </div>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
};

export default LinkAccountCard;

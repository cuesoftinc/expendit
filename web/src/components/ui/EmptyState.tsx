/**
 * EmptyState — design.md §8.2 (MI-16): one-line + primary action per
 * surface (transactions / imports / accounts / ratios / tax), demo-data
 * toggle where specced (synthetic, clearly badged).
 */

import React from "react";
import {
  Calendar,
  Landmark,
  ReceiptText,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/cn";
import Button from "./Button";
import Switch from "./Switch";

export type EmptyStateKind =
  "transactions" | "imports" | "accounts" | "ratios" | "tax";

// Figma Stage 2 EmptyState (node 71:390): title + hint + primary CTA.
const KIND_META: Record<
  EmptyStateKind,
  {
    Icon: React.ComponentType<{ className?: string }>;
    title: string;
    line: string;
    action: string;
  }
> = {
  transactions: {
    Icon: ReceiptText,
    title: "No transactions yet",
    line: "Upload your first statement to see your ledger.",
    action: "Upload statement",
  },
  imports: {
    Icon: Upload,
    title: "No imports yet",
    line: "Drop a CSV, PDF, or receipt image to get started.",
    action: "Upload statement",
  },
  accounts: {
    Icon: Landmark,
    title: "No linked accounts",
    line: "Connect your bank through Mono to sync transactions automatically.",
    action: "Link account",
  },
  ratios: {
    Icon: TrendingUp,
    title: "No ratios yet",
    line: "Upload and map at least one statement period to compute ratios.",
    action: "Upload statements",
  },
  tax: {
    Icon: Calendar,
    title: "Tax center not set up",
    line: "Set your jurisdiction to see deadlines and estimated liabilities.",
    action: "Set up tax profile",
  },
};

export interface EmptyStateProps {
  kind: EmptyStateKind;
  onAction?: () => void;
  /** MI-16: demo-data toggle (dashboard empty state). */
  demoToggle?: {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  kind,
  onAction,
  demoToggle,
  className,
}) => {
  const { Icon, title, line, action } = KIND_META[kind];
  return (
    <div
      data-kind={kind}
      className={cn(
        // Figma: solid hairline card on the plain canvas.
        "flex flex-col items-center gap-3 rounded border border-border bg-bg px-6 py-8 text-center",
        className,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded bg-bg-elev">
        <Icon aria-hidden className="h-4 w-4 text-text" />
      </span>
      <div>
        <p className="text-sm font-medium leading-5 text-text">{title}</p>
        <p className="mt-1 text-[13px] leading-4 text-text-2">{line}</p>
      </div>
      <Button size="sm" onClick={onAction}>
        {action}
      </Button>
      {demoToggle ? (
        <div className="mt-1 flex items-center gap-2">
          <Switch
            checked={demoToggle.enabled}
            onCheckedChange={demoToggle.onChange}
            label="Preview with demo data"
          />
          {/* Figma: info-tinted "synthetic" pill with the AI sparkle. */}
          <span className="inline-flex items-center gap-1 rounded-full bg-info/[0.12] px-1.5 py-0.5 text-[11px] font-medium leading-4 text-info">
            <Sparkles aria-hidden className="h-3 w-3" />
            synthetic
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default EmptyState;

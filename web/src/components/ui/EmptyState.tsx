/**
 * EmptyState — design.md §8.2 (MI-16): one-line + primary action per
 * surface (transactions / imports / accounts / ratios / tax), demo-data
 * toggle where specced (synthetic, clearly badged).
 */

import React from "react";
import {
  Banknote,
  Gauge,
  Landmark,
  ReceiptText,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/cn";
import Button from "./Button";
import Switch from "./Switch";

export type EmptyStateKind =
  | "transactions"
  | "imports"
  | "accounts"
  | "ratios"
  | "tax";

const KIND_META: Record<
  EmptyStateKind,
  {
    Icon: React.ComponentType<{ className?: string }>;
    line: string;
    action: string;
  }
> = {
  transactions: {
    Icon: ReceiptText,
    line: "No transactions yet.",
    action: "Upload your first statement",
  },
  imports: {
    Icon: Upload,
    line: "Nothing imported yet.",
    action: "Upload a statement",
  },
  accounts: {
    Icon: Landmark,
    line: "No bank accounts linked.",
    action: "Link a bank account",
  },
  ratios: {
    Icon: Gauge,
    line: "No statements to compute ratios from.",
    action: "Upload a financial statement",
  },
  tax: {
    Icon: Banknote,
    line: "Complete your tax profile to see estimates.",
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
  const { Icon, line, action } = KIND_META[kind];
  return (
    <div
      data-kind={kind}
      className={cn(
        "flex flex-col items-center gap-3 rounded border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-elev">
        <Icon aria-hidden className="h-5 w-5 text-text-2" />
      </span>
      <p className="text-sm text-text-2">{line}</p>
      <Button size="sm" onClick={onAction}>
        {action}
      </Button>
      {demoToggle ? (
        <div className="mt-2 flex items-center gap-2">
          <Switch
            checked={demoToggle.enabled}
            onCheckedChange={demoToggle.onChange}
            label="Show demo data"
          />
          <span className="rounded border border-info/40 bg-info/10 px-1.5 text-[11px] font-medium text-info">
            Synthetic
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default EmptyState;

/**
 * WizardStep — design.md §8.2b: state todo / current / done / error ·
 * orientation vertical rail (MI-10) / horizontal status stepper (MI-9) ·
 * with-progress slot ("syncing" live txn counter).
 */

import React from "react";
import { Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type WizardStepState = "todo" | "current" | "done" | "error";

export interface WizardStepProps {
  state: WizardStepState;
  label: string;
  /** 1-based index shown in the marker for todo/current. */
  index: number;
  /** Sub-caption under the label (bank-link tile tray, tax rail). */
  caption?: string;
  /** Icon circle marker (bank-link tiles) — replaces the index digit. */
  icon?: React.ReactNode;
  orientation?: "vertical" | "horizontal";
  /** with-progress slot (MI-9 live txn counter). */
  progress?: React.ReactNode;
  className?: string;
}

const Marker: React.FC<{
  state: WizardStepState;
  index: number;
  icon?: React.ReactNode;
}> = ({ state, index, icon }) => (
  <span
    aria-hidden
    className={cn(
      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums",
      "transition-colors duration-base ease-standard",
      // Completed check is GREEN (Figma B7b — success semantics, not
      // accent; on-accent ink is white in both modes).
      state === "done" && "border-income bg-income text-on-accent",
      state === "current" && "border-accent text-accent",
      state === "todo" && "border-border text-text-2",
      state === "error" && "border-expense bg-expense/10 text-expense",
    )}
  >
    {state === "done" ? (
      <Check strokeWidth={3} className="h-3.5 w-3.5" />
    ) : state === "error" ? (
      <CircleAlert className="h-3.5 w-3.5" />
    ) : (
      (icon ?? index)
    )}
  </span>
);

export const WizardStep: React.FC<WizardStepProps> = ({
  state,
  label,
  index,
  caption,
  icon,
  orientation = "vertical",
  progress,
  className,
}) => (
  <div
    data-state={state}
    aria-current={state === "current" ? "step" : undefined}
    className={cn(
      "flex gap-2.5",
      orientation === "vertical" || caption ? "items-start" : "items-center",
      className,
    )}
  >
    <Marker state={state} index={index} icon={icon} />
    <div
      className={cn(
        orientation === "horizontal" && !caption && "flex items-center gap-2",
      )}
    >
      <div
        className={cn(
          "text-[13px]",
          state === "current" ? "font-semibold text-text" : "text-text-2",
          state === "error" && "text-expense",
        )}
      >
        {label}
      </div>
      {caption ? (
        <div className="text-[11px] leading-4 text-text-2">{caption}</div>
      ) : null}
      {progress ? (
        <div data-testid="wizard-step-progress" className="mt-1 min-w-32">
          {progress}
        </div>
      ) : null}
    </div>
  </div>
);

export default WizardStep;

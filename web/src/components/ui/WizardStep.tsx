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
  orientation?: "vertical" | "horizontal";
  /** with-progress slot (MI-9 live txn counter). */
  progress?: React.ReactNode;
  className?: string;
}

const Marker: React.FC<{ state: WizardStepState; index: number }> = ({
  state,
  index,
}) => (
  <span
    aria-hidden
    className={cn(
      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums",
      "transition-colors duration-base ease-standard",
      state === "done" && "border-accent bg-accent text-on-accent",
      state === "current" && "border-accent text-accent-text",
      state === "todo" && "border-border text-text-2",
      state === "error" && "border-expense bg-expense/10 text-expense-text",
    )}
  >
    {state === "done" ? (
      <Check strokeWidth={3} className="h-3.5 w-3.5" />
    ) : state === "error" ? (
      <CircleAlert className="h-3.5 w-3.5" />
    ) : (
      index
    )}
  </span>
);

export const WizardStep: React.FC<WizardStepProps> = ({
  state,
  label,
  index,
  orientation = "vertical",
  progress,
  className,
}) => (
  <div
    data-state={state}
    aria-current={state === "current" ? "step" : undefined}
    className={cn(
      "flex gap-2.5",
      orientation === "vertical" ? "items-start" : "items-center",
      className,
    )}
  >
    <Marker state={state} index={index} />
    <div
      className={cn(orientation === "horizontal" && "flex items-center gap-2")}
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
      {progress ? (
        <div data-testid="wizard-step-progress" className="mt-1 min-w-32">
          {progress}
        </div>
      ) : null}
    </div>
  </div>
);

export default WizardStep;

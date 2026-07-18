/**
 * WizardShell — design.md §3/§8.1 chrome: left step rail + content +
 * sticky summary right (imports, tax filing MI-10; bank-link MI-9 uses
 * the horizontal stepper inside its modal instead).
 */

import React from "react";
import { cn } from "@/lib/cn";

export interface WizardShellProps {
  /** WizardStep instances (vertical rail). */
  steps: React.ReactNode;
  /** Sticky right summary panel. */
  summary?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const WizardShell: React.FC<WizardShellProps> = ({
  steps,
  summary,
  children,
  className,
}) => (
  <div className={cn("flex w-full gap-6", className)}>
    <nav
      aria-label="Wizard steps"
      className="w-56 shrink-0 space-y-4 border-r border-border pr-4"
    >
      {steps}
    </nav>
    <main className="min-w-0 flex-1">{children}</main>
    {summary ? (
      <aside aria-label="Summary" className="w-72 shrink-0">
        <div className="sticky top-4 rounded border border-border bg-bg-elev p-4">
          {summary}
        </div>
      </aside>
    ) : null}
  </div>
);

export default WizardShell;

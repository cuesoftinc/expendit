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
  // Mobile canon: below lg the rail/content/summary columns stack — the
  // three-column row otherwise forces the page past the viewport.
  <div className={cn("flex w-full flex-col gap-6 lg:flex-row", className)}>
    <nav
      aria-label="Wizard steps"
      className="shrink-0 space-y-4 lg:w-56 lg:border-r lg:border-border lg:pr-4"
    >
      {steps}
    </nav>
    {/* One <main> per page (W3 directive) — the shell owns it. */}
    <section aria-label="Wizard content" className="min-w-0 flex-1">
      {children}
    </section>
    {summary ? (
      <aside aria-label="Summary" className="shrink-0 lg:w-72">
        <div className="rounded border border-border bg-bg-elev p-4 lg:sticky lg:top-4">
          {summary}
        </div>
      </aside>
    ) : null}
  </div>
);

export default WizardShell;

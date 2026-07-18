/**
 * MarketingFooter — design.md §8.2b: link columns · "View Security
 * Policy" CTA · dark. Tokens only — the dark surface scopes
 * `data-theme="dark"` like the on-dark MarketingNav.
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export interface FooterColumn {
  heading: string;
  links: Array<{ label: string; href: string }>;
}

export interface MarketingFooterProps {
  columns: FooterColumn[];
  securityPolicyHref?: string;
  note?: string;
  /** Brand block (logo + tagline) — leads the link columns (Figma A11). */
  brand?: React.ReactNode;
  /** Bottom-right slot beside the security CTA (e.g. language control). */
  meta?: React.ReactNode;
  className?: string;
}

export const MarketingFooter: React.FC<MarketingFooterProps> = ({
  columns,
  securityPolicyHref = "/security",
  note = "© Expendit. Open source under Cuesoft.",
  brand,
  meta,
  className,
}) => (
  <footer
    data-theme="dark"
    className={cn("bg-bg-editorial px-6 py-12", className)}
  >
    <div
      className={cn(
        "mx-auto flex max-w-[1200px] flex-col gap-10",
        brand && "md:flex-row md:justify-between",
      )}
    >
      {brand ? <div className="max-w-xs">{brand}</div> : null}
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        {columns.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-text-2">
              {column.heading}
            </h3>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="rounded text-[13px] text-text transition-colors duration-fast ease-standard hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </div>
    <div className="mx-auto mt-10 flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
      <p className="text-[13px] text-text-2">{note}</p>
      <div className="flex items-center gap-4">
        <a
          href={securityPolicyHref}
          className={cn(
            "inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-[13px] font-medium text-text",
            "transition-colors duration-fast ease-standard hover:bg-bg-elev",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          )}
        >
          <ShieldCheck aria-hidden className="h-4 w-4" />
          View Security Policy
        </a>
        {meta}
      </div>
    </div>
  </footer>
);

export default MarketingFooter;

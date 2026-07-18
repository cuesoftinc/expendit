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
  className?: string;
}

export const MarketingFooter: React.FC<MarketingFooterProps> = ({
  columns,
  securityPolicyHref = "/security",
  note = "© Expendit. Open source under Cuesoft.",
  className,
}) => (
  <footer
    data-theme="dark"
    className={cn("bg-bg-editorial px-6 py-12", className)}
  >
    <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 md:grid-cols-4">
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
    <div className="mx-auto mt-10 flex max-w-[1200px] items-center justify-between gap-4 border-t border-border pt-6">
      <p className="text-[13px] text-text-2">{note}</p>
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
    </div>
  </footer>
);

export default MarketingFooter;

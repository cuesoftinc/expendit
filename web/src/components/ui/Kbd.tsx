/**
 * Kbd — design.md §8.2b: single key / chord (⌘K); MI-1 shortcut hints.
 * Theme handled by token modes.
 */

import React from "react";
import { cn } from "@/lib/cn";

export interface KbdProps {
  /** Single key ("K") or chord parts (["⌘", "K"]). */
  keys: string | string[];
  className?: string;
}

export const Kbd: React.FC<KbdProps> = ({ keys, className }) => {
  const parts = Array.isArray(keys) ? keys : [keys];
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {parts.map((part, index) => (
        <kbd
          key={`${part}-${index}`}
          className="rounded border border-border bg-bg-elev px-1 py-0 font-mono text-[11px] text-text-2"
        >
          {part}
        </kbd>
      ))}
    </span>
  );
};

export default Kbd;

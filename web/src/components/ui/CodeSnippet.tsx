"use client";

/**
 * CodeSnippet — design.md §8.2b: Mono/13 block on dark · copy idle /
 * copied (✓ morph). Dark surface scopes `data-theme="dark"` (tokens
 * only); used on the home page self-host section.
 */

import React, { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CodeSnippetProps {
  code: string;
  /** Accessible label for the block. */
  label?: string;
  className?: string;
}

export const CodeSnippet: React.FC<CodeSnippetProps> = ({
  code,
  label = "Code snippet",
  className,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — stay idle.
    }
  };

  return (
    <div
      data-theme="dark"
      className={cn(
        "relative rounded border border-border bg-bg-editorial",
        className,
      )}
    >
      <pre
        aria-label={label}
        className="overflow-x-auto p-4 pr-12 font-mono text-[13px] leading-relaxed text-text"
      >
        <code>{code}</code>
      </pre>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy code"}
        data-state={copied ? "copied" : "idle"}
        onClick={onCopy}
        className={cn(
          "absolute right-2 top-2 rounded border border-border p-1.5",
          "transition-colors duration-fast ease-standard",
          copied ? "text-income" : "text-text-2 hover:text-text",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        )}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" data-testid="copy-check" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
};

export default CodeSnippet;

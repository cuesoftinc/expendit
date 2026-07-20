"use client";

/**
 * CodeSnippet — design.md §8.2b: Mono/13 block on dark · copy idle /
 * copied (✓ morph). Dark surface scopes `data-theme="dark"` (tokens
 * only); used on the home page self-host section.
 *
 * Tabbed mode (A8c, Figma 474:2): pass `tabs` for the mirrored
 * Docker Compose | Helm pair — Radix Tabs supplies roving focus + ARIA
 * (kit reuse policy), the active tab carries the 2px accent underline,
 * and copy targets the ACTIVE tab's full block. The rendered `$ `
 * prompts are decorative (select-none) and stay out of the payload.
 */

import React, { useEffect, useState } from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CodeSnippetTab {
  label: string;
  code: string;
}

export interface CodeSnippetProps {
  /** Single-block mode. */
  code?: string;
  /** Tabbed mode — mirrored snippets; takes precedence over `code`. */
  tabs?: CodeSnippetTab[];
  /** Accessible name for the tablist (tabbed mode). */
  tabsLabel?: string;
  /** Accessible label for the block. */
  label?: string;
  className?: string;
}

export const CodeSnippet: React.FC<CodeSnippetProps> = ({
  code,
  tabs,
  tabsLabel = "Install method",
  label = "Code snippet",
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeLabel, setActiveLabel] = useState(tabs?.[0]?.label ?? "");

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const activeCode = tabs?.length
    ? (tabs.find((tab) => tab.label === activeLabel) ?? tabs[0]).code
    : (code ?? "");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — stay idle.
    }
  };

  if (tabs?.length) {
    return (
      <div
        data-theme="dark"
        className={cn(
          "rounded border border-border bg-bg-editorial",
          className,
        )}
      >
        <RadixTabs.Root
          value={activeLabel}
          onValueChange={(value) => {
            setActiveLabel(value);
            setCopied(false);
          }}
        >
          <div className="flex items-start gap-4 px-4 pt-3">
            <RadixTabs.List
              aria-label={tabsLabel}
              className="flex flex-1 gap-4"
            >
              {tabs.map((tab) => (
                <RadixTabs.Trigger
                  key={tab.label}
                  value={tab.label}
                  className={cn(
                    "group flex flex-col gap-1 text-[13px] font-medium",
                    "text-text-2 transition-colors duration-fast ease-standard",
                    "hover:text-text data-[state=active]:text-text",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  )}
                >
                  {tab.label}
                  <span
                    aria-hidden="true"
                    className="h-0.5 w-full bg-transparent group-data-[state=active]:bg-accent"
                  />
                </RadixTabs.Trigger>
              ))}
            </RadixTabs.List>
            <button
              type="button"
              aria-label={copied ? "Copied" : "Copy code"}
              data-state={copied ? "copied" : "idle"}
              onClick={onCopy}
              className={cn(
                "shrink-0 p-1 transition-colors duration-fast ease-standard",
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
          {tabs.map((tab) => (
            <RadixTabs.Content
              key={tab.label}
              value={tab.label}
              className="focus:outline-none"
            >
              <pre
                aria-label={label}
                className="overflow-x-auto px-4 pb-3.5 pt-2 font-mono text-[13px] leading-relaxed text-text"
              >
                <code>
                  {tab.code.split("\n").map((line) => (
                    <span key={line} className="block whitespace-nowrap">
                      <span aria-hidden="true" className="select-none">
                        {"$ "}
                      </span>
                      {line}
                    </span>
                  ))}
                </code>
              </pre>
            </RadixTabs.Content>
          ))}
        </RadixTabs.Root>
      </div>
    );
  }

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
        <code>{activeCode}</code>
      </pre>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy code"}
        data-state={copied ? "copied" : "idle"}
        onClick={onCopy}
        className={cn(
          // Solid backdrop: long single-line commands scroll beneath the
          // floated button — the fill keeps the tail from showing through
          // (audit: copy button clipped "… redis" at 1440).
          "absolute right-2 top-2 rounded border border-border bg-bg-editorial p-1.5",
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

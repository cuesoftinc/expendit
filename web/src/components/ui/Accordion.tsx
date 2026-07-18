"use client";

/**
 * Accordion — design.md §8.2b: closed / open · variant "how we got this"
 * line-item trace with a mono formula body (MI-8/MI-10). Radix Accordion
 * supplies disclosure semantics (reuse policy).
 */

import React from "react";
import * as RadixAccordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  /** trace: mono formula body ("how we got this"). */
  variant?: "default" | "trace";
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Item ids expanded initially. */
  defaultOpen?: string[];
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  defaultOpen = [],
  className,
}) => (
  <RadixAccordion.Root
    type="multiple"
    defaultValue={defaultOpen}
    className={cn("divide-y divide-border rounded border border-border", className)}
  >
    {items.map((item) => (
      <RadixAccordion.Item key={item.id} value={item.id}>
        <RadixAccordion.Header>
          <RadixAccordion.Trigger
            className={cn(
              "group flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-text",
              "transition-colors duration-fast ease-standard hover:bg-bg-elev",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
            )}
          >
            <span className="font-medium">{item.title}</span>
            <ChevronDown
              aria-hidden
              className="h-4 w-4 shrink-0 text-text-2 transition-transform duration-base ease-standard group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            />
          </RadixAccordion.Trigger>
        </RadixAccordion.Header>
        <RadixAccordion.Content
          className={cn(
            "border-t border-border px-3 py-2.5 text-[13px] text-text",
            item.variant === "trace" && "bg-bg-elev font-mono text-[12px]",
          )}
        >
          {item.content}
        </RadixAccordion.Content>
      </RadixAccordion.Item>
    ))}
  </RadixAccordion.Root>
);

export default Accordion;

"use client";

/**
 * Tooltip — design.md §8.2b: placement top/bottom/left/right · kind
 * text / formula (mono body — MI-8 "Current ratio = …").
 */

import React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/cn";

export interface TooltipProps {
  content: React.ReactNode;
  kind?: "text" | "formula";
  placement?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  kind = "text",
  placement = "top",
  children,
}) => (
  <RadixTooltip.Provider delayDuration={200}>
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={placement}
          sideOffset={6}
          className={cn(
            "z-dropdown max-w-xs rounded border border-border bg-bg-elev px-2.5 py-1.5 text-text shadow-lg",
            kind === "formula" ? "font-mono text-[12px]" : "text-[13px]",
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-bg-elev" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  </RadixTooltip.Provider>
);

export default Tooltip;

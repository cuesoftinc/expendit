"use client";

/**
 * Inspector — design.md §3/§8.2 (MI-11): right slide-in panel (400px),
 * 280ms ease-out entrance, ESC/overlay-click closes; variants record /
 * anomaly-explain / trace ("how we got this"). Deep-linking (?record=)
 * is wired by the consumer; edits save optimistically at the call site.
 */

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export type InspectorVariant = "record" | "anomaly-explain" | "trace";

export interface InspectorProps {
  open: boolean;
  onClose: () => void;
  title: string;
  variant?: InspectorVariant;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Inspector: React.FC<InspectorProps> = ({
  open,
  onClose,
  title,
  variant = "record",
  children,
  footer,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        data-testid="inspector-overlay"
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-overlay bg-bg-editorial/40 animate-fade-in motion-reduce:animate-none"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-variant={variant}
        className={cn(
          "fixed inset-y-0 right-0 z-modal flex w-full max-w-[400px] flex-col border-l border-border bg-bg shadow-lg",
          "animate-slide-in-right motion-reduce:animate-none",
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2
            className={cn(
              "text-sm font-semibold",
              variant === "anomaly-explain" ? "text-warn-text" : "text-text",
            )}
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close inspector"
            onClick={onClose}
            className="rounded p-1 text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div
          className={cn(
            "flex-1 overflow-auto px-4 py-3 text-sm text-text",
            variant === "trace" && "font-mono text-[12px]",
          )}
        >
          {children}
        </div>
        {footer ? (
          <footer className="border-t border-border px-4 py-3">{footer}</footer>
        ) : null}
      </aside>
    </>
  );
};

export default Inspector;

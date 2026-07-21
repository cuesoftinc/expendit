"use client";

/**
 * Modal/Dialog chrome — design.md §8.2b: sm/md/lg · header/body/footer
 * slots · danger variant (type-to-confirm, MI-15) · sheet variant ·
 * overlay at z-modal (design.md z layer "sheet/modal 40"). Radix Dialog
 * supplies focus trap + ESC semantics (reuse policy).
 */

import React, { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import Button from "./Button";
import Input from "./Input";

export type ModalSize = "sm" | "md" | "lg";
export type ModalVariant = "default" | "danger" | "sheet";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: ModalSize;
  variant?: ModalVariant;
  /** Danger variant: the exact phrase the user must type (MI-15). */
  confirmPhrase?: string;
  /** Danger variant: confirm CTA label. */
  confirmLabel?: string;
  onConfirm?: () => void;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  variant = "default",
  confirmPhrase,
  confirmLabel = "Confirm",
  onConfirm,
  footer,
  children,
}) => {
  const [typed, setTyped] = useState("");
  const confirmReady = !confirmPhrase || typed === confirmPhrase;
  // Focus restore (2026-07-21 a11y audit, fleet P4): modals are controlled
  // dialogs with no Radix Trigger, so Radix's default close autofocus
  // targets a null triggerRef and focus falls to <body>. Capture the opener
  // ourselves (onOpenAutoFocus fires before Radix moves focus in) and
  // return focus on close.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("");
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-overlay bg-bg-editorial/60 animate-fade-in motion-reduce:animate-none" />
        <Dialog.Content
          aria-describedby={undefined}
          aria-modal="true"
          onOpenAutoFocus={() => {
            returnFocusRef.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            // preventDefault also skips Radix's own (null-trigger) handler.
            event.preventDefault();
            const opener = returnFocusRef.current;
            returnFocusRef.current = null;
            if (opener?.isConnected) opener.focus();
          }}
          // App floating layers (portaled Select menus) live under
          // <body>, outside the Radix content subtree — without this
          // guard a click inside one dismisses the whole dialog
          // (merge-modal report).
          onInteractOutside={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("[data-floating-layer]")
            ) {
              event.preventDefault();
            }
          }}
          className={cn(
            // font-sans: portals mount under <body>, which still carries
            // the legacy Poppins font until the legacy pages retire (W3).
            "fixed z-modal border border-border bg-bg font-sans shadow-lg focus:outline-none",
            variant === "sheet"
              ? "inset-y-0 right-0 flex w-full max-w-md flex-col rounded-none"
              : cn(
                  "left-1/2 top-1/2 w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 rounded",
                  SIZE_CLASSES[size],
                ),
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
            <div>
              <Dialog.Title
                className={cn(
                  "text-sm font-semibold",
                  variant === "danger" ? "text-expense" : "text-text",
                )}
              >
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-[13px] text-text-2">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded p-1 text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-auto px-4 py-3 text-sm text-text">
            {children}
            {variant === "danger" && confirmPhrase ? (
              <div className="mt-3">
                <Input
                  label={`Type "${confirmPhrase}" to confirm`}
                  name="confirm-phrase"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  autoComplete="off"
                />
              </div>
            ) : null}
          </div>

          {footer || variant === "danger" ? (
            <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              {footer}
              {variant === "danger" ? (
                <>
                  <Dialog.Close asChild>
                    <Button kind="quiet" size="sm">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  {/* MI-15: type-to-confirm + 5s countdown-armed CTA
                      (Figma 208:4194 "Purge everything 5s"). */}
                  <Button
                    kind="danger-armed"
                    armedSeconds={5}
                    size="sm"
                    disabled={!confirmReady}
                    onClick={onConfirm}
                  >
                    {confirmLabel}
                  </Button>
                </>
              ) : null}
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Modal;

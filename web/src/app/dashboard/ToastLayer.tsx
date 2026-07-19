"use client";

/**
 * Dashboard toast layer — transient toasts (design.md §3: toasts
 * transient, banners persistent): fixed bottom-right at z-toast,
 * auto-dismissing after 4s so overlays/footers never stay blocked.
 */

import React, { useEffect } from "react";
import Toast, { type ToastKind } from "@/components/ui/Toast";

export interface ToastLayerProps {
  message: string | null;
  kind?: ToastKind;
  action?: React.ReactNode;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export const ToastLayer: React.FC<ToastLayerProps> = ({
  message,
  kind = "info",
  action,
  onDismiss,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 z-toast">
      <Toast kind={kind} action={action} onDismiss={onDismiss}>
        {message}
      </Toast>
    </div>
  );
};

export default ToastLayer;

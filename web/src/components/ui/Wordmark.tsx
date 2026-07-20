/**
 * Wordmark — the brand mark with the accent dot ("expendit·"), ONE
 * component reused across nav / signin / footer / onboarding (Figma
 * 178:19 — the dot is part of the mark everywhere). Size/weight come
 * from the caller; the dot always binds to the accent token.
 */

import React from "react";
import { cn } from "@/lib/cn";

export interface WordmarkProps {
  className?: string;
}

export const Wordmark: React.FC<WordmarkProps> = ({ className }) => (
  <span className={cn("tracking-tight", className)}>
    expendit
    <span aria-hidden className="text-accent">
      .
    </span>
  </span>
);

export default Wordmark;

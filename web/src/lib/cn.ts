import { clsx, type ClassValue } from "clsx";

/** Class combiner for variant-driven components (reuse policy: clsx ok). */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);

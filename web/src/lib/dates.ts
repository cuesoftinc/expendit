/**
 * Date helpers — date-fns (the ecosystem's canonical date library) over
 * the ISO strings the API speaks. Views format through these instead of
 * importing date-fns piecemeal.
 */

import {
  differenceInDays,
  differenceInMinutes,
  format,
  isValid,
  parseISO,
} from "date-fns";

/** Formats an ISO date/datetime string; unparsable input passes through. */
export const formatIso = (iso: string, pattern: string): string => {
  const date = parseISO(iso);
  return isValid(date) ? format(date, pattern) : iso;
};

export const isValidIso = (iso: string): boolean => isValid(parseISO(iso));

/** Today as the API's date grammar (yyyy-MM-dd). */
export const todayIso = (): string => format(new Date(), "yyyy-MM-dd");

/** Whole days from now until the ISO date (truncating diff semantics). */
export const daysUntil = (iso: string): number =>
  differenceInDays(parseISO(iso), new Date());

/**
 * Compact relative age ("2h ago", "6d ago") — history rows and feeds
 * (systemic adjudication 2026-07-20: relative ages everywhere).
 * Unparsable input passes through; future timestamps clamp to "just now".
 */
export const formatRelativeAge = (iso: string): string => {
  const then = parseISO(iso);
  if (!isValid(then)) return iso;
  const mins = Math.max(0, differenceInMinutes(new Date(), then));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

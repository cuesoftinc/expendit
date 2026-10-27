/**
 * Date helpers — date-fns (the ecosystem's canonical date library) over
 * the ISO strings the API speaks. Views format through these instead of
 * importing date-fns piecemeal.
 */

import { differenceInDays, format, isValid, parseISO } from "date-fns";

/** Formats an ISO date/datetime string; unparsable input passes through. */
export const formatIso = (iso: string, pattern: string): string => {
  const date = parseISO(iso);
  return isValid(date) ? format(date, pattern) : iso;
};

/**
 * Formats a date-only API value without inventing a local-midnight time.
 * The transaction API normally supplies `yyyy-MM-dd`, but callers can keep
 * a supplied time visible when a source genuinely includes one.
 */
export const formatIsoWithOptionalTime = (
  iso: string,
  datePattern: string,
  dateTimePattern: string,
): string => formatIso(iso, iso.includes("T") ? dateTimePattern : datePattern);

export const isValidIso = (iso: string): boolean => isValid(parseISO(iso));

/** Today as the API's date grammar (yyyy-MM-dd). */
export const todayIso = (): string => format(new Date(), "yyyy-MM-dd");

/** Whole days from now until the ISO date (truncating diff semantics). */
export const daysUntil = (iso: string): number =>
  differenceInDays(parseISO(iso), new Date());

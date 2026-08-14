import type { ISODate } from '../model/types';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

/**
 * All date maths runs in UTC. Parsing `YYYY-MM-DD` with `new Date()` yields UTC
 * midnight, which local-time accessors can report as the previous day west of
 * Greenwich — enough to miscount a sprint's workdays.
 */
export function parseISODate(iso: ISODate): Date {
  if (!ISO_DATE_PATTERN.test(iso)) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return date;
}

export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: ISODate, days: number): ISODate {
  return toISODate(new Date(parseISODate(iso).getTime() + days * MS_PER_DAY));
}

export function isWorkday(iso: ISODate): boolean {
  const day = parseISODate(iso).getUTCDay();
  return day >= 1 && day <= 5;
}

/** Inclusive on both ends. Empty when `end` precedes `start`. */
export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const from = parseISODate(start).getTime();
  const to = parseISODate(end).getTime();
  const days: ISODate[] = [];
  for (let t = from; t <= to; t += MS_PER_DAY) {
    days.push(toISODate(new Date(t)));
  }
  return days;
}

/** Mon–Fri days in the inclusive range. */
export function countWorkdays(start: ISODate, end: ISODate): number {
  return eachDay(start, end).filter(isWorkday).length;
}

export function daysBetween(start: ISODate, end: ISODate): number {
  return Math.round((parseISODate(end).getTime() - parseISODate(start).getTime()) / MS_PER_DAY);
}

export function rangesOverlap(
  aStart: ISODate,
  aEnd: ISODate,
  bStart: ISODate,
  bEnd: ISODate,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

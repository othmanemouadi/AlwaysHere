import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Pure slot math for appointment availability — no database access, so it is
 * fully unit-testable. All returned Dates are UTC instants.
 */

export type HoursRow = {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  openTime: string; // "09:00" local
  closeTime: string; // "17:00" local
  closed: boolean;
};

export type BookedRange = {
  startsAt: Date;
  endsAt: Date;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

/** Weekday of a calendar date (timezone-independent). */
export function weekdayOfDate(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function findConflict(
  startsAt: Date,
  endsAt: Date,
  booked: BookedRange[],
): BookedRange | null {
  for (const range of booked) {
    if (rangesOverlap(startsAt, endsAt, range.startsAt, range.endsAt)) return range;
  }
  return null;
}

export type ComputeSlotsInput = {
  date: string; // "YYYY-MM-DD" (business-local calendar date)
  timezone: string;
  hours: HoursRow[];
  booked: BookedRange[];
  durationMinutes: number;
  stepMinutes?: number;
  /** Slots starting before now + leadMinutes are excluded. */
  now?: Date;
  leadMinutes?: number;
  maxSlots?: number;
};

export function computeOpenSlots(input: ComputeSlotsInput): Date[] {
  const {
    date,
    timezone,
    hours,
    booked,
    durationMinutes,
    stepMinutes = 30,
    now = new Date(),
    leadMinutes = 30,
    maxSlots = 48,
  } = input;

  if (!isValidDate(date) || durationMinutes <= 0) return [];

  const day = hours.find((h) => h.dayOfWeek === weekdayOfDate(date));
  if (!day || day.closed || !isValidTime(day.openTime) || !isValidTime(day.closeTime)) {
    return [];
  }

  const open = fromZonedTime(`${date}T${day.openTime}:00`, timezone);
  const close = fromZonedTime(`${date}T${day.closeTime}:00`, timezone);
  if (open >= close) return [];

  const earliest = new Date(now.getTime() + leadMinutes * 60_000);
  const slots: Date[] = [];
  for (
    let start = open.getTime();
    start + durationMinutes * 60_000 <= close.getTime();
    start += stepMinutes * 60_000
  ) {
    const startsAt = new Date(start);
    const endsAt = new Date(start + durationMinutes * 60_000);
    if (startsAt < earliest) continue;
    if (findConflict(startsAt, endsAt, booked)) continue;
    slots.push(startsAt);
    if (slots.length >= maxSlots) break;
  }
  return slots;
}

/** "2026-07-09T14:00" business-local → UTC instant, or null if unparseable. */
export function parseLocalDateTime(iso: string, timezone: string): Date | null {
  const match = iso.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (!match) return null;
  if (!isValidDate(match[1]) || !isValidTime(match[2])) return null;
  const parsed = fromZonedTime(`${match[1]}T${match[2]}:00`, timezone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSlotLocal(slot: Date, timezone: string): string {
  return formatInTimeZone(slot, timezone, "EEEE, MMMM d 'at' h:mm a");
}

export function formatTimeLocal(slot: Date, timezone: string): string {
  return formatInTimeZone(slot, timezone, "h:mm a");
}

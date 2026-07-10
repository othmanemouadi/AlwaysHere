import { describe, expect, it } from "vitest";
import {
  computeOpenSlots,
  findConflict,
  isValidDate,
  isValidTime,
  parseLocalDateTime,
  rangesOverlap,
  weekdayOfDate,
  type HoursRow,
} from "./slots";

const NY = "America/New_York";
// 2024-01-01 is a Monday; New York is UTC-5 in January.
const MONDAY = "2024-01-01";
const LONG_AGO = new Date("2020-01-01T00:00:00Z");

const weekdayHours: HoursRow[] = [
  { dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", closed: false },
  { dayOfWeek: 0, openTime: "09:00", closeTime: "17:00", closed: true },
];

describe("validators", () => {
  it("accepts valid times and rejects garbage", () => {
    expect(isValidTime("09:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:00")).toBe(false);
    expect(isValidTime("99:99")).toBe(false);
  });

  it("accepts valid dates and rejects garbage", () => {
    expect(isValidDate("2024-01-01")).toBe(true);
    expect(isValidDate("2024-1-1")).toBe(false);
    expect(isValidDate("not-a-date")).toBe(false);
  });
});

describe("weekdayOfDate", () => {
  it("is timezone-independent", () => {
    expect(weekdayOfDate("2024-01-01")).toBe(1); // Monday
    expect(weekdayOfDate("2024-01-07")).toBe(0); // Sunday
  });
});

describe("rangesOverlap / findConflict", () => {
  const at = (h: number) => new Date(Date.UTC(2024, 0, 1, h));
  it("touching ranges do not overlap", () => {
    expect(rangesOverlap(at(9), at(10), at(10), at(11))).toBe(false);
  });
  it("contained ranges overlap", () => {
    expect(rangesOverlap(at(9), at(12), at(10), at(11))).toBe(true);
  });
  it("findConflict returns the clashing range", () => {
    const booked = [{ startsAt: at(10), endsAt: at(11) }];
    expect(findConflict(at(10), at(11), booked)).toBe(booked[0]);
    expect(findConflict(at(11), at(12), booked)).toBeNull();
  });
});

describe("computeOpenSlots", () => {
  it("generates slots inside opening hours in the business timezone", () => {
    const slots = computeOpenSlots({
      date: MONDAY,
      timezone: NY,
      hours: weekdayHours,
      booked: [],
      durationMinutes: 30,
      now: LONG_AGO,
    });
    // 09:00–17:00 local with 30-min steps → 16 start times, 09:00 EST = 14:00 UTC
    expect(slots).toHaveLength(16);
    expect(slots[0].toISOString()).toBe("2024-01-01T14:00:00.000Z");
    expect(slots.at(-1)!.toISOString()).toBe("2024-01-01T21:30:00.000Z");
  });

  it("returns nothing on closed days or days without hours", () => {
    expect(
      computeOpenSlots({
        date: "2024-01-07", // Sunday, marked closed
        timezone: NY,
        hours: weekdayHours,
        booked: [],
        durationMinutes: 30,
        now: LONG_AGO,
      }),
    ).toHaveLength(0);
    expect(
      computeOpenSlots({
        date: "2024-01-02", // Tuesday, no hours row
        timezone: NY,
        hours: weekdayHours,
        booked: [],
        durationMinutes: 30,
        now: LONG_AGO,
      }),
    ).toHaveLength(0);
  });

  it("skips booked slots", () => {
    const slots = computeOpenSlots({
      date: MONDAY,
      timezone: NY,
      hours: weekdayHours,
      booked: [
        {
          startsAt: new Date("2024-01-01T14:00:00Z"),
          endsAt: new Date("2024-01-01T14:30:00Z"),
        },
      ],
      durationMinutes: 30,
      now: LONG_AGO,
    });
    expect(slots[0].toISOString()).toBe("2024-01-01T14:30:00.000Z");
    expect(slots).toHaveLength(15);
  });

  it("respects the lead time relative to now", () => {
    const slots = computeOpenSlots({
      date: MONDAY,
      timezone: NY,
      hours: weekdayHours,
      booked: [],
      durationMinutes: 30,
      now: new Date("2024-01-01T14:10:00Z"), // 09:10 local
      leadMinutes: 30,
    });
    // Earliest allowed 09:40 local → first slot 10:00 local = 15:00 UTC
    expect(slots[0].toISOString()).toBe("2024-01-01T15:00:00.000Z");
  });

  it("does not offer a slot whose duration overruns closing time", () => {
    const slots = computeOpenSlots({
      date: MONDAY,
      timezone: NY,
      hours: weekdayHours,
      booked: [],
      durationMinutes: 60,
      now: LONG_AGO,
    });
    // Last 60-min slot must start at 16:00 local, not 16:30
    expect(slots.at(-1)!.toISOString()).toBe("2024-01-01T21:00:00.000Z");
  });

  it("handles daylight saving days without crashing or drifting", () => {
    // 2024-03-11 is the Monday after the US spring-forward (EDT, UTC-4)
    const slots = computeOpenSlots({
      date: "2024-03-11",
      timezone: NY,
      hours: weekdayHours,
      booked: [],
      durationMinutes: 30,
      now: LONG_AGO,
    });
    expect(slots[0].toISOString()).toBe("2024-03-11T13:00:00.000Z"); // 09:00 EDT
  });
});

describe("parseLocalDateTime", () => {
  it("converts business-local time to a UTC instant", () => {
    expect(parseLocalDateTime("2024-01-01T09:00", NY)?.toISOString()).toBe(
      "2024-01-01T14:00:00.000Z",
    );
  });
  it("rejects malformed input", () => {
    expect(parseLocalDateTime("tomorrow at 9", NY)).toBeNull();
    expect(parseLocalDateTime("2024-01-01T99:99", NY)).toBeNull();
    expect(parseLocalDateTime("", NY)).toBeNull();
  });
});

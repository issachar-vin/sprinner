import { describe, expect, it } from 'vitest';
import {
  addDays,
  countWorkdays,
  daysBetween,
  eachDay,
  isWorkday,
  parseISODate,
  rangesOverlap,
  toISODate,
} from './dates';

describe('parseISODate', () => {
  it('parses a calendar date at UTC midnight', () => {
    expect(parseISODate('2026-08-14').toISOString()).toBe('2026-08-14T00:00:00.000Z');
  });

  it('rejects malformed input', () => {
    expect(() => parseISODate('14-08-2026')).toThrow(/Invalid ISO date/);
    expect(() => parseISODate('2026-8-4')).toThrow(/Invalid ISO date/);
    expect(() => parseISODate('')).toThrow(/Invalid ISO date/);
  });

  it('rejects dates that do not exist', () => {
    expect(() => parseISODate('2026-02-30')).toThrow(/Invalid ISO date/);
    expect(() => parseISODate('2026-13-01')).toThrow(/Invalid ISO date/);
  });

  it('accepts a real leap day', () => {
    expect(toISODate(parseISODate('2028-02-29'))).toBe('2028-02-29');
  });
});

describe('isWorkday', () => {
  it('counts Monday through Friday', () => {
    expect(isWorkday('2026-08-14')).toBe(true);
    expect(isWorkday('2026-08-17')).toBe(true);
  });

  it('excludes Saturday and Sunday', () => {
    expect(isWorkday('2026-08-08')).toBe(false);
    expect(isWorkday('2026-08-09')).toBe(false);
  });
});

describe('eachDay', () => {
  it('is inclusive of both ends', () => {
    expect(eachDay('2026-08-03', '2026-08-05')).toEqual(['2026-08-03', '2026-08-04', '2026-08-05']);
  });

  it('returns a single day when start equals end', () => {
    expect(eachDay('2026-08-03', '2026-08-03')).toEqual(['2026-08-03']);
  });

  it('returns nothing when the range is inverted', () => {
    expect(eachDay('2026-08-05', '2026-08-03')).toEqual([]);
  });
});

describe('countWorkdays', () => {
  it('counts ten workdays in a two-week sprint', () => {
    expect(countWorkdays('2026-08-03', '2026-08-14')).toBe(10);
  });

  it('ignores trailing weekend days', () => {
    expect(countWorkdays('2026-08-03', '2026-08-16')).toBe(10);
  });

  it('counts zero across a weekend', () => {
    expect(countWorkdays('2026-08-08', '2026-08-09')).toBe(0);
  });

  it('is unaffected by local daylight saving transitions', () => {
    // US DST begins 2026-03-08, inside this range.
    expect(countWorkdays('2026-03-02', '2026-03-15')).toBe(10);
  });
});

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(addDays('2026-08-30', 3)).toBe('2026-09-02');
  });

  it('crosses a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('moves backwards with a negative offset', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('daysBetween', () => {
  it('measures an inclusive-exclusive span', () => {
    expect(daysBetween('2026-08-03', '2026-08-14')).toBe(11);
  });

  it('is negative when inverted', () => {
    expect(daysBetween('2026-08-14', '2026-08-03')).toBe(-11);
  });
});

describe('rangesOverlap', () => {
  it('detects a partial overlap', () => {
    expect(rangesOverlap('2026-08-03', '2026-08-14', '2026-08-10', '2026-08-20')).toBe(true);
  });

  it('treats touching endpoints as overlapping', () => {
    expect(rangesOverlap('2026-08-03', '2026-08-14', '2026-08-14', '2026-08-20')).toBe(true);
  });

  it('rejects disjoint ranges', () => {
    expect(rangesOverlap('2026-08-03', '2026-08-14', '2026-08-17', '2026-08-28')).toBe(false);
  });
});

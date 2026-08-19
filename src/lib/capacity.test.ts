import { describe, expect, it } from 'vitest';
import {
  balanceColor,
  calculateBandwidth,
  calculateMemberLoad,
  calculatePointLoad,
  calculateSprintCapacity,
} from './capacity';
import type { MemberLoad } from './capacity';
import { DEFAULT_SETTINGS } from '../model/types';
import type { BoardSettings, Member, Sprint, Ticket, TimeOff } from '../model/types';

const SPRINT_1: Sprint = { id: 's1', name: null, startDate: '2026-08-03', endDate: '2026-08-14' };
const SPRINT_2: Sprint = { id: 's2', name: null, startDate: '2026-08-17', endDate: '2026-08-28' };
const SPRINTS = [SPRINT_1, SPRINT_2];

const ALICE: Member = { id: 'm1', name: 'Alice' };
const BOB: Member = { id: 'm2', name: 'Bob' };

function ticket(overrides: Partial<Ticket> & Pick<Ticket, 'id'>): Ticket {
  return {
    key: `PROJ-${overrides.id}`,
    title: 'Ticket',
    points: null,
    assigneeId: null,
    blockedBy: [],
    epicKey: null,
    placement: null,
    ...overrides,
  };
}

describe('calculateBandwidth', () => {
  it('multiplies workdays by headcount', () => {
    const result = calculateBandwidth(SPRINT_1, [ALICE, BOB], [], DEFAULT_SETTINGS);
    expect(result.workdays).toBe(10);
    expect(result.capacityDays).toBe(20);
    expect(result.bandwidthPoints).toBe(20);
  });

  it('is zero without members', () => {
    const result = calculateBandwidth(SPRINT_1, [], [], DEFAULT_SETTINGS);
    expect(result.workdays).toBe(10);
    expect(result.capacityDays).toBe(0);
  });

  it('removes a holiday from every member', () => {
    const holiday: TimeOff = {
      id: 't1',
      type: 'holiday',
      startDate: '2026-08-05',
      endDate: null,
      label: 'Company day',
    };
    expect(
      calculateBandwidth(SPRINT_1, [ALICE, BOB], [holiday], DEFAULT_SETTINGS).capacityDays,
    ).toBe(18);
  });

  it('removes PTO from only the member who took it', () => {
    const pto: TimeOff = {
      id: 't1',
      type: 'pto',
      memberId: ALICE.id,
      startDate: '2026-08-05',
      endDate: '2026-08-07',
      label: 'Vacation',
    };
    expect(calculateBandwidth(SPRINT_1, [ALICE, BOB], [pto], DEFAULT_SETTINGS).capacityDays).toBe(
      17,
    );
  });

  it('does not double-subtract when PTO falls on a holiday', () => {
    const timeOff: TimeOff[] = [
      { id: 't1', type: 'holiday', startDate: '2026-08-05', endDate: null, label: 'Company day' },
      {
        id: 't2',
        type: 'pto',
        memberId: ALICE.id,
        startDate: '2026-08-05',
        endDate: '2026-08-05',
        label: 'Vacation',
      },
    ];
    // 20 person-days minus the holiday for both members. Alice's PTO overlaps it.
    expect(calculateBandwidth(SPRINT_1, [ALICE, BOB], timeOff, DEFAULT_SETTINGS).capacityDays).toBe(
      18,
    );
  });

  it('does not double-subtract overlapping PTO entries', () => {
    const timeOff: TimeOff[] = [
      {
        id: 't1',
        type: 'pto',
        memberId: ALICE.id,
        startDate: '2026-08-03',
        endDate: '2026-08-05',
        label: 'A',
      },
      {
        id: 't2',
        type: 'pto',
        memberId: ALICE.id,
        startDate: '2026-08-04',
        endDate: '2026-08-06',
        label: 'B',
      },
    ];
    // Alice is out 3rd–6th: four workdays, not six.
    expect(calculateBandwidth(SPRINT_1, [ALICE, BOB], timeOff, DEFAULT_SETTINGS).capacityDays).toBe(
      16,
    );
  });

  it('ignores time off falling on a weekend', () => {
    const pto: TimeOff = {
      id: 't1',
      type: 'pto',
      memberId: ALICE.id,
      startDate: '2026-08-08',
      endDate: '2026-08-09',
      label: 'Weekend',
    };
    expect(calculateBandwidth(SPRINT_1, [ALICE, BOB], [pto], DEFAULT_SETTINGS).capacityDays).toBe(
      20,
    );
  });

  it('ignores time off outside the sprint range', () => {
    const pto: TimeOff = {
      id: 't1',
      type: 'pto',
      memberId: ALICE.id,
      startDate: '2026-08-17',
      endDate: '2026-08-21',
      label: 'Next sprint',
    };
    expect(calculateBandwidth(SPRINT_1, [ALICE, BOB], [pto], DEFAULT_SETTINGS).capacityDays).toBe(
      20,
    );
  });

  it('clips time off that straddles the sprint boundary', () => {
    const pto: TimeOff = {
      id: 't1',
      type: 'pto',
      memberId: ALICE.id,
      startDate: '2026-08-12',
      endDate: '2026-08-19',
      label: 'Straddles',
    };
    // Only the 12th, 13th and 14th fall inside sprint 1.
    expect(calculateBandwidth(SPRINT_1, [ALICE, BOB], [pto], DEFAULT_SETTINGS).capacityDays).toBe(
      17,
    );
  });

  it('ignores PTO belonging to someone off the roster', () => {
    const pto: TimeOff = {
      id: 't1',
      type: 'pto',
      memberId: 'departed',
      startDate: '2026-08-05',
      endDate: null,
      label: 'Ghost',
    };
    expect(calculateBandwidth(SPRINT_1, [ALICE, BOB], [pto], DEFAULT_SETTINGS).capacityDays).toBe(
      20,
    );
  });

  it('converts person-days to points via daysPerPoint', () => {
    const settings: BoardSettings = { ...DEFAULT_SETTINGS, daysPerPoint: 2 };
    const result = calculateBandwidth(SPRINT_1, [ALICE, BOB], [], settings);
    expect(result.capacityDays).toBe(20);
    expect(result.bandwidthPoints).toBe(10);
  });
});

describe('calculatePointLoad', () => {
  it('charges points to the starting sprint only', () => {
    const tickets = [ticket({ id: 'a', points: 8, placement: { startSprintId: 's1', span: 2 } })];
    expect(calculatePointLoad('s1', SPRINTS, tickets)).toMatchObject({ committed: 8, creep: 0 });
    expect(calculatePointLoad('s2', SPRINTS, tickets)).toMatchObject({ committed: 0, creep: 8 });
  });

  it('ignores backlog tickets', () => {
    const tickets = [ticket({ id: 'a', points: 5 })];
    expect(calculatePointLoad('s1', SPRINTS, tickets)).toMatchObject({
      committed: 0,
      creep: 0,
      unestimated: 0,
    });
  });

  it('counts unestimated tickets separately from points', () => {
    const tickets = [
      ticket({ id: 'a', points: null, placement: { startSprintId: 's1', span: 1 } }),
      ticket({ id: 'b', points: 3, placement: { startSprintId: 's1', span: 1 } }),
    ];
    expect(calculatePointLoad('s1', SPRINTS, tickets)).toEqual({
      committed: 3,
      creep: 0,
      unestimated: 1,
    });
  });

  it('sums multiple tickets in the same sprint', () => {
    const tickets = [
      ticket({ id: 'a', points: 3, placement: { startSprintId: 's1', span: 1 } }),
      ticket({ id: 'b', points: 5, placement: { startSprintId: 's1', span: 1 } }),
    ];
    expect(calculatePointLoad('s1', SPRINTS, tickets).committed).toBe(8);
  });

  it('does not report creep for a span that ends before the sprint', () => {
    const tickets = [ticket({ id: 'a', points: 8, placement: { startSprintId: 's1', span: 1 } })];
    expect(calculatePointLoad('s2', SPRINTS, tickets).creep).toBe(0);
  });

  it('rejects an unknown sprint', () => {
    expect(() => calculatePointLoad('nope', SPRINTS, [])).toThrow(/Unknown sprint/);
  });
});

describe('balanceColor', () => {
  it('is green above the green threshold', () => {
    expect(balanceColor(6, DEFAULT_SETTINGS)).toBe('green');
  });

  it('is yellow at the green threshold', () => {
    expect(balanceColor(5, DEFAULT_SETTINGS)).toBe('yellow');
  });

  it('is yellow at zero', () => {
    expect(balanceColor(0, DEFAULT_SETTINGS)).toBe('yellow');
  });

  it('is red below zero', () => {
    expect(balanceColor(-0.5, DEFAULT_SETTINGS)).toBe('red');
  });

  it('honours custom thresholds', () => {
    const settings: BoardSettings = { ...DEFAULT_SETTINGS, thresholds: { green: 20, yellow: 10 } };
    expect(balanceColor(15, settings)).toBe('yellow');
    expect(balanceColor(21, settings)).toBe('green');
    expect(balanceColor(9, settings)).toBe('red');
  });
});

describe('calculateSprintCapacity', () => {
  it('subtracts committed points from bandwidth', () => {
    const tickets = [ticket({ id: 'a', points: 13, placement: { startSprintId: 's1', span: 1 } })];
    const result = calculateSprintCapacity(
      SPRINT_1,
      SPRINTS,
      [ALICE, BOB],
      tickets,
      [],
      DEFAULT_SETTINGS,
    );
    expect(result.bandwidthPoints).toBe(20);
    expect(result.committed).toBe(13);
    expect(result.balance).toBe(7);
    expect(result.color).toBe('green');
  });

  it('leaves the balance untouched by creep', () => {
    const tickets = [ticket({ id: 'a', points: 18, placement: { startSprintId: 's1', span: 2 } })];
    const result = calculateSprintCapacity(
      SPRINT_2,
      SPRINTS,
      [ALICE, BOB],
      tickets,
      [],
      DEFAULT_SETTINGS,
    );
    // The accepted limitation: sprint 2 is fully consumed by carryover yet reads green.
    expect(result.creep).toBe(18);
    expect(result.committed).toBe(0);
    expect(result.balance).toBe(20);
    expect(result.color).toBe('green');
  });

  it('goes red when committed points exceed bandwidth', () => {
    const tickets = [ticket({ id: 'a', points: 25, placement: { startSprintId: 's1', span: 1 } })];
    const result = calculateSprintCapacity(
      SPRINT_1,
      SPRINTS,
      [ALICE, BOB],
      tickets,
      [],
      DEFAULT_SETTINGS,
    );
    expect(result.balance).toBe(-5);
    expect(result.color).toBe('red');
  });
});

describe('calculateMemberLoad', () => {
  const tickets = [
    ticket({ id: 't1', assigneeId: 'm1', points: 8, placement: { startSprintId: 's1', span: 1 } }),
    ticket({ id: 't2', assigneeId: 'm1', points: 5, placement: { startSprintId: 's1', span: 1 } }),
    ticket({ id: 't3', assigneeId: 'm2', points: 2, placement: { startSprintId: 's1', span: 1 } }),
    ticket({ id: 't4', assigneeId: 'm1', points: 3, placement: { startSprintId: 's2', span: 1 } }),
    ticket({ id: 't5', points: null, placement: { startSprintId: 's1', span: 1 } }),
    ticket({ id: 't6', assigneeId: 'm1', points: 13 }),
  ];

  it('splits the sprint total across assignees', () => {
    const load = calculateMemberLoad('s1', tickets);
    expect(load.find((entry: MemberLoad) => entry.assigneeId === 'm1')?.committed).toBe(13);
    expect(load.find((entry: MemberLoad) => entry.assigneeId === 'm2')?.committed).toBe(2);
  });

  it('counts unestimated work separately, under its assignee', () => {
    const load = calculateMemberLoad('s1', tickets);
    expect(load.find((entry: MemberLoad) => entry.assigneeId === null)).toEqual({
      assigneeId: null,
      committed: 0,
      unestimated: 1,
    });
  });

  it('ignores tickets that start elsewhere or are unplaced', () => {
    expect(calculateMemberLoad('s2', tickets)).toEqual([
      { assigneeId: 'm1', committed: 3, unestimated: 0 },
    ]);
  });

  it('is empty for a sprint with nothing in it', () => {
    expect(calculateMemberLoad('s3', tickets)).toEqual([]);
  });
});

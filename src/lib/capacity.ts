import type { BoardSettings, ISODate, Member, Sprint, Ticket, TimeOff } from '../model/types';
import { countWorkdays, eachDay, isWorkday } from './dates';

export type BalanceColor = 'green' | 'yellow' | 'red';

export type Bandwidth = {
  /** Mon–Fri days in the sprint range, before any time off. */
  workdays: number;
  /** Person-days actually available. */
  capacityDays: number;
  /** `capacityDays` expressed in story points. */
  bandwidthPoints: number;
};

export type PointLoad = {
  /** Points of tickets that start in this sprint. */
  committed: number;
  /** Points of tickets that started earlier and span into this sprint. */
  creep: number;
  /** Tickets starting here with no estimate. Excluded from `committed`. */
  unestimated: number;
};

export type SprintCapacity = Bandwidth &
  PointLoad & {
    balance: number;
    color: BalanceColor;
  };

type DaysOff = {
  holidays: Set<ISODate>;
  ptoByMember: Map<string, Set<ISODate>>;
};

function collectDaysOff(timeOff: readonly TimeOff[]): DaysOff {
  const holidays = new Set<ISODate>();
  const ptoByMember = new Map<string, Set<ISODate>>();

  for (const entry of timeOff) {
    const days = eachDay(entry.startDate, entry.endDate ?? entry.startDate);
    if (entry.type === 'holiday') {
      for (const day of days) holidays.add(day);
      continue;
    }
    let memberDays = ptoByMember.get(entry.memberId);
    if (!memberDays) {
      memberDays = new Set<ISODate>();
      ptoByMember.set(entry.memberId, memberDays);
    }
    for (const day of days) memberDays.add(day);
  }

  return { holidays, ptoByMember };
}

/**
 * Availability is resolved per member per day rather than by subtracting
 * aggregate holiday and PTO totals. A member on PTO during a company holiday
 * loses one day, not two, and overlapping PTO entries cannot double-subtract.
 */
export function calculateBandwidth(
  sprint: Sprint,
  members: readonly Member[],
  timeOff: readonly TimeOff[],
  settings: BoardSettings,
): Bandwidth {
  const workdays = countWorkdays(sprint.startDate, sprint.endDate);
  const sprintWorkdays = eachDay(sprint.startDate, sprint.endDate).filter(isWorkday);
  const { holidays, ptoByMember } = collectDaysOff(timeOff);

  let capacityDays = 0;
  for (const member of members) {
    const memberPto = ptoByMember.get(member.id);
    for (const day of sprintWorkdays) {
      if (holidays.has(day)) continue;
      if (memberPto?.has(day)) continue;
      capacityDays += 1;
    }
  }

  return {
    workdays,
    capacityDays,
    bandwidthPoints: capacityDays / settings.daysPerPoint,
  };
}

/**
 * Points land wholly in a ticket's first sprint. Spillover into later sprints
 * is reported as `creep` and deliberately does not reduce their balance — see
 * the accepted limitation in docs/spec.md.
 */
export function calculatePointLoad(
  sprintId: string,
  sprints: readonly Sprint[],
  tickets: readonly Ticket[],
): PointLoad {
  const sprintIndex = sprints.findIndex((s) => s.id === sprintId);
  if (sprintIndex === -1) {
    throw new Error(`Unknown sprint: ${sprintId}`);
  }

  let committed = 0;
  let creep = 0;
  let unestimated = 0;

  for (const ticket of tickets) {
    if (!ticket.placement) continue;
    const startIndex = sprints.findIndex((s) => s.id === ticket.placement?.startSprintId);
    if (startIndex === -1) continue;
    const endIndex = startIndex + ticket.placement.span - 1;

    if (startIndex === sprintIndex) {
      if (ticket.points === null) unestimated += 1;
      else committed += ticket.points;
    } else if (startIndex < sprintIndex && endIndex >= sprintIndex && ticket.points !== null) {
      creep += ticket.points;
    }
  }

  return { committed, creep, unestimated };
}

export function balanceColor(balance: number, settings: BoardSettings): BalanceColor {
  if (balance > settings.thresholds.green) return 'green';
  if (balance >= settings.thresholds.yellow) return 'yellow';
  return 'red';
}

export function calculateSprintCapacity(
  sprint: Sprint,
  sprints: readonly Sprint[],
  members: readonly Member[],
  tickets: readonly Ticket[],
  timeOff: readonly TimeOff[],
  settings: BoardSettings,
): SprintCapacity {
  const bandwidth = calculateBandwidth(sprint, members, timeOff, settings);
  const load = calculatePointLoad(sprint.id, sprints, tickets);
  const balance = bandwidth.bandwidthPoints - load.committed;

  return {
    ...bandwidth,
    ...load,
    balance,
    color: balanceColor(balance, settings),
  };
}

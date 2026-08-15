import { describe, expect, it } from 'vitest';
import { parseBoard } from '../model/schema';
import { sprintIndexForDate } from './board';
import { isWorkday } from './dates';
import { createDemoBoard } from './seed';

describe('createDemoBoard', () => {
  it('produces a board that passes the schema boundary', () => {
    expect(parseBoard(createDemoBoard('2026-08-14')).ok).toBe(true);
  });

  it('places today inside a sprint whichever day it is generated on', () => {
    for (const today of [
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
    ]) {
      const board = createDemoBoard(today);
      expect(sprintIndexForDate(board.sprints, today)).toBe(2);
    }
  });

  it('generates contiguous sprints starting on a Monday', () => {
    const { sprints } = createDemoBoard('2026-08-14');

    expect(sprints.every((sprint) => isWorkday(sprint.startDate))).toBe(true);
    sprints.forEach((sprint, index) => {
      const previous = sprints[index - 1];
      if (previous) expect(sprint.startDate > previous.endDate).toBe(true);
    });
  });

  it('has planned work, a backlog, unestimated tickets and blockers', () => {
    const { tickets, rowOrder } = createDemoBoard('2026-08-14');

    expect(tickets.some((ticket) => ticket.placement !== null)).toBe(true);
    expect(tickets.some((ticket) => ticket.placement === null)).toBe(true);
    expect(tickets.some((ticket) => ticket.points === null)).toBe(true);
    expect(tickets.some((ticket) => ticket.blockedBy.length > 0)).toBe(true);
    expect(rowOrder).toEqual(tickets.map((ticket) => ticket.id));
  });

  it('references only ids that exist', () => {
    const board = createDemoBoard('2026-08-14');
    const sprintIds = new Set(board.sprints.map((sprint) => sprint.id));
    const ticketIds = new Set(board.tickets.map((ticket) => ticket.id));
    const memberIds = new Set(board.members.map((member) => member.id));

    for (const ticket of board.tickets) {
      if (ticket.placement) expect(sprintIds.has(ticket.placement.startSprintId)).toBe(true);
      if (ticket.assigneeId) expect(memberIds.has(ticket.assigneeId)).toBe(true);
      for (const blocker of ticket.blockedBy) expect(ticketIds.has(blocker)).toBe(true);
    }

    for (const entry of board.timeOff) {
      if (entry.type === 'pto') expect(memberIds.has(entry.memberId)).toBe(true);
    }
  });
});

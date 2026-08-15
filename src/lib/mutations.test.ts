import { describe, expect, it } from 'vitest';
import type { Board, Ticket } from '../model/types';
import { createEmptyBoard } from '../model/types';
import { boardRows } from './board';
import { deleteTicket, dependentsOf, moveToBacklog, placeTicket, resizeTicket } from './mutations';

function ticket(overrides: Partial<Ticket> & Pick<Ticket, 'id'>): Ticket {
  return {
    key: `KEY-${overrides.id}`,
    title: 'A ticket',
    points: 3,
    assigneeId: null,
    blockedBy: [],
    epicKey: null,
    placement: null,
    ...overrides,
  };
}

function buildBoard(): Board {
  const tickets = [
    ticket({ id: 'a', placement: { startSprintId: 's1', span: 1 } }),
    ticket({ id: 'b', placement: { startSprintId: 's2', span: 2 } }),
    ticket({ id: 'c', blockedBy: ['a'] }),
  ];

  return {
    ...createEmptyBoard(),
    sprints: [
      { id: 's1', name: null, startDate: '2026-01-05', endDate: '2026-01-16' },
      { id: 's2', name: null, startDate: '2026-01-19', endDate: '2026-01-30' },
      { id: 's3', name: null, startDate: '2026-02-02', endDate: '2026-02-13' },
    ],
    tickets,
    rowOrder: ['a', 'b', 'c'],
  };
}

describe('placeTicket', () => {
  it('places a backlog ticket and inserts it above the target row', () => {
    const next = placeTicket(buildBoard(), 'c', 's1', 1, 'b');

    expect(next.tickets.find((t) => t.id === 'c')?.placement).toEqual({
      startSprintId: 's1',
      span: 1,
    });
    expect(next.rowOrder).toEqual(['a', 'c', 'b']);
  });

  it('appends when there is no row below the drop', () => {
    const next = placeTicket(buildBoard(), 'c', 's1', 1, null);
    expect(next.rowOrder).toEqual(['a', 'b', 'c']);
  });

  it('keeps the row when a ticket is dropped on its own row', () => {
    const next = placeTicket(buildBoard(), 'a', 's3', 1, 'a');
    expect(next.rowOrder).toEqual(['a', 'b', 'c']);
    expect(next.tickets.find((t) => t.id === 'a')?.placement?.startSprintId).toBe('s3');
  });

  it('clamps a span that would run past the last sprint', () => {
    const next = placeTicket(buildBoard(), 'b', 's3', 3, null);
    expect(next.tickets.find((t) => t.id === 'b')?.placement?.span).toBe(1);
  });

  it('ignores an unknown sprint rather than corrupting the placement', () => {
    const board = buildBoard();
    expect(placeTicket(board, 'a', 'nope', 1, null)).toBe(board);
  });

  it('does not mutate the board it was given', () => {
    const board = buildBoard();
    const before = structuredClone(board);
    placeTicket(board, 'c', 's1', 1, 'b');
    expect(board).toEqual(before);
  });
});

describe('resizeTicket', () => {
  it('changes span without touching row order', () => {
    const next = resizeTicket(buildBoard(), 'a', 's1', 3);

    expect(next.tickets.find((t) => t.id === 'a')?.placement).toEqual({
      startSprintId: 's1',
      span: 3,
    });
    expect(next.rowOrder).toEqual(['a', 'b', 'c']);
  });

  it('moves the start sprint when the left edge is dragged', () => {
    const next = resizeTicket(buildBoard(), 'b', 's1', 3);
    expect(boardRows(next).find((row) => row.ticket.id === 'b')).toMatchObject({
      columnStart: 1,
      span: 3,
    });
  });

  it('never drops below a single column', () => {
    const next = resizeTicket(buildBoard(), 'b', 's2', 0);
    expect(next.tickets.find((t) => t.id === 'b')?.placement?.span).toBe(1);
  });
});

describe('moveToBacklog', () => {
  it('discards the placement and keeps the row order entry', () => {
    const next = moveToBacklog(buildBoard(), 'b');
    expect(next.tickets.find((t) => t.id === 'b')?.placement).toBeNull();
    expect(next.rowOrder).toEqual(['a', 'b', 'c']);
  });
});

describe('dependentsOf', () => {
  it('names the tickets blocked by the given ticket', () => {
    expect(dependentsOf(buildBoard(), 'a').map((t) => t.id)).toEqual(['c']);
    expect(dependentsOf(buildBoard(), 'b')).toEqual([]);
  });
});

describe('deleteTicket', () => {
  it('removes the ticket from tickets and rowOrder', () => {
    const next = deleteTicket(buildBoard(), 'b');
    expect(next.tickets.map((t) => t.id)).toEqual(['a', 'c']);
    expect(next.rowOrder).toEqual(['a', 'c']);
  });

  it('strips the id from every blockedBy so no dangling reference is left', () => {
    const next = deleteTicket(buildBoard(), 'a');
    expect(next.tickets.find((t) => t.id === 'c')?.blockedBy).toEqual([]);
  });
});

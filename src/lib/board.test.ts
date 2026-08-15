import { describe, expect, it } from 'vitest';
import {
  ALL_ASSIGNEES,
  backlogTickets,
  boardRows,
  filterTickets,
  sprintIndexForDate,
  ticketKeysById,
  UNASSIGNED,
} from './board';
import type { Board, Sprint, Ticket } from '../model/types';
import { createEmptyBoard } from '../model/types';

const sprints: Sprint[] = [
  { id: 's1', name: null, startDate: '2026-01-05', endDate: '2026-01-16' },
  { id: 's2', name: null, startDate: '2026-01-19', endDate: '2026-01-30' },
  { id: 's3', name: null, startDate: '2026-02-02', endDate: '2026-02-13' },
];

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

function board(tickets: Ticket[], rowOrder: string[]): Board {
  return { ...createEmptyBoard(), sprints, tickets, rowOrder };
}

describe('sprintIndexForDate', () => {
  it('finds the sprint containing the date', () => {
    expect(sprintIndexForDate(sprints, '2026-01-19')).toBe(1);
    expect(sprintIndexForDate(sprints, '2026-02-13')).toBe(2);
  });

  it('returns -1 for a date in a gap or outside the board', () => {
    expect(sprintIndexForDate(sprints, '2026-01-17')).toBe(-1);
    expect(sprintIndexForDate(sprints, '2025-12-31')).toBe(-1);
    expect(sprintIndexForDate([], '2026-01-19')).toBe(-1);
  });
});

describe('boardRows', () => {
  it('orders rows by rowOrder and converts placements to 1-based columns', () => {
    const rows = boardRows(
      board(
        [
          ticket({ id: 'b', placement: { startSprintId: 's2', span: 2 } }),
          ticket({ id: 'a', placement: { startSprintId: 's1', span: 1 } }),
        ],
        ['a', 'b'],
      ),
    );

    expect(rows.map((row) => row.ticket.id)).toEqual(['a', 'b']);
    expect(rows[0]).toMatchObject({ columnStart: 1, span: 1 });
    expect(rows[1]).toMatchObject({ columnStart: 2, span: 2 });
  });

  it('leaves backlog tickets out', () => {
    const rows = boardRows(board([ticket({ id: 'a' })], ['a']));
    expect(rows).toEqual([]);
  });

  it('clips a span that runs past the last sprint', () => {
    const rows = boardRows(
      board([ticket({ id: 'a', placement: { startSprintId: 's3', span: 4 } })], ['a']),
    );
    expect(rows[0]?.span).toBe(1);
  });

  it('skips a placement pointing at a sprint that no longer exists', () => {
    const rows = boardRows(
      board([ticket({ id: 'a', placement: { startSprintId: 'gone', span: 1 } })], ['a']),
    );
    expect(rows).toEqual([]);
  });

  it('keeps tickets missing from rowOrder, ordered after the rest', () => {
    const rows = boardRows(
      board(
        [
          ticket({ id: 'orphan', placement: { startSprintId: 's1', span: 1 } }),
          ticket({ id: 'a', placement: { startSprintId: 's1', span: 1 } }),
        ],
        ['a'],
      ),
    );
    expect(rows.map((row) => row.ticket.id)).toEqual(['a', 'orphan']);
  });
});

describe('backlogTickets', () => {
  it('returns unplaced tickets in row order', () => {
    const tickets = [
      ticket({ id: 'b' }),
      ticket({ id: 'a' }),
      ticket({ id: 'placed', placement: { startSprintId: 's1', span: 1 } }),
    ];
    expect(backlogTickets(board(tickets, ['a', 'b', 'placed'])).map((t) => t.id)).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('filterTickets', () => {
  const tickets = [
    ticket({ id: '1', key: 'PLAT-1', title: 'Rotate credentials', assigneeId: 'm1' }),
    ticket({ id: '2', key: 'PLAT-2', title: 'Audit log pipeline', assigneeId: 'm2' }),
    ticket({ id: '3', key: 'OPS-9', title: 'Rotate certificates', assigneeId: null }),
  ];

  it('returns everything when unfiltered', () => {
    expect(filterTickets(tickets, '', ALL_ASSIGNEES)).toHaveLength(3);
  });

  it('matches key and title case-insensitively', () => {
    expect(filterTickets(tickets, 'plat-2', ALL_ASSIGNEES).map((t) => t.id)).toEqual(['2']);
    expect(filterTickets(tickets, 'rotate', ALL_ASSIGNEES).map((t) => t.id)).toEqual(['1', '3']);
  });

  it('ignores surrounding whitespace', () => {
    expect(filterTickets(tickets, '  audit  ', ALL_ASSIGNEES).map((t) => t.id)).toEqual(['2']);
  });

  it('filters by member and by unassigned', () => {
    expect(filterTickets(tickets, '', 'm1').map((t) => t.id)).toEqual(['1']);
    expect(filterTickets(tickets, '', UNASSIGNED).map((t) => t.id)).toEqual(['3']);
  });

  it('combines search and assignee', () => {
    expect(filterTickets(tickets, 'rotate', 'm1').map((t) => t.id)).toEqual(['1']);
    expect(filterTickets(tickets, 'audit', 'm1')).toEqual([]);
  });
});

describe('ticketKeysById', () => {
  it('maps internal ids to display keys', () => {
    const keys = ticketKeysById([ticket({ id: '1', key: 'PLAT-1' })]);
    expect(keys.get('1')).toBe('PLAT-1');
    expect(keys.get('missing')).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import type { Board, Ticket } from '../model/types';
import { createEmptyBoard } from '../model/types';
import { boardRows } from './board';
import {
  addMember,
  addSprint,
  addTimeOff,
  clearPlacements,
  deleteTicket,
  moveToBacklog,
  placeTicket,
  removalImpact,
  removeMember,
  removeSprint,
  removeTimeOff,
  renameMember,
  replaceSprints,
  reflowSprints,
  resizeTicket,
  updateSettings,
  updateSprint,
  updateTicket,
} from './mutations';

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

describe('updateTicket', () => {
  it('replaces the editable fields and leaves placement alone', () => {
    const next = updateTicket(buildBoard(), 'a', {
      key: 'NEW-1',
      title: 'Renamed',
      points: 8,
      assigneeId: 'm1',
      blockedBy: ['b'],
      epicKey: 'EPIC-1',
    });

    const ticket = next.tickets.find((t) => t.id === 'a');
    expect(ticket).toMatchObject({
      key: 'NEW-1',
      title: 'Renamed',
      points: 8,
      assigneeId: 'm1',
      blockedBy: ['b'],
      epicKey: 'EPIC-1',
      placement: { startSprintId: 's1', span: 1 },
    });
    expect(next.rowOrder).toEqual(['a', 'b', 'c']);
  });
});

describe('updateSprint', () => {
  it('changes only the sprint asked for', () => {
    const next = updateSprint(buildBoard(), 's2', {
      name: 'Hardening',
      startDate: '2026-01-20',
      endDate: '2026-01-31',
    });

    expect(next.sprints[1]).toMatchObject({
      id: 's2',
      name: 'Hardening',
      startDate: '2026-01-20',
      endDate: '2026-01-31',
    });
    expect(next.sprints[0]).toEqual(buildBoard().sprints[0]);
  });
});

describe('addSprint', () => {
  it('appends a sprint that starts the day after the last one ends', () => {
    const next = addSprint(buildBoard(), '2026-06-01');

    expect(next.sprints).toHaveLength(4);
    expect(next.sprints[3]?.startDate).toBe('2026-02-14');
  });
});

describe('replaceSprints', () => {
  it('swaps the whole set and keeps tickets', () => {
    const board = buildBoard();
    const next = replaceSprints(board, [
      { id: 'x1', name: null, startDate: '2026-03-02', endDate: '2026-03-15' },
    ]);

    expect(next.sprints).toHaveLength(1);
    expect(next.tickets).toEqual(board.tickets);
  });
});

describe('reflowSprints', () => {
  it('closes the gap after the given sprint', () => {
    const board = updateSprint(buildBoard(), 's1', {
      name: null,
      startDate: '2026-01-05',
      endDate: '2026-01-09',
    });

    const next = reflowSprints(board, 's1');
    expect(next.sprints[1]?.startDate).toBe('2026-01-10');
    expect(next.sprints[2]?.startDate).toBe('2026-01-22');
  });

  it('ignores an unknown sprint', () => {
    const board = buildBoard();
    expect(reflowSprints(board, 'nope')).toBe(board);
  });
});

describe('removalImpact', () => {
  it('separates tickets that lose their start sprint from those that only span it', () => {
    const board = resizeTicket(buildBoard(), 'a', 's1', 3);
    const impact = removalImpact(board, 's2');

    expect(impact.unplaced.map((t) => t.id)).toEqual(['b']);
    expect(impact.clipped.map((t) => t.id)).toEqual(['a']);
  });

  it('is empty for an unknown sprint', () => {
    expect(removalImpact(buildBoard(), 'nope')).toEqual({ unplaced: [], clipped: [] });
  });
});

describe('removeSprint', () => {
  it('returns tickets that started there to the backlog', () => {
    const next = removeSprint(buildBoard(), 's2');

    expect(next.sprints.map((s) => s.id)).toEqual(['s1', 's3']);
    expect(next.tickets.find((t) => t.id === 'b')?.placement).toBeNull();
  });

  it('clips a span that crossed the removed sprint', () => {
    const board = resizeTicket(buildBoard(), 'a', 's1', 3);
    const next = removeSprint(board, 's2');

    expect(next.tickets.find((t) => t.id === 'a')?.placement).toEqual({
      startSprintId: 's1',
      span: 2,
    });
  });

  it('leaves a span that ends before the removed sprint alone', () => {
    const next = removeSprint(buildBoard(), 's3');
    expect(next.tickets.find((t) => t.id === 'a')?.placement).toEqual({
      startSprintId: 's1',
      span: 1,
    });
  });

  it('ignores an unknown sprint', () => {
    const board = buildBoard();
    expect(removeSprint(board, 'nope')).toBe(board);
  });

  it('keeps row order so an unplaced ticket stays where it was', () => {
    expect(removeSprint(buildBoard(), 's2').rowOrder).toEqual(['a', 'b', 'c']);
  });
});

describe('clearPlacements', () => {
  it('returns every placed ticket to the backlog and keeps the rest', () => {
    const board = buildBoard();
    const next = clearPlacements(board);

    expect(next.tickets.every((ticket) => ticket.placement === null)).toBe(true);
    expect(next.sprints).toEqual(board.sprints);
    expect(next.rowOrder).toEqual(board.rowOrder);
    expect(next.tickets.map((t) => t.id)).toEqual(board.tickets.map((t) => t.id));
  });

  it('leaves an already empty board untouched', () => {
    const empty = clearPlacements(buildBoard());
    expect(clearPlacements(empty)).toBe(empty);
  });
});

describe('roster', () => {
  it('adds a member with an id of its own', () => {
    const next = addMember(buildBoard(), 'Priya Raman');
    expect(next.members).toHaveLength(1);
    expect(next.members[0]?.name).toBe('Priya Raman');
    expect(next.members[0]?.id).toBeTruthy();
  });

  it('renames one member and leaves the rest alone', () => {
    const board = addMember(addMember(buildBoard(), 'Priya'), 'Marcus');
    const first = board.members[0]?.id as string;

    const next = renameMember(board, first, 'Priya Raman');
    expect(next.members[0]?.name).toBe('Priya Raman');
    expect(next.members[1]?.name).toBe('Marcus');
  });

  it('leaves nothing pointing at a removed member', () => {
    const board = addMember(buildBoard(), 'Priya');
    const memberId = board.members[0]?.id as string;
    const assigned = {
      ...board,
      tickets: board.tickets.map((t) => (t.id === 'a' ? { ...t, assigneeId: memberId } : t)),
      timeOff: [
        {
          id: 'p1',
          type: 'pto' as const,
          memberId,
          startDate: '2026-01-06',
          endDate: null,
          label: 'Leave',
        },
        { id: 'h1', type: 'holiday' as const, startDate: '2026-01-01', endDate: null, label: 'NY' },
      ],
    };

    const next = removeMember(assigned, memberId);
    expect(next.members).toEqual([]);
    expect(next.tickets.find((t) => t.id === 'a')?.assigneeId).toBeNull();
    expect(next.timeOff.map((e) => e.id)).toEqual(['h1']);
  });
});

describe('time off', () => {
  it('adds an entry with an id and removes it again', () => {
    const added = addTimeOff(buildBoard(), {
      type: 'holiday',
      startDate: '2026-01-01',
      endDate: null,
      label: 'New Year',
    });
    expect(added.timeOff).toHaveLength(1);

    const id = added.timeOff[0]?.id as string;
    expect(removeTimeOff(added, id).timeOff).toEqual([]);
  });
});

describe('updateSettings', () => {
  it('replaces the settings without touching anything else', () => {
    const board = buildBoard();
    const next = updateSettings(board, { daysPerPoint: 2, thresholds: { green: 8, yellow: 2 } });

    expect(next.settings).toEqual({ daysPerPoint: 2, thresholds: { green: 8, yellow: 2 } });
    expect(next.tickets).toEqual(board.tickets);
  });
});

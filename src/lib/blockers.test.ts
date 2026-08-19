import { describe, expect, it } from 'vitest';
import type { Board, Ticket } from '../model/types';
import { createEmptyBoard } from '../model/types';
import { createsCycle, dependentsOf, placementRejection, unplaceRejection } from './blockers';

function ticket(id: string, blockedBy: string[] = []): Ticket {
  return {
    id,
    key: `KEY-${id}`,
    title: 'A ticket',
    points: null,
    assigneeId: null,
    blockedBy,
    epicKey: null,
    placement: null,
  };
}

describe('createsCycle', () => {
  const tickets = [ticket('a'), ticket('b', ['a']), ticket('c', ['b'])];

  it('allows a blocker that introduces no loop', () => {
    expect(createsCycle(tickets, 'a', [])).toBe(false);
    expect(createsCycle(tickets, 'c', ['a'])).toBe(false);
  });

  it('rejects a ticket blocking itself', () => {
    expect(createsCycle(tickets, 'a', ['a'])).toBe(true);
  });

  it('rejects a direct loop', () => {
    expect(createsCycle(tickets, 'a', ['b'])).toBe(true);
  });

  it('rejects a loop several hops away', () => {
    expect(createsCycle(tickets, 'a', ['c'])).toBe(true);
  });

  it('terminates on a board that already contains a loop', () => {
    const looped = [ticket('a', ['b']), ticket('b', ['a'])];
    expect(createsCycle(looped, 'c', ['a'])).toBe(false);
  });

  it('ignores blockers that no longer exist', () => {
    expect(createsCycle(tickets, 'a', ['gone'])).toBe(false);
  });
});

function board(tickets: Ticket[]): Board {
  return {
    ...createEmptyBoard(),
    sprints: [
      { id: 's1', name: null, startDate: '2026-01-05', endDate: '2026-01-16' },
      { id: 's2', name: null, startDate: '2026-01-19', endDate: '2026-01-30' },
      { id: 's3', name: null, startDate: '2026-02-02', endDate: '2026-02-13' },
      { id: 's4', name: null, startDate: '2026-02-16', endDate: '2026-02-27' },
    ],
    tickets,
    rowOrder: tickets.map((t) => t.id),
  };
}

function placed(id: string, startSprintId: string, span: number, blockedBy: string[] = []): Ticket {
  return { ...ticket(id, blockedBy), placement: { startSprintId, span } };
}

describe('dependentsOf', () => {
  it('names the tickets blocked by the given one', () => {
    const b = board([ticket('a'), ticket('b', ['a']), ticket('c')]);
    expect(dependentsOf(b, 'a').map((t) => t.id)).toEqual(['b']);
    expect(dependentsOf(b, 'c')).toEqual([]);
  });
});

describe('placementRejection', () => {
  it('allows a placement with no blockers', () => {
    expect(placementRejection(board([ticket('a')]), 'a', 's2', 1)).toBeNull();
  });

  it('refuses to place a ticket whose blocker is still in the backlog', () => {
    const b = board([ticket('a'), ticket('b', ['a'])]);
    expect(placementRejection(b, 'b', 's2', 1)).toBe('Blocked by KEY-a — not yet placed');
  });

  it('refuses to start before the blocker ends', () => {
    const b = board([placed('a', 's2', 2), ticket('b', ['a'])]);
    expect(placementRejection(b, 'b', 's2', 1)).toBe('Blocked by KEY-a — it runs to sprint 3');
  });

  it('allows starting where the blocker ends', () => {
    const b = board([placed('a', 's2', 2), ticket('b', ['a'])]);
    expect(placementRejection(b, 'b', 's3', 1)).toBeNull();
  });

  it('refuses to stretch a blocker over a placed dependent', () => {
    const b = board([placed('a', 's1', 1), placed('b', 's2', 1, ['a'])]);
    expect(placementRejection(b, 'a', 's1', 3)).toBe(
      'KEY-b depends on this and starts in sprint 2',
    );
  });

  it('ignores dependents that are still in the backlog', () => {
    const b = board([placed('a', 's1', 1), ticket('b', ['a'])]);
    expect(placementRejection(b, 'a', 's1', 4)).toBeNull();
  });

  it('ignores blockers that no longer exist', () => {
    expect(placementRejection(board([ticket('a', ['gone'])]), 'a', 's1', 1)).toBeNull();
  });

  it('says nothing about an unknown ticket or sprint', () => {
    const b = board([ticket('a')]);
    expect(placementRejection(b, 'nope', 's1', 1)).toBeNull();
    expect(placementRejection(b, 'a', 'nope', 1)).toBeNull();
  });
});

describe('unplaceRejection', () => {
  it('refuses while a dependent is placed', () => {
    const b = board([placed('a', 's1', 1), placed('b', 's2', 1, ['a'])]);
    expect(unplaceRejection(b, 'a')).toBe('KEY-b depends on this and is still placed');
  });

  it('names every placed dependent', () => {
    const b = board([
      placed('a', 's1', 1),
      placed('b', 's2', 1, ['a']),
      placed('c', 's3', 1, ['a']),
    ]);
    expect(unplaceRejection(b, 'a')).toBe('KEY-b, KEY-c depend on this and are still placed');
  });

  it('allows it when the dependents are in the backlog', () => {
    const b = board([placed('a', 's1', 1), ticket('b', ['a'])]);
    expect(unplaceRejection(b, 'a')).toBeNull();
  });
});

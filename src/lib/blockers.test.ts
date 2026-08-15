import { describe, expect, it } from 'vitest';
import type { Ticket } from '../model/types';
import { createsCycle } from './blockers';

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

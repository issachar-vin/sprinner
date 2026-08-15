import type { Ticket } from '../model/types';

/**
 * Cycles are rejected in the ticket editor rather than on the board: a cycle
 * makes both tickets permanently unplaceable, and every later blocker walk has
 * to defend against it.
 */
export function createsCycle(
  tickets: readonly Ticket[],
  ticketId: string,
  blockedBy: readonly string[],
): boolean {
  if (blockedBy.includes(ticketId)) return true;

  const blockersOf = new Map(tickets.map((ticket) => [ticket.id, ticket.blockedBy]));
  blockersOf.set(ticketId, [...blockedBy]);

  const seen = new Set<string>();
  const queue = [...blockedBy];

  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined || seen.has(current)) continue;
    if (current === ticketId) return true;
    seen.add(current);
    queue.push(...(blockersOf.get(current) ?? []));
  }

  return false;
}

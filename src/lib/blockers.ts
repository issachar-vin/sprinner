import type { Board, Sprint, Ticket } from '../model/types';

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

/** Tickets that list `ticketId` as a blocker. */
export function dependentsOf(board: Board, ticketId: string): Ticket[] {
  return board.tickets.filter((ticket) => ticket.blockedBy.includes(ticketId));
}

function startIndexOf(sprints: readonly Sprint[], ticket: Ticket): number | null {
  if (!ticket.placement) return null;
  const index = sprints.findIndex((sprint) => sprint.id === ticket.placement?.startSprintId);
  return index === -1 ? null : index;
}

function endIndexOf(sprints: readonly Sprint[], ticket: Ticket): number | null {
  const start = startIndexOf(sprints, ticket);
  return start === null || !ticket.placement ? null : start + ticket.placement.span - 1;
}

/**
 * Why this placement is not allowed, or null when it is fine.
 *
 * Blocked tickets are measured against their blocker's **end**, so a blocker
 * that spans several sprints cannot be overlapped. The same check runs in the
 * other direction: dragging a blocker later is rejected when that would swallow
 * a dependent that is already placed.
 *
 * Every rejection carries a reason — a silent no-op drop reads as a broken
 * feature.
 */
export function placementRejection(
  board: Board,
  ticketId: string,
  startSprintId: string,
  span: number,
): string | null {
  const ticket = board.tickets.find((entry) => entry.id === ticketId);
  const startIndex = board.sprints.findIndex((sprint) => sprint.id === startSprintId);
  if (!ticket || startIndex === -1) return null;

  const endIndex = startIndex + span - 1;

  for (const blockerId of ticket.blockedBy) {
    const blocker = board.tickets.find((entry) => entry.id === blockerId);
    if (!blocker) continue;

    if (!blocker.placement) {
      return `Blocked by ${blocker.key} — not yet placed`;
    }

    const blockerEnd = endIndexOf(board.sprints, blocker);
    if (blockerEnd !== null && startIndex < blockerEnd) {
      return `Blocked by ${blocker.key} — it runs to sprint ${blockerEnd + 1}`;
    }
  }

  for (const dependent of dependentsOf(board, ticketId)) {
    const dependentStart = startIndexOf(board.sprints, dependent);
    if (dependentStart !== null && dependentStart < endIndex) {
      return `${dependent.key} depends on this and starts in sprint ${dependentStart + 1}`;
    }
  }

  return null;
}

/** Why this ticket cannot go back to the backlog, or null when it can. */
export function unplaceRejection(board: Board, ticketId: string): string | null {
  const placed = dependentsOf(board, ticketId).filter((dependent) => dependent.placement !== null);
  if (placed.length === 0) return null;

  const keys = placed.map((dependent) => dependent.key).join(', ');
  return `${keys} ${placed.length === 1 ? 'depends' : 'depend'} on this and ${
    placed.length === 1 ? 'is' : 'are'
  } still placed`;
}

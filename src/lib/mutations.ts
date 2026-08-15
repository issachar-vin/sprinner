import type { Board, Ticket } from '../model/types';

/**
 * Every function here returns a new board. Nothing mutates in place, so the
 * undo stack can hold previous boards without them changing underneath it.
 */

function withTicket(board: Board, ticketId: string, update: (ticket: Ticket) => Ticket): Board {
  return {
    ...board,
    tickets: board.tickets.map((ticket) => (ticket.id === ticketId ? update(ticket) : ticket)),
  };
}

/** Moves `ticketId` directly above `beforeTicketId`, or to the end when null. */
function reorder(
  rowOrder: readonly string[],
  ticketId: string,
  beforeTicketId: string | null,
): string[] {
  // Dropping on your own row is a column move, not a request to change rows.
  if (beforeTicketId === ticketId) return [...rowOrder];

  const without = rowOrder.filter((id) => id !== ticketId);
  if (beforeTicketId === null) return [...without, ticketId];
  const index = without.indexOf(beforeTicketId);
  if (index === -1) return [...without, ticketId];
  return [...without.slice(0, index), ticketId, ...without.slice(index)];
}

/** Sets the placement without touching row order — the resize path. */
export function resizeTicket(
  board: Board,
  ticketId: string,
  startSprintId: string,
  span: number,
): Board {
  const startIndex = board.sprints.findIndex((sprint) => sprint.id === startSprintId);
  if (startIndex === -1) return board;

  const clamped = Math.min(Math.max(span, 1), board.sprints.length - startIndex);
  return withTicket(board, ticketId, (ticket) => ({
    ...ticket,
    placement: { startSprintId, span: clamped },
  }));
}

export function placeTicket(
  board: Board,
  ticketId: string,
  startSprintId: string,
  span: number,
  beforeTicketId: string | null,
): Board {
  const placed = resizeTicket(board, ticketId, startSprintId, span);
  if (placed === board) return board;
  return { ...placed, rowOrder: reorder(placed.rowOrder, ticketId, beforeTicketId) };
}

export function moveToBacklog(board: Board, ticketId: string): Board {
  return withTicket(board, ticketId, (ticket) => ({ ...ticket, placement: null }));
}

/** Tickets that list `ticketId` as a blocker. Named in the delete confirmation. */
export function dependentsOf(board: Board, ticketId: string): Ticket[] {
  return board.tickets.filter((ticket) => ticket.blockedBy.includes(ticketId));
}

/**
 * Deleting also strips the id from every `blockedBy`, otherwise the board keeps
 * references to a ticket that no longer exists.
 */
export function deleteTicket(board: Board, ticketId: string): Board {
  return {
    ...board,
    tickets: board.tickets
      .filter((ticket) => ticket.id !== ticketId)
      .map((ticket) =>
        ticket.blockedBy.includes(ticketId)
          ? { ...ticket, blockedBy: ticket.blockedBy.filter((id) => id !== ticketId) }
          : ticket,
      ),
    rowOrder: board.rowOrder.filter((id) => id !== ticketId),
  };
}

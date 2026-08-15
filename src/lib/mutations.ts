import type { Board, ISODate, Sprint, Ticket } from '../model/types';
import { nextSprint, reflowFrom } from './sprints';

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

/**
 * Returns every ticket to the backlog, keeping the sprints, the roster and the
 * tickets themselves. Unchanged boards are returned as-is so an already empty
 * board does not consume an undo step.
 */
export function clearPlacements(board: Board): Board {
  if (board.tickets.every((ticket) => ticket.placement === null)) return board;

  return {
    ...board,
    tickets: board.tickets.map((ticket) =>
      ticket.placement === null ? ticket : { ...ticket, placement: null },
    ),
  };
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

/** Everything the ticket editor owns. Placement and row order are not editable here. */
export type TicketEdit = Pick<
  Ticket,
  'key' | 'title' | 'points' | 'assigneeId' | 'blockedBy' | 'epicKey'
>;

export function updateTicket(board: Board, ticketId: string, edit: TicketEdit): Board {
  return withTicket(board, ticketId, (ticket) => ({ ...ticket, ...edit }));
}

export type SprintEdit = Pick<Sprint, 'name' | 'startDate' | 'endDate'>;

export function updateSprint(board: Board, sprintId: string, edit: SprintEdit): Board {
  return {
    ...board,
    sprints: board.sprints.map((sprint) =>
      sprint.id === sprintId ? { ...sprint, ...edit } : sprint,
    ),
  };
}

export function addSprint(board: Board, today: ISODate): Board {
  return { ...board, sprints: [...board.sprints, nextSprint(board.sprints, today)] };
}

/** Replaces the whole set. The setup wizard's one shot at a board with no sprints. */
export function replaceSprints(board: Board, sprints: Sprint[]): Board {
  return { ...board, sprints };
}

export function reflowSprints(board: Board, fromSprintId: string): Board {
  const index = board.sprints.findIndex((sprint) => sprint.id === fromSprintId);
  if (index === -1) return board;
  return { ...board, sprints: reflowFrom(board.sprints, index) };
}

export type RemovalImpact = {
  /** Their start sprint is going away, so they return to the backlog. */
  unplaced: Ticket[];
  /** They only span across it, so they lose a column. */
  clipped: Ticket[];
};

export function removalImpact(board: Board, sprintId: string): RemovalImpact {
  const removedIndex = board.sprints.findIndex((sprint) => sprint.id === sprintId);
  const impact: RemovalImpact = { unplaced: [], clipped: [] };
  if (removedIndex === -1) return impact;

  for (const ticket of board.tickets) {
    const placement = ticket.placement;
    if (!placement) continue;

    if (placement.startSprintId === sprintId) {
      impact.unplaced.push(ticket);
      continue;
    }

    const startIndex = board.sprints.findIndex((sprint) => sprint.id === placement.startSprintId);
    if (startIndex === -1) continue;
    if (removedIndex > startIndex && removedIndex <= startIndex + placement.span - 1) {
      impact.clipped.push(ticket);
    }
  }

  return impact;
}

/**
 * Spans clip and tickets that started in the removed sprint return to the
 * backlog. Both sets are named in the confirmation — see `removalImpact`.
 */
export function removeSprint(board: Board, sprintId: string): Board {
  const impact = removalImpact(board, sprintId);
  if (board.sprints.every((sprint) => sprint.id !== sprintId)) return board;

  const unplaced = new Set(impact.unplaced.map((ticket) => ticket.id));
  const clipped = new Set(impact.clipped.map((ticket) => ticket.id));

  return {
    ...board,
    sprints: board.sprints.filter((sprint) => sprint.id !== sprintId),
    tickets: board.tickets.map((ticket) => {
      if (unplaced.has(ticket.id)) return { ...ticket, placement: null };
      if (clipped.has(ticket.id) && ticket.placement) {
        return {
          ...ticket,
          placement: { ...ticket.placement, span: Math.max(ticket.placement.span - 1, 1) },
        };
      }
      return ticket;
    }),
  };
}

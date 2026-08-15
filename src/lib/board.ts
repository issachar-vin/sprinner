import type { Board, ISODate, Sprint, Ticket } from '../model/types';

export const ALL_ASSIGNEES = 'all';
export const UNASSIGNED = 'unassigned';

export type BoardRow = {
  ticket: Ticket;
  /** 1-based, ready for `grid-column`. */
  columnStart: number;
  span: number;
};

/** -1 when the date falls outside every sprint, including in a gap between two. */
export function sprintIndexForDate(sprints: readonly Sprint[], iso: ISODate): number {
  return sprints.findIndex((sprint) => sprint.startDate <= iso && iso <= sprint.endDate);
}

/**
 * Tickets absent from `rowOrder` keep their array order at the bottom. An
 * imported board with an incomplete `rowOrder` should render oddly, not lose
 * rows silently.
 */
function orderByRow(tickets: readonly Ticket[], rowOrder: readonly string[]): Ticket[] {
  const rank = new Map(rowOrder.map((id, index) => [id, index]));
  return tickets
    .map((ticket, index) => ({ ticket, rank: rank.get(ticket.id) ?? rowOrder.length + index }))
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.ticket);
}

export function boardRows(board: Board): BoardRow[] {
  const rows: BoardRow[] = [];

  for (const ticket of orderByRow(board.tickets, board.rowOrder)) {
    const placement = ticket.placement;
    if (!placement) continue;
    const index = board.sprints.findIndex((sprint) => sprint.id === placement.startSprintId);
    if (index === -1) continue;

    rows.push({
      ticket,
      columnStart: index + 1,
      // A span reaching past the last sprint would otherwise grow the grid.
      span: Math.min(placement.span, board.sprints.length - index),
    });
  }

  return rows;
}

export function backlogTickets(board: Board): Ticket[] {
  return orderByRow(
    board.tickets.filter((ticket) => ticket.placement === null),
    board.rowOrder,
  );
}

/** `assignee` is a member id, `ALL_ASSIGNEES`, or `UNASSIGNED`. */
export function filterTickets(
  tickets: readonly Ticket[],
  query: string,
  assignee: string,
): Ticket[] {
  const needle = query.trim().toLowerCase();

  return tickets.filter((ticket) => {
    if (assignee === UNASSIGNED && ticket.assigneeId !== null) return false;
    if (assignee !== UNASSIGNED && assignee !== ALL_ASSIGNEES && ticket.assigneeId !== assignee) {
      return false;
    }
    if (!needle) return true;
    return `${ticket.key} ${ticket.title}`.toLowerCase().includes(needle);
  });
}

export function ticketKeysById(tickets: readonly Ticket[]): Map<string, string> {
  return new Map(tickets.map((ticket) => [ticket.id, ticket.key]));
}

export const BACKLOG_DROP_ID = 'backlog';

export type DropTarget =
  | { kind: 'backlog' }
  | {
      kind: 'cell';
      sprintId: string;
      /** Row to insert above; null appends to the bottom of the board. */
      beforeTicketId: string | null;
    };

const CELL_PREFIX = 'cell';
const END_ROW = 'end';

/**
 * Droppable ids carry their target, so the drop handler never has to look up
 * where a cell was — dnd-kit hands the answer back directly.
 */
export function cellDropId(sprintId: string, beforeTicketId: string | null): string {
  return `${CELL_PREFIX}:${sprintId}:${beforeTicketId ?? END_ROW}`;
}

export function parseDropId(id: string): DropTarget | null {
  if (id === BACKLOG_DROP_ID) return { kind: 'backlog' };

  const [prefix, sprintId, row] = id.split(':');
  if (prefix !== CELL_PREFIX || !sprintId || !row) return null;

  return { kind: 'cell', sprintId, beforeTicketId: row === END_ROW ? null : row };
}

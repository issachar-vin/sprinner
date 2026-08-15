import { useDroppable } from '@dnd-kit/core';
import { useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { BoardRow } from '../lib/board';
import { boardRows, sprintIndexForDate, ticketKeysById } from '../lib/board';
import { calculateSprintCapacity } from '../lib/capacity';
import type { Board, ISODate } from '../model/types';
import type { BoardActions } from './actions';
import { assigneeHue, assigneeName } from './assignee';
import { DraggableTicket } from './DraggableTicket';
import { cellDropId } from './dropTarget';
import { PencilIcon } from './PencilIcon';
import { SprintHeader } from './SprintHeader';
import { TrashIcon } from './TrashIcon';
import { useSpanResize } from './useSpanResize';

type BoardViewProps = {
  board: Board;
  today: ISODate;
  actions: BoardActions;
  /** Being emptied: its tickets are flying out and cards ending in it pull back. */
  evacuatingSprintId: string | null;
  /** Emptied already: the column itself is closing. */
  dissolvingSprintId: string | null;
};

type DropCellProps = {
  sprintId: string;
  beforeTicketId: string | null;
  column: number;
  row: number;
};

function DropCell({ sprintId, beforeTicketId, column, row }: DropCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: cellDropId(sprintId, beforeTicketId) });

  return (
    <div
      ref={setNodeRef}
      className="board-drop"
      data-over={isOver}
      style={{ gridColumn: column, gridRow: row }}
    />
  );
}

export function BoardView({
  board,
  today,
  actions,
  evacuatingSprintId,
  dissolvingSprintId,
}: BoardViewProps) {
  const { sprints, members, tickets, timeOff, settings } = board;
  const gridRef = useRef<HTMLDivElement>(null);

  const commitResize = useCallback(
    (ticketId: string, startIndex: number, span: number) => {
      const sprint = sprints[startIndex];
      if (!sprint) return;
      actions.resizeTicket(ticketId, sprint.id, span);
    },
    [sprints, actions],
  );

  const { preview, beginResize } = useSpanResize(gridRef, commitResize);

  if (sprints.length === 0) {
    return (
      <section className="board board--empty" aria-label="Sprint board">
        <h2>No sprints yet</h2>
        <p className="muted">Set up a run of sprints, or load the demo board to see the grid.</p>
        <button type="button" className="primary" onClick={actions.setUpSprints}>
          Set up sprints
        </button>
      </section>
    );
  }

  const rows = boardRows(board);
  const keys = ticketKeysById(tickets);
  const doomedIndex = sprints.findIndex(
    (sprint) => sprint.id === (evacuatingSprintId ?? dissolvingSprintId),
  );

  /**
   * A card whose span ends in the doomed column pulls its right edge back one
   * column while the board is being emptied. Cards that span straight through
   * keep their shape and simply narrow later, as the column closes underneath
   * them.
   */
  const endsInDoomed = (row: BoardRow) =>
    evacuatingSprintId !== null &&
    doomedIndex !== -1 &&
    row.columnStart - 1 < doomedIndex &&
    row.columnStart - 1 + row.span - 1 === doomedIndex;

  /**
   * Columns are equal width, so the target is a fraction of the card's own
   * width and needs no measuring. Only the fraction is passed down; the width
   * it produces lives with the rest of the layout in index.css.
   */
  const retract = (row: BoardRow): CSSProperties =>
    endsInDoomed(row) ? ({ '--retract': (row.span - 1) / row.span } as CSSProperties) : {};

  /**
   * The card follows the pointer in raw pixels while a resize is in flight and
   * only snaps to a column on release. Only the travel is passed down; how it
   * turns into width lives with the rest of the layout in index.css.
   */
  const stretch = (ticketId: string): CSSProperties =>
    preview?.ticketId === ticketId ? ({ '--stretch': `${preview.delta}px` } as CSSProperties) : {};
  const currentIndex = sprintIndexForDate(sprints, today);

  const gridStyle: CSSProperties = {
    // Explicit tracks rather than repeat(), and both states written as minmax():
    // the track count has to match on both sides of the transition, and a
    // minmax() track will not interpolate towards a bare length.
    gridTemplateColumns: sprints
      .map((sprint) =>
        sprint.id === dissolvingSprintId ? 'minmax(0px, 0fr)' : 'minmax(16rem, 1fr)',
      )
      .join(' '),
    // Explicit rows so the column backgrounds can span `1 / -1`. The extra row
    // is the drop zone that appends below every placed ticket.
    gridTemplateRows: `auto repeat(${rows.length + 1}, minmax(4.5rem, auto))`,
  };

  return (
    <section className="board" aria-label="Sprint board">
      <div className="board-toolbar">
        <button type="button" className="secondary" onClick={actions.addSprint}>
          Add sprint
        </button>
      </div>

      <div className="board-scroll">
        <div
          className="board-grid"
          ref={gridRef}
          data-empty={rows.length === 0 ? 'true' : undefined}
          style={gridStyle}
        >
          {sprints.map((sprint, index) => (
            <div
              key={`column-${sprint.id}`}
              className="board-column"
              data-column-index={index}
              data-current={index === currentIndex}
              data-dissolving={sprint.id === dissolvingSprintId}
              style={{ gridColumn: index + 1, gridRow: '1 / -1' }}
            />
          ))}

          {sprints.map((sprint, index) => (
            <div
              key={`header-${sprint.id}`}
              className="board-head"
              data-dissolving={sprint.id === dissolvingSprintId}
              style={{ gridColumn: index + 1, gridRow: 1 }}
            >
              <SprintHeader
                sprint={sprint}
                number={index + 1}
                onEdit={() => actions.editSprint(sprint.id)}
                onRemove={() => actions.removeSprint(sprint.id)}
                capacity={calculateSprintCapacity(
                  sprint,
                  sprints,
                  members,
                  tickets,
                  timeOff,
                  settings,
                )}
                isCurrent={index === currentIndex}
              />
            </div>
          ))}

          {sprints.map((sprint, columnIndex) =>
            Array.from({ length: rows.length + 1 }, (_, rowIndex) => {
              const beforeTicketId = rows[rowIndex]?.ticket.id ?? null;
              return (
                <DropCell
                  key={`drop-${sprint.id}-${beforeTicketId ?? 'end'}`}
                  sprintId={sprint.id}
                  beforeTicketId={beforeTicketId}
                  column={columnIndex + 1}
                  row={rowIndex + 2}
                />
              );
            }),
          )}

          {rows.length === 0 && (
            <p className="board-note muted" style={{ gridColumn: '1 / -1', gridRow: 2 }}>
              Nothing is planned yet — drag a ticket from the backlog.
            </p>
          )}

          {rows.map((row, rowIndex) => (
            <div
              key={row.ticket.id}
              className="board-cell"
              data-leaving={
                row.ticket.placement?.startSprintId === (evacuatingSprintId ?? dissolvingSprintId)
              }
              data-retracting={endsInDoomed(row)}
              data-resizing={preview?.ticketId === row.ticket.id ? preview.edge : undefined}
              style={{
                gridColumn: `${row.columnStart} / span ${row.span}`,
                gridRow: rowIndex + 2,
                ...retract(row),
                ...stretch(row.ticket.id),
              }}
            >
              <DraggableTicket
                ticket={row.ticket}
                assignee={assigneeName(members, row.ticket.assigneeId)}
                hue={assigneeHue(members, row.ticket.assigneeId)}
                blockedByKeys={row.ticket.blockedBy.map((id) => keys.get(id) ?? id)}
              >
                <div className="ticket-actions">
                  <button
                    type="button"
                    aria-label={`Edit ${row.ticket.key}`}
                    onClick={() => actions.editTicket(row.ticket.id)}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${row.ticket.key}`}
                    onClick={() => actions.deleteTicket(row.ticket.id)}
                  >
                    <TrashIcon />
                  </button>
                  <button
                    type="button"
                    aria-label={`Return ${row.ticket.key} to the backlog`}
                    onClick={() => actions.unplaceTicket(row.ticket.id)}
                  >
                    ×
                  </button>
                </div>

                <span
                  className="resize-handle resize-handle--start"
                  aria-hidden="true"
                  data-testid={`resize-start-${row.ticket.key}`}
                  onPointerDown={(event) =>
                    beginResize(event, row.ticket.id, row.columnStart - 1, row.span, 'start')
                  }
                />
                <span
                  className="resize-handle resize-handle--end"
                  aria-hidden="true"
                  data-testid={`resize-end-${row.ticket.key}`}
                  onPointerDown={(event) =>
                    beginResize(event, row.ticket.id, row.columnStart - 1, row.span, 'end')
                  }
                />
              </DraggableTicket>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

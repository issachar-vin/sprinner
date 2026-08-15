import { useDroppable } from '@dnd-kit/core';
import { useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { boardRows, sprintIndexForDate, ticketKeysById } from '../lib/board';
import { calculateSprintCapacity } from '../lib/capacity';
import type { Board, ISODate } from '../model/types';
import { assigneeHue, assigneeName } from './assignee';
import { DraggableTicket } from './DraggableTicket';
import { cellDropId } from './dropTarget';
import { SprintHeader } from './SprintHeader';
import { TrashIcon } from './TrashIcon';
import { useSpanResize } from './useSpanResize';

type BoardViewProps = {
  board: Board;
  today: ISODate;
  onUnplace: (ticketId: string) => void;
  onDelete: (ticketId: string) => void;
  onResize: (ticketId: string, startSprintId: string, span: number) => void;
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

export function BoardView({ board, today, onUnplace, onDelete, onResize }: BoardViewProps) {
  const { sprints, members, tickets, timeOff, settings } = board;
  const gridRef = useRef<HTMLDivElement>(null);

  const commitResize = useCallback(
    (ticketId: string, startIndex: number, span: number) => {
      const sprint = sprints[startIndex];
      if (!sprint) return;
      onResize(ticketId, sprint.id, span);
    },
    [sprints, onResize],
  );

  const { preview, beginResize } = useSpanResize(gridRef, commitResize);

  if (sprints.length === 0) {
    return (
      <section className="board board--empty" aria-label="Sprint board">
        <h2>No sprints yet</h2>
        <p className="muted">Load the demo board to see the grid.</p>
      </section>
    );
  }

  const rows = boardRows(board);
  const keys = ticketKeysById(tickets);

  /**
   * The card follows the pointer in raw pixels while a resize is in flight and
   * only snaps to a column on release. Only the travel is passed down; how it
   * turns into width lives with the rest of the layout in index.css.
   */
  const stretch = (ticketId: string): CSSProperties =>
    preview?.ticketId === ticketId ? ({ '--stretch': `${preview.delta}px` } as CSSProperties) : {};
  const currentIndex = sprintIndexForDate(sprints, today);

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${sprints.length}, minmax(16rem, 1fr))`,
    // Explicit rows so the column backgrounds can span `1 / -1`. The extra row
    // is the drop zone that appends below every placed ticket.
    gridTemplateRows: `auto repeat(${rows.length + 1}, minmax(4.5rem, auto))`,
  };

  return (
    <section className="board" aria-label="Sprint board">
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
              style={{ gridColumn: index + 1, gridRow: '1 / -1' }}
            />
          ))}

          {sprints.map((sprint, index) => (
            <div
              key={`header-${sprint.id}`}
              className="board-head"
              style={{ gridColumn: index + 1, gridRow: 1 }}
            >
              <SprintHeader
                sprint={sprint}
                number={index + 1}
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
              data-resizing={preview?.ticketId === row.ticket.id ? preview.edge : undefined}
              style={{
                gridColumn: `${row.columnStart} / span ${row.span}`,
                gridRow: rowIndex + 2,
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
                    aria-label={`Delete ${row.ticket.key}`}
                    onClick={() => onDelete(row.ticket.id)}
                  >
                    <TrashIcon />
                  </button>
                  <button
                    type="button"
                    aria-label={`Return ${row.ticket.key} to the backlog`}
                    onClick={() => onUnplace(row.ticket.id)}
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

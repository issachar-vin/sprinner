import type { CSSProperties } from 'react';
import { boardRows, sprintIndexForDate, ticketKeysById } from '../lib/board';
import { calculateSprintCapacity } from '../lib/capacity';
import type { Board, ISODate } from '../model/types';
import { assigneeHue, assigneeName } from './assignee';
import { SprintHeader } from './SprintHeader';
import { TicketCard } from './TicketCard';

type BoardViewProps = {
  board: Board;
  today: ISODate;
};

export function BoardView({ board, today }: BoardViewProps) {
  const { sprints, members, tickets, timeOff, settings } = board;

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
  const currentIndex = sprintIndexForDate(sprints, today);

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${sprints.length}, minmax(16rem, 1fr))`,
    // Explicit rows so the column backgrounds can span `1 / -1`.
    gridTemplateRows:
      rows.length > 0 ? `auto repeat(${rows.length}, minmax(4.5rem, auto))` : 'auto',
  };

  return (
    <section className="board" aria-label="Sprint board">
      <div className="board-scroll">
        <div className="board-grid" style={gridStyle}>
          {sprints.map((sprint, index) => (
            <div
              key={`column-${sprint.id}`}
              className="board-column"
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

          {rows.map((row, rowIndex) => (
            <div
              key={row.ticket.id}
              className="board-cell"
              style={{
                gridColumn: `${row.columnStart} / span ${row.span}`,
                gridRow: rowIndex + 2,
              }}
            >
              <TicketCard
                ticket={row.ticket}
                assignee={assigneeName(members, row.ticket.assigneeId)}
                hue={assigneeHue(members, row.ticket.assigneeId)}
                blockedByKeys={row.ticket.blockedBy.map((id) => keys.get(id) ?? id)}
              />
            </div>
          ))}
        </div>

        {rows.length === 0 && (
          <p className="board-note muted">
            Nothing is planned yet — every ticket is in the backlog.
          </p>
        )}
      </div>
    </section>
  );
}

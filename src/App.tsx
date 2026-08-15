import { Backlog } from './board/Backlog';
import { BoardView } from './board/BoardView';
import { backlogTickets } from './lib/board';
import { todayISO } from './lib/dates';
import { createDemoBoard } from './lib/seed';
import { useBoardStore } from './store/boardStore';
import { ThemeToggle } from './theme/ThemeToggle';

export default function App() {
  const board = useBoardStore((state) => state.board);
  const replaceBoard = useBoardStore((state) => state.replaceBoard);
  const resetBoard = useBoardStore((state) => state.resetBoard);

  const backlog = backlogTickets(board);
  const planned = board.tickets.length - backlog.length;
  const isEmpty = board.sprints.length === 0 && board.tickets.length === 0;

  return (
    <div className="shell">
      <header className="masthead">
        <div>
          <h1>Sprinner</h1>
          <p className="muted">
            {board.members.length} members · {board.sprints.length} sprints · {planned} planned ·{' '}
            {backlog.length} in backlog
          </p>
        </div>
        <div className="masthead-actions">
          {isEmpty ? (
            <button
              type="button"
              className="primary"
              onClick={() => replaceBoard(createDemoBoard())}
            >
              Load demo board
            </button>
          ) : (
            <button type="button" className="secondary" onClick={resetBoard}>
              Clear board
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {isEmpty ? (
        <section className="empty-workspace">
          <h2>Nothing to plan yet</h2>
          <p className="muted">
            Import arrives in a later phase. Load the demo board to see sprints, capacity and the
            backlog.
          </p>
        </section>
      ) : (
        <div className="workspace">
          <Backlog tickets={backlog} members={board.members} allTickets={board.tickets} />
          <BoardView board={board} today={todayISO()} />
        </div>
      )}
    </div>
  );
}

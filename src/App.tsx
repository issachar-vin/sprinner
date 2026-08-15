import { useState } from 'react';
import { BoardWorkspace } from './board/BoardWorkspace';
import { ConfirmDialog } from './board/ConfirmDialog';
import { backlogTickets } from './lib/board';
import { createDemoBoard } from './lib/seed';
import { useBoardStore } from './store/boardStore';
import { ThemeToggle } from './theme/ThemeToggle';

export default function App() {
  const board = useBoardStore((state) => state.board);
  const replaceBoard = useBoardStore((state) => state.replaceBoard);
  const clearPlacements = useBoardStore((state) => state.clearPlacements);
  const resetBoard = useBoardStore((state) => state.resetBoard);

  const [confirmingReset, setConfirmingReset] = useState(false);

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
            <>
              <button type="button" className="secondary" onClick={clearPlacements}>
                Clear board
              </button>
              <button type="button" className="secondary" onClick={() => setConfirmingReset(true)}>
                Reset board
              </button>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      <BoardWorkspace />

      {confirmingReset && (
        <ConfirmDialog
          title="Reset the board?"
          body={
            <>
              <p>Every sprint, ticket and member is discarded and the board goes back to empty.</p>
              <p className="dialog-warning">
                This cannot be undone — the undo history goes with it. To only empty the columns,
                use Clear board instead.
              </p>
            </>
          }
          confirmLabel="Reset board"
          onConfirm={() => {
            resetBoard();
            setConfirmingReset(false);
          }}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  );
}

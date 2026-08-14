import { useBoardStore } from './store/boardStore';
import { SCHEMA_VERSION } from './model/types';

/**
 * Phase 0 placeholder. The board UI lands in phase 1; this exists to prove the
 * stack boots and that persistence survives a reload.
 */
export default function App() {
  const board = useBoardStore((state) => state.board);
  const resetBoard = useBoardStore((state) => state.resetBoard);

  return (
    <main className="shell">
      <h1>Sprinner</h1>
      <p className="muted">Sprint planning board — phase 0 scaffold.</p>

      <dl className="stats">
        <div>
          <dt>Schema version</dt>
          <dd>{SCHEMA_VERSION}</dd>
        </div>
        <div>
          <dt>Sprints</dt>
          <dd>{board.sprints.length}</dd>
        </div>
        <div>
          <dt>Tickets</dt>
          <dd>{board.tickets.length}</dd>
        </div>
        <div>
          <dt>Members</dt>
          <dd>{board.members.length}</dd>
        </div>
        <div>
          <dt>Days per point</dt>
          <dd>{board.settings.daysPerPoint}</dd>
        </div>
      </dl>

      <button type="button" onClick={resetBoard}>
        Reset board
      </button>
    </main>
  );
}

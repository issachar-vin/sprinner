import { useBoardStore } from './store/boardStore';
import { SCHEMA_VERSION } from './model/types';
import { ThemeToggle } from './theme/ThemeToggle';

const SWATCHES = [
  { name: 'Dark Teal', value: '#005151', fg: '#ffffff' },
  { name: 'Light Teal', value: '#30CEBB', fg: '#13352C' },
  { name: 'Forest', value: '#13352C', fg: '#E6EEEE' },
  { name: 'Chartreuse', value: '#E5FF1F', fg: '#13352C' },
  { name: 'Cream', value: '#F7EFE3', fg: '#13352C' },
];

/**
 * Phase 0 placeholder. The board UI lands in phase 1; this exists to prove the
 * stack boots, that persistence survives a reload, and that both themes read
 * correctly.
 */
export default function App() {
  const board = useBoardStore((state) => state.board);
  const resetBoard = useBoardStore((state) => state.resetBoard);

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <h1>Sprinner</h1>
          <p className="muted">Sprint planning board — phase 0 scaffold.</p>
        </div>
        <ThemeToggle />
      </header>

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

      <div className="swatches">
        {SWATCHES.map((swatch) => (
          <div
            key={swatch.name}
            className="swatch"
            style={{ background: swatch.value, color: swatch.fg }}
          >
            {swatch.name}
            <span>{swatch.value}</span>
          </div>
        ))}
      </div>

      <button type="button" className="primary" onClick={resetBoard}>
        Reset board
      </button>
    </main>
  );
}

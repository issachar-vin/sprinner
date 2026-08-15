import type { SprintCapacity } from '../lib/capacity';
import { formatDayMonth } from '../lib/dates';
import type { Sprint } from '../model/types';

type SprintHeaderProps = {
  sprint: Sprint;
  /** Derived from board position, never stored. */
  number: number;
  capacity: SprintCapacity;
  isCurrent: boolean;
};

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function SprintHeader({ sprint, number, capacity, isCurrent }: SprintHeaderProps) {
  const balance = capacity.balance;

  return (
    <header className="sprint-header">
      <div className="sprint-title">
        <h2>{sprint.name ?? `Sprint ${number}`}</h2>
        {isCurrent && <span className="today-chip">Today</span>}
      </div>
      <p className="sprint-dates">
        {formatDayMonth(sprint.startDate)} – {formatDayMonth(sprint.endDate)}
      </p>

      <dl className="sprint-stats">
        <div>
          <dt>Committed</dt>
          <dd>
            {formatPoints(capacity.committed)}
            {capacity.creep > 0 && (
              <span className="creep">(+{formatPoints(capacity.creep)} creep)</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Bandwidth</dt>
          <dd>{formatPoints(capacity.bandwidthPoints)}</dd>
        </div>
      </dl>

      <div className="sprint-foot">
        <span className={`balance balance--${capacity.color}`}>
          {balance > 0 ? `+${formatPoints(balance)}` : formatPoints(balance)} balance
        </span>
        {capacity.unestimated > 0 && (
          <span className="unestimated">{capacity.unestimated} unestimated</span>
        )}
      </div>
    </header>
  );
}

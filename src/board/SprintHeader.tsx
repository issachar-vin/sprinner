import type { SprintCapacity } from '../lib/capacity';
import { formatDayMonth } from '../lib/dates';
import type { Sprint } from '../model/types';
import { TrashIcon } from './TrashIcon';

type SprintHeaderProps = {
  sprint: Sprint;
  /** Derived from board position, never stored. */
  number: number;
  capacity: SprintCapacity;
  isCurrent: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function SprintHeader({
  sprint,
  number,
  capacity,
  isCurrent,
  onEdit,
  onRemove,
}: SprintHeaderProps) {
  const balance = capacity.balance;

  return (
    <header className="sprint-header">
      <div className="sprint-title">
        <h2>
          <button type="button" onClick={onEdit} aria-label={`Edit sprint ${number}`}>
            {sprint.name ?? `Sprint ${number}`}
          </button>
        </h2>
        {isCurrent && <span className="today-chip">Today</span>}
        <button
          type="button"
          className="sprint-remove"
          aria-label={`Remove sprint ${number}`}
          onClick={onRemove}
        >
          <TrashIcon />
        </button>
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

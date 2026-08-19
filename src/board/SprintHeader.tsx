import type { CSSProperties } from 'react';
import type { MemberLoad, SprintCapacity } from '../lib/capacity';
import { formatDayMonth } from '../lib/dates';
import type { Member, Sprint } from '../model/types';
import { assigneeHue, initialsOf } from './assignee';
import { TrashIcon } from './TrashIcon';

type SprintHeaderProps = {
  sprint: Sprint;
  /** Derived from board position, never stored. */
  number: number;
  capacity: SprintCapacity;
  /** Per assignee, so a healthy team total cannot hide one overloaded member. */
  memberLoad: MemberLoad[];
  members: Member[];
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
  memberLoad,
  members,
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
            <span className="sprint-committed">{formatPoints(capacity.committed)}</span>
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

      {memberLoad.length > 0 && (
        <ul className="member-load">
          {memberLoad.map((load) => {
            const member = members.find((entry) => entry.id === load.assigneeId) ?? null;
            const hue = assigneeHue(members, load.assigneeId);
            return (
              <li
                key={load.assigneeId ?? 'unassigned'}
                style={{ '--assignee-hue': hue } as CSSProperties}
                data-unassigned={hue === null}
                title={`${member?.name ?? 'Unassigned'}: ${formatPoints(load.committed)} points${
                  load.unestimated > 0 ? `, ${load.unestimated} unestimated` : ''
                }`}
              >
                <span className="member-load-who">{initialsOf(member?.name ?? null)}</span>
                {formatPoints(load.committed)}
                {load.unestimated > 0 && (
                  <span className="member-load-open">+{load.unestimated}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

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

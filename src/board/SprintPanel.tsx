import { useId, useState } from 'react';
import type { SprintEdit } from '../lib/mutations';
import type { SprintDateIssue } from '../lib/sprints';
import type { Sprint } from '../model/types';
import { Modal } from './Modal';

type SprintPanelProps = {
  sprint: Sprint;
  /** Derived from board position, never stored. */
  number: number;
  /** Every issue on the board; the panel picks out the two boundaries it owns. */
  issues: SprintDateIssue[];
  previousSprintId: string | null;
  nextSprintId: string | null;
  onSave: (edit: SprintEdit) => void;
  /** Re-flow starts at the sprint *before* the boundary, so the gap closes. */
  onReflow: (fromSprintId: string) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function SprintPanel({
  sprint,
  number,
  issues,
  previousSprintId,
  nextSprintId,
  onSave,
  onReflow,
  onRemove,
  onClose,
}: SprintPanelProps) {
  const [name, setName] = useState(sprint.name ?? '');
  const [startDate, setStartDate] = useState(sprint.startDate);
  const [endDate, setEndDate] = useState(sprint.endDate);
  const [error, setError] = useState<string | null>(null);

  const ids = { name: useId(), start: useId(), end: useId() };

  const inverted = issues.some(
    (issue) => issue.sprintId === sprint.id && issue.kind === 'inverted',
  );
  const boundaryBefore = issues.find(
    (issue) => issue.sprintId === sprint.id && issue.kind !== 'inverted',
  );
  const boundaryAfter = issues.find(
    (issue) => issue.sprintId === nextSprintId && issue.kind !== 'inverted',
  );

  const submit = () => {
    if (endDate < startDate) {
      setError('The end date must not be before the start date.');
      return;
    }
    onSave({ name: name.trim() === '' ? null : name.trim(), startDate, endDate });
  };

  return (
    <Modal title={`Edit sprint ${number}`} onClose={onClose}>
      <div className="panel-form">
        <label htmlFor={ids.name}>Name</label>
        <input
          id={ids.name}
          placeholder={`Sprint ${number}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label htmlFor={ids.start}>Start</label>
        <input
          id={ids.start}
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <label htmlFor={ids.end}>End</label>
        <input
          id={ids.end}
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </div>

      {error && <p className="dialog-warning">{error}</p>}

      {inverted && <p className="dialog-warning">The end date is before the start date.</p>}

      {boundaryBefore && previousSprintId && (
        <div className="dialog-warning">
          <p>
            {boundaryBefore.kind === 'gap'
              ? 'There is a gap between this sprint and the one before it.'
              : 'This sprint overlaps the one before it.'}
          </p>
          <button type="button" className="secondary" onClick={() => onReflow(previousSprintId)}>
            Re-flow following sprints
          </button>
        </div>
      )}

      {boundaryAfter && (
        <div className="dialog-warning">
          <p>
            {boundaryAfter.kind === 'gap'
              ? 'There is a gap between this sprint and the one after it.'
              : 'This sprint overlaps the one after it.'}
          </p>
          <button type="button" className="secondary" onClick={() => onReflow(sprint.id)}>
            Re-flow following sprints
          </button>
        </div>
      )}

      <div className="dialog-actions">
        <button type="button" className="danger" onClick={onRemove}>
          Remove sprint
        </button>
        <span className="dialog-spacer" />
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={submit}>
          Save
        </button>
      </div>
    </Modal>
  );
}

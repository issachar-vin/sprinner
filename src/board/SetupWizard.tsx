import { useId, useState } from 'react';
import { DEFAULT_SPRINT_LENGTH_DAYS, generateSprints } from '../lib/sprints';
import type { ISODate, Sprint } from '../model/types';
import { Modal } from './Modal';

type SetupWizardProps = {
  today: ISODate;
  onCreate: (sprints: Sprint[]) => void;
  onClose: () => void;
};

export function SetupWizard({ today, onCreate, onClose }: SetupWizardProps) {
  const [start, setStart] = useState(today);
  const [count, setCount] = useState('6');
  const [length, setLength] = useState(String(DEFAULT_SPRINT_LENGTH_DAYS));
  const [error, setError] = useState<string | null>(null);

  const ids = { start: useId(), count: useId(), length: useId() };

  const submit = () => {
    const sprintCount = Number(count);
    const sprintLength = Number(length);

    if (!Number.isInteger(sprintCount) || sprintCount < 1) {
      setError('Number of sprints must be a whole number of at least 1.');
      return;
    }
    if (!Number.isInteger(sprintLength) || sprintLength < 1) {
      setError('Sprint length must be a whole number of calendar days.');
      return;
    }

    onCreate(generateSprints(start, sprintCount, sprintLength));
  };

  return (
    <Modal title="Set up sprints" onClose={onClose}>
      <div className="panel-form">
        <label htmlFor={ids.start}>First sprint starts</label>
        <input
          id={ids.start}
          type="date"
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />

        <label htmlFor={ids.count}>Number of sprints</label>
        <input
          id={ids.count}
          inputMode="numeric"
          value={count}
          onChange={(event) => setCount(event.target.value)}
        />

        <label htmlFor={ids.length}>Length in calendar days</label>
        <input
          id={ids.length}
          inputMode="numeric"
          value={length}
          onChange={(event) => setLength(event.target.value)}
        />
      </div>

      <p className="dialog-note muted">
        Ten working days is 14 calendar days. Workdays are derived from the dates, not entered.
        Sprints are generated back to back and can be edited individually afterwards.
      </p>

      {error && <p className="dialog-warning">{error}</p>}

      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={submit}>
          Create sprints
        </button>
      </div>
    </Modal>
  );
}

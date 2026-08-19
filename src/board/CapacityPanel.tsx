import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { countWorkdays } from '../lib/dates';
import type { Board, BoardSettings, NewTimeOff, TimeOff } from '../model/types';
import { assigneeHue, initialsOf } from './assignee';
import { Drawer } from './Drawer';
import { TrashIcon } from './TrashIcon';

type CapacityPanelProps = {
  board: Board;
  today: string;
  onAddMember: (name: string) => void;
  onRenameMember: (memberId: string, name: string) => void;
  onRemoveMember: (memberId: string) => void;
  onAddTimeOff: (entry: NewTimeOff) => void;
  onRemoveTimeOff: (entryId: string) => void;
  onUpdateSettings: (settings: BoardSettings) => void;
  onClose: () => void;
};

const HOLIDAY = 'holiday';

/**
 * Everything that feeds the bandwidth number, in one place: who is on the team,
 * when they are away, and how a point converts to days.
 */
export function CapacityPanel({
  board,
  today,
  onAddMember,
  onRenameMember,
  onRemoveMember,
  onAddTimeOff,
  onRemoveTimeOff,
  onUpdateSettings,
  onClose,
}: CapacityPanelProps) {
  const [newMember, setNewMember] = useState('');
  const [kind, setKind] = useState<TimeOff['type']>(HOLIDAY);
  const [memberId, setMemberId] = useState('');
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [daysPerPoint, setDaysPerPoint] = useState(String(board.settings.daysPerPoint));
  const [green, setGreen] = useState(String(board.settings.thresholds.green));
  const [yellow, setYellow] = useState(String(board.settings.thresholds.yellow));
  const [error, setError] = useState<string | null>(null);

  const ids = {
    member: useId(),
    kind: useId(),
    who: useId(),
    label: useId(),
    start: useId(),
    end: useId(),
    days: useId(),
    green: useId(),
    yellow: useId(),
  };

  const addMember = () => {
    if (newMember.trim() === '') return;
    onAddMember(newMember.trim());
    setNewMember('');
  };

  const addTimeOff = () => {
    if (endDate < startDate) {
      setError('The end date must not be before the start date.');
      return;
    }
    if (kind === 'pto' && memberId === '') {
      setError('Choose whose time off this is.');
      return;
    }

    setError(null);
    const range = { startDate, endDate, label: label.trim() === '' ? 'Time off' : label.trim() };
    onAddTimeOff(
      kind === HOLIDAY ? { type: HOLIDAY, ...range } : { type: 'pto', memberId, ...range },
    );
    setLabel('');
  };

  const saveSettings = () => {
    const days = Number(daysPerPoint);
    if (!Number.isFinite(days) || days <= 0) {
      setError('Days per point must be a positive number.');
      return;
    }

    setError(null);
    onUpdateSettings({
      daysPerPoint: days,
      thresholds: { green: Number(green) || 0, yellow: Number(yellow) || 0 },
    });
  };

  return (
    <Drawer title="Team and capacity" onClose={onClose}>
      <section className="panel-section">
        <h3>
          Members <span className="panel-count">{board.members.length}</span>
        </h3>

        {board.members.length === 0 ? (
          <p className="muted">No one on the team yet — every sprint has zero bandwidth.</p>
        ) : (
          <ul className="roster">
            {board.members.map((member) => (
              <li key={member.id}>
                <span
                  className="roster-avatar"
                  style={
                    { '--assignee-hue': assigneeHue(board.members, member.id) } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  {initialsOf(member.name)}
                </span>
                <input
                  aria-label={`Name of ${member.name}`}
                  value={member.name}
                  onChange={(event) => onRenameMember(member.id, event.target.value)}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${member.name}`}
                  onClick={() => onRemoveMember(member.id)}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="panel-row">
          <label className="visually-hidden" htmlFor={ids.member}>
            New member name
          </label>
          <input
            id={ids.member}
            value={newMember}
            placeholder="Add a member"
            onChange={(event) => setNewMember(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && addMember()}
          />
          <button type="button" className="secondary" onClick={addMember}>
            Add
          </button>
        </div>
      </section>

      <section className="panel-section">
        <h3>
          Time off <span className="panel-count">{board.timeOff.length}</span>
        </h3>

        {board.timeOff.length === 0 ? (
          <p className="muted">No holidays or leave recorded.</p>
        ) : (
          <ul className="timeoff">
            {board.timeOff.map((entry) => {
              const who =
                entry.type === 'pto'
                  ? (board.members.find((member) => member.id === entry.memberId)?.name ??
                    'Former member')
                  : 'Everyone';
              const workdays = countWorkdays(entry.startDate, entry.endDate ?? entry.startDate);
              const range =
                entry.endDate && entry.endDate !== entry.startDate
                  ? `${entry.startDate} – ${entry.endDate}`
                  : entry.startDate;

              return (
                <li key={entry.id}>
                  <span className="timeoff-badge" data-kind={entry.type}>
                    {entry.type === 'pto' ? 'Leave' : 'Holiday'}
                  </span>
                  <span className="timeoff-detail">
                    <strong>{entry.label}</strong>
                    <span className="muted">
                      {who} · {range} · {workdays} workday{workdays === 1 ? '' : 's'}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${entry.label}`}
                    onClick={() => onRemoveTimeOff(entry.id)}
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="stacked-form">
          <div>
            <label htmlFor={ids.kind}>Type</label>
            <select
              id={ids.kind}
              value={kind}
              onChange={(event) => setKind(event.target.value as TimeOff['type'])}
            >
              <option value={HOLIDAY}>Company holiday</option>
              <option value="pto">Time off for one member</option>
            </select>
          </div>

          {kind === 'pto' && (
            <div>
              <label htmlFor={ids.who}>Member</label>
              <select
                id={ids.who}
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
              >
                <option value="">Choose a member</option>
                {board.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor={ids.label}>Label</label>
            <input
              id={ids.label}
              value={label}
              placeholder="Time off"
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="stacked-pair">
            <div>
              <label htmlFor={ids.start}>From</label>
              <input
                id={ids.start}
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor={ids.end}>To</label>
              <input
                id={ids.end}
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="panel-row panel-row--end">
          <button type="button" className="secondary" onClick={addTimeOff}>
            Add time off
          </button>
        </div>
      </section>

      <section className="panel-section">
        <h3>Conversion</h3>

        <div className="stacked-form">
          <div>
            <label htmlFor={ids.days}>Days per point</label>
            <input
              id={ids.days}
              inputMode="decimal"
              value={daysPerPoint}
              onChange={(event) => setDaysPerPoint(event.target.value)}
            />
          </div>

          <div className="stacked-pair">
            <div>
              <label htmlFor={ids.green}>Green above</label>
              <input
                id={ids.green}
                inputMode="decimal"
                value={green}
                onChange={(event) => setGreen(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor={ids.yellow}>Yellow above</label>
              <input
                id={ids.yellow}
                inputMode="decimal"
                value={yellow}
                onChange={(event) => setYellow(event.target.value)}
              />
            </div>
          </div>
        </div>

        <p className="panel-note muted">
          Points and person-days are different units. Days per point is what makes subtracting one
          from the other legitimate.
        </p>

        <div className="panel-row panel-row--end">
          <button type="button" className="secondary" onClick={saveSettings}>
            Save conversion
          </button>
        </div>
      </section>

      {error && <p className="dialog-warning">{error}</p>}

      <div className="dialog-actions">
        <button type="button" className="primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Drawer>
  );
}

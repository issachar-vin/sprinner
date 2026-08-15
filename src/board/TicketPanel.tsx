import { useId, useState } from 'react';
import { createsCycle } from '../lib/blockers';
import type { TicketEdit } from '../lib/mutations';
import type { Member, Ticket } from '../model/types';
import { Drawer } from './Drawer';

type TicketPanelProps = {
  ticket: Ticket;
  members: Member[];
  /** Every ticket on the board — the blocker choices and the cycle check. */
  tickets: Ticket[];
  onSave: (edit: TicketEdit) => void;
  onClose: () => void;
};

const UNASSIGNED = '';

export function TicketPanel({ ticket, members, tickets, onSave, onClose }: TicketPanelProps) {
  const [key, setKey] = useState(ticket.key);
  const [title, setTitle] = useState(ticket.title);
  const [points, setPoints] = useState(ticket.points === null ? '' : String(ticket.points));
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId ?? UNASSIGNED);
  const [epicKey, setEpicKey] = useState(ticket.epicKey ?? '');
  const [blockedBy, setBlockedBy] = useState(ticket.blockedBy);
  const [error, setError] = useState<string | null>(null);

  const ids = {
    key: useId(),
    title: useId(),
    points: useId(),
    assignee: useId(),
    epic: useId(),
    blockedBy: useId(),
  };

  const submit = () => {
    if (key.trim() === '') {
      setError('Key is required.');
      return;
    }

    const parsedPoints = points.trim() === '' ? null : Number(points);
    if (parsedPoints !== null && (Number.isNaN(parsedPoints) || parsedPoints < 0)) {
      setError('Points must be a number, or empty for unestimated.');
      return;
    }

    if (createsCycle(tickets, ticket.id, blockedBy)) {
      setError('That blocker would create a cycle — both tickets would be unplaceable.');
      return;
    }

    onSave({
      key: key.trim(),
      title: title.trim(),
      points: parsedPoints,
      assigneeId: assigneeId === UNASSIGNED ? null : assigneeId,
      blockedBy,
      epicKey: epicKey.trim() === '' ? null : epicKey.trim(),
    });
  };

  return (
    <Drawer title={`Edit ${ticket.key}`} onClose={onClose}>
      <div className="panel-form">
        <label htmlFor={ids.key}>Key</label>
        <input id={ids.key} value={key} onChange={(event) => setKey(event.target.value)} />

        <label htmlFor={ids.title}>Title</label>
        <input id={ids.title} value={title} onChange={(event) => setTitle(event.target.value)} />

        <label htmlFor={ids.points}>Points</label>
        <input
          id={ids.points}
          inputMode="decimal"
          placeholder="Empty = unestimated"
          value={points}
          onChange={(event) => setPoints(event.target.value)}
        />

        <label htmlFor={ids.assignee}>Assignee</label>
        <select
          id={ids.assignee}
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
        >
          <option value={UNASSIGNED}>Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <label htmlFor={ids.epic}>Epic</label>
        <input id={ids.epic} value={epicKey} onChange={(event) => setEpicKey(event.target.value)} />

        <label htmlFor={ids.blockedBy}>Blocked by</label>
        <select
          id={ids.blockedBy}
          multiple
          size={4}
          value={blockedBy}
          onChange={(event) =>
            setBlockedBy(Array.from(event.target.selectedOptions, (option) => option.value))
          }
        >
          {tickets
            .filter((other) => other.id !== ticket.id)
            .map((other) => (
              <option key={other.id} value={other.id}>
                {other.key} — {other.title}
              </option>
            ))}
        </select>
      </div>

      {error && <p className="dialog-warning">{error}</p>}

      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={submit}>
          Save
        </button>
      </div>
    </Drawer>
  );
}

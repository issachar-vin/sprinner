import { useDroppable } from '@dnd-kit/core';
import { useId, useState } from 'react';
import { ALL_ASSIGNEES, filterTickets, ticketKeysById, UNASSIGNED } from '../lib/board';
import type { Member, Ticket } from '../model/types';
import { assigneeHue, assigneeName } from './assignee';
import { DraggableTicket } from './DraggableTicket';
import { BACKLOG_DROP_ID } from './dropTarget';
import { TrashIcon } from './TrashIcon';

type BacklogProps = {
  tickets: Ticket[];
  members: Member[];
  /** Every ticket on the board, so blocker keys resolve outside the backlog. */
  allTickets: Ticket[];
  onDelete: (ticketId: string) => void;
};

export function Backlog({ tickets, members, allTickets, onDelete }: BacklogProps) {
  const [query, setQuery] = useState('');
  const [assignee, setAssignee] = useState(ALL_ASSIGNEES);
  const searchId = useId();
  const filterId = useId();
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG_DROP_ID });

  const keys = ticketKeysById(allTickets);
  const visible = filterTickets(tickets, query, assignee);

  return (
    <section className="backlog" aria-label="Backlog" ref={setNodeRef} data-over={isOver}>
      <div className="backlog-head">
        <h2>
          Backlog <span className="backlog-count">{tickets.length}</span>
        </h2>

        <label className="visually-hidden" htmlFor={searchId}>
          Search backlog
        </label>
        <input
          id={searchId}
          type="search"
          placeholder="Search key or title"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <label className="visually-hidden" htmlFor={filterId}>
          Filter by assignee
        </label>
        <select
          id={filterId}
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
        >
          <option value={ALL_ASSIGNEES}>All assignees</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
          <option value={UNASSIGNED}>Unassigned</option>
        </select>
      </div>

      {tickets.length === 0 ? (
        <p className="backlog-empty muted">Backlog is empty — everything is on the board.</p>
      ) : visible.length === 0 ? (
        <p className="backlog-empty muted">No tickets match these filters.</p>
      ) : (
        <ul className="backlog-list">
          {visible.map((ticket) => (
            <li key={ticket.id}>
              <DraggableTicket
                ticket={ticket}
                assignee={assigneeName(members, ticket.assigneeId)}
                hue={assigneeHue(members, ticket.assigneeId)}
                blockedByKeys={ticket.blockedBy.map((id) => keys.get(id) ?? id)}
              >
                <div className="ticket-actions">
                  <button
                    type="button"
                    aria-label={`Delete ${ticket.key}`}
                    onClick={() => onDelete(ticket.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </DraggableTicket>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

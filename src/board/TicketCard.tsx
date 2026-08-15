import type { CSSProperties } from 'react';
import type { Ticket } from '../model/types';

type TicketCardProps = {
  ticket: Ticket;
  assignee: string | null;
  hue: number | null;
  blockedByKeys: string[];
};

export function TicketCard({ ticket, assignee, hue, blockedByKeys }: TicketCardProps) {
  const tint = { '--assignee-hue': hue } as CSSProperties;

  return (
    <article className="ticket" style={tint} data-unassigned={hue === null}>
      <div className="ticket-top">
        <span className="ticket-key">{ticket.key}</span>
        {ticket.points === null ? (
          <span className="ticket-points ticket-points--none" title="Unestimated">
            —
          </span>
        ) : (
          <span className="ticket-points">{ticket.points}</span>
        )}
      </div>

      <p className="ticket-title">{ticket.title}</p>

      <div className="ticket-foot">
        <span className="ticket-assignee">{assignee ?? 'Unassigned'}</span>
        {blockedByKeys.length > 0 && (
          <span className="ticket-blocked">Blocked by {blockedByKeys.join(', ')}</span>
        )}
      </div>
    </article>
  );
}

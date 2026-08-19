import { useId, useState } from 'react';
import type { Ticket } from '../model/types';

type TicketPickerProps = {
  label: string;
  candidates: Ticket[];
  onPick: (ticketId: string) => void;
};

/**
 * Type-to-filter picker over tickets. Empty input lists everything available
 * rather than nothing — with a couple of hundred tickets in an epic, a picker
 * that only responds to typing hides what you are allowed to choose.
 */
export function TicketPicker({ label, candidates, onPick }: TicketPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputId = useId();
  const listId = useId();

  const needle = query.trim().toLowerCase();
  const matches = candidates.filter((ticket) =>
    needle === '' ? true : `${ticket.key} ${ticket.title}`.toLowerCase().includes(needle),
  );
  const active = Math.min(highlight, Math.max(matches.length - 1, 0));

  const pick = (ticket: Ticket | undefined) => {
    if (!ticket) return;
    onPick(ticket.id);
    setQuery('');
    setHighlight(0);
    setOpen(false);
  };

  return (
    <div className="picker">
      <label className="visually-hidden" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={candidates.length === 0 ? 'No other tickets' : 'Search tickets'}
        disabled={candidates.length === 0}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setHighlight((current) => Math.min(current + 1, matches.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight((current) => Math.max(current - 1, 0));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            pick(matches[active]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        onBlur={() => setOpen(false)}
      />

      {open && (
        <ul className="picker-list" id={listId} role="listbox" aria-label={label}>
          {matches.length === 0 ? (
            <li className="picker-empty muted">Nothing matches</li>
          ) : (
            matches.map((ticket, index) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active}
                  onMouseEnter={() => setHighlight(index)}
                  // Keeps focus on the input, so choosing an option does not
                  // race the blur that closes the list.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(ticket)}
                >
                  <span className="picker-key">{ticket.key}</span>
                  <span className="picker-title">{ticket.title}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

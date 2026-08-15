import { useCallback, useEffect, useRef, useState } from 'react';

/** Kept in step with the transition on `.ticket-flight` in index.css. */
export const FLIGHT_MS = 320;

type Rect = { left: number; top: number; width: number; height: number };

export type TicketFlight = {
  ticketId: string;
  from: Rect;
  /** null until the ticket has landed and its new position is measurable. */
  to: Rect | null;
};

function rectOf(ticketId: string): Rect | null {
  // Scoped to the workspace: the flying copy carries the same id, and matching
  // it would measure the copy against itself.
  const node = document.querySelector(`.workspace [data-ticket-id="${ticketId}"]`);
  if (!node) return null;
  const { left, top, width, height } = node.getBoundingClientRect();
  return { left, top, width, height };
}

/**
 * Flies a ticket from where it sits now to wherever it ends up, across
 * containers. The card cannot simply transition in place — it is unmounted from
 * the board and remounted in the backlog — so a fixed-position copy stands in
 * for the trip: measure before the move, measure again after it, animate the
 * copy between the two.
 */
export function useTicketFlight() {
  const [flights, setFlights] = useState<TicketFlight[]>([]);
  const clearTimer = useRef<number | null>(null);

  useEffect(() => () => window.clearTimeout(clearTimer.current ?? undefined), []);

  /** Call while the tickets are still in their old position. */
  const lift = useCallback((ticketIds: readonly string[]) => {
    const lifted: TicketFlight[] = [];
    for (const ticketId of ticketIds) {
      const from = rectOf(ticketId);
      if (from) lifted.push({ ticketId, from, to: null });
    }
    setFlights(lifted);
    return lifted.length;
  }, []);

  /** Call once they have been rendered at their new home. */
  const land = useCallback(() => {
    setFlights((current) => current.map((flight) => ({ ...flight, to: rectOf(flight.ticketId) })));
    clearTimer.current = window.setTimeout(() => setFlights([]), FLIGHT_MS);
  }, []);

  return { flights, lift, land };
}

import { useDraggable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import type { Ticket } from '../model/types';
import { TicketCard } from './TicketCard';

type DraggableTicketProps = {
  ticket: Ticket;
  assignee: string | null;
  hue: number | null;
  blockedByKeys: string[];
  children: ReactNode;
};

/**
 * The dragged copy is rendered by `DragOverlay`, so this element stays put and
 * only dims — a transformed card would be clipped by the board's scroll
 * container on its way to the backlog.
 */
export function DraggableTicket({ ticket, children, ...card }: DraggableTicketProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ticket.id });

  return (
    <div
      ref={setNodeRef}
      className="draggable"
      data-dragging={isDragging}
      {...listeners}
      {...attributes}
    >
      <TicketCard ticket={ticket} {...card}>
        {children}
      </TicketCard>
    </div>
  );
}

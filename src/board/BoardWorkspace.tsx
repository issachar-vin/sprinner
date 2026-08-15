import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { backlogTickets, ticketKeysById } from '../lib/board';
import { todayISO } from '../lib/dates';
import { dependentsOf } from '../lib/mutations';
import { useBoardStore } from '../store/boardStore';
import { assigneeHue, assigneeName } from './assignee';
import { Backlog } from './Backlog';
import { BoardView } from './BoardView';
import { ConfirmDialog } from './ConfirmDialog';
import { parseDropId } from './dropTarget';
import { TicketCard } from './TicketCard';

/**
 * The cell under the cursor wins. `closestCenter` measures the dragged card's
 * rect instead, which on a dense column grid can resolve to a column the cursor
 * is not over. It stays as the fallback for the keyboard sensor, which has no
 * pointer coordinates.
 */
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : closestCenter(args);
};

export function BoardWorkspace() {
  const board = useBoardStore((state) => state.board);
  const placeTicket = useBoardStore((state) => state.placeTicket);
  const moveToBacklog = useBoardStore((state) => state.moveToBacklog);
  const resizeTicket = useBoardStore((state) => state.resizeTicket);
  const deleteTicket = useBoardStore((state) => state.deleteTicket);
  const undo = useBoardStore((state) => state.undo);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    // A short distance threshold keeps the buttons on each card clickable.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo]);

  const onDragStart = (event: DragStartEvent) => setDraggingId(String(event.active.id));

  const onDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    if (!event.over) return;

    const target = parseDropId(String(event.over.id));
    if (!target) return;

    const ticketId = String(event.active.id);
    if (target.kind === 'backlog') {
      moveToBacklog(ticketId);
      return;
    }

    const span = board.tickets.find((ticket) => ticket.id === ticketId)?.placement?.span ?? 1;
    placeTicket(ticketId, target.sprintId, span, target.beforeTicketId);
  };

  const dragging = board.tickets.find((ticket) => ticket.id === draggingId) ?? null;
  const pendingDelete = board.tickets.find((ticket) => ticket.id === pendingDeleteId) ?? null;
  const blocked = pendingDelete ? dependentsOf(board, pendingDelete.id) : [];
  const keys = ticketKeysById(board.tickets);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      <div className="workspace">
        <Backlog
          tickets={backlogTickets(board)}
          members={board.members}
          allTickets={board.tickets}
          onDelete={setPendingDeleteId}
        />
        <BoardView
          board={board}
          today={todayISO()}
          onUnplace={moveToBacklog}
          onDelete={setPendingDeleteId}
          onResize={resizeTicket}
        />
      </div>

      <DragOverlay>
        {dragging && (
          <TicketCard
            ticket={dragging}
            assignee={assigneeName(board.members, dragging.assigneeId)}
            hue={assigneeHue(board.members, dragging.assigneeId)}
            blockedByKeys={dragging.blockedBy.map((id) => keys.get(id) ?? id)}
          >
            {null}
          </TicketCard>
        )}
      </DragOverlay>

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete ${pendingDelete.key}?`}
          body={
            <>
              <p>
                {pendingDelete.key} — {pendingDelete.title}
              </p>
              {blocked.length > 0 && (
                <p className="dialog-warning">
                  {blocked.map((ticket) => ticket.key).join(', ')}{' '}
                  {blocked.length === 1 ? 'is' : 'are'} blocked by it. That dependency will be
                  removed.
                </p>
              )}
            </>
          }
          confirmLabel="Delete"
          onConfirm={() => {
            deleteTicket(pendingDelete.id);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </DndContext>
  );
}

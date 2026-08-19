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
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { backlogTickets, ticketKeysById } from '../lib/board';
import { todayISO } from '../lib/dates';
import { dependentsOf, placementRejection, unplaceRejection } from '../lib/blockers';
import {
  moveToBacklog as moveToBacklogIn,
  removalImpact,
  removeSprint as removeSprintFrom,
} from '../lib/mutations';
import { sprintDateIssues } from '../lib/sprints';
import { useBoardStore } from '../store/boardStore';
import type { Board } from '../model/types';
import type { BoardActions } from './actions';
import { assigneeHue, assigneeName } from './assignee';
import { Backlog } from './Backlog';
import { CapacityPanel } from './CapacityPanel';
import { BoardView } from './BoardView';
import { ConfirmDialog } from './ConfirmDialog';
import { parseDropId } from './dropTarget';
import { SetupWizard } from './SetupWizard';
import { SprintPanel } from './SprintPanel';
import { TicketCard } from './TicketCard';
import { TicketPanel } from './TicketPanel';
import { FLIGHT_MS, useTicketFlight } from './useTicketFlight';

/**
 * How long the column takes to collapse before the removal is committed. Kept
 * in step with the transitions on `.board-grid` in index.css.
 */
export const SPRINT_DISSOLVE_MS = 320;

/** How long a rejection stays on screen before it clears itself. */
export const REJECTION_MS = 6000;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

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

/**
 * A change that plays out before it is applied. Both kinds fly tickets to the
 * rows they will occupy in the backlog, so both need the board as it will be —
 * the mutations are pure, so computing it ahead of the commit costs nothing.
 */
type Pending = {
  /** Tickets on their way off the board; their cards hide behind the copies. */
  leaving: string[];
  future: Board;
} & (
  | { kind: 'unplace'; ticketId: string }
  /** `evacuating` empties the column, `dissolving` then closes it. */
  | { kind: 'sprint'; sprintId: string; phase: 'evacuating' | 'dissolving' }
);

const EMPTY: string[] = [];

export function BoardWorkspace() {
  const board = useBoardStore((state) => state.board);
  const placeTicket = useBoardStore((state) => state.placeTicket);
  const moveToBacklog = useBoardStore((state) => state.moveToBacklog);
  const resizeTicket = useBoardStore((state) => state.resizeTicket);
  const deleteTicket = useBoardStore((state) => state.deleteTicket);
  const updateTicket = useBoardStore((state) => state.updateTicket);
  const updateSprint = useBoardStore((state) => state.updateSprint);
  const addSprint = useBoardStore((state) => state.addSprint);
  const removeSprint = useBoardStore((state) => state.removeSprint);
  const replaceSprints = useBoardStore((state) => state.replaceSprints);
  const reflowSprints = useBoardStore((state) => state.reflowSprints);
  const addMember = useBoardStore((state) => state.addMember);
  const renameMember = useBoardStore((state) => state.renameMember);
  const removeMember = useBoardStore((state) => state.removeMember);
  const addTimeOff = useBoardStore((state) => state.addTimeOff);
  const removeTimeOff = useBoardStore((state) => state.removeTimeOff);
  const updateSettings = useBoardStore((state) => state.updateSettings);
  const undo = useBoardStore((state) => state.undo);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [removingSprintId, setRemovingSprintId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [showCapacity, setShowCapacity] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const { flights, lift, land } = useTicketFlight();

  const today = todayISO();

  const sensors = useSensors(
    // A short distance threshold keeps the buttons on each card clickable.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  /**
   * Rejections are shown, never swallowed: a drop that silently does nothing
   * reads as a broken feature. Re-stating the same reason restarts its life,
   * so repeating a refused move keeps the message on screen.
   */
  const reject = (reason: string) => setRejection(reason);

  useEffect(() => {
    if (rejection === null) return;
    const timer = window.setTimeout(() => setRejection(null), REJECTION_MS);
    return () => window.clearTimeout(timer);
  }, [rejection]);

  /** One ticket, straight back to the backlog. */
  const flyToBacklog = (ticketId: string) => {
    const refused = unplaceRejection(board, ticketId);
    if (refused) {
      reject(refused);
      return;
    }

    if (prefersReducedMotion()) {
      moveToBacklog(ticketId);
      return;
    }

    lift([ticketId]);
    setPending({
      kind: 'unplace',
      ticketId,
      leaving: [ticketId],
      future: moveToBacklogIn(board, ticketId),
    });
  };

  /**
   * The column is emptied before it closes. Stage one flies the tickets it
   * orphans to the backlog and pulls back the cards that end in it; only once
   * that has played does stage two collapse the now-empty column. The commit
   * comes last, so the layout never changes under the animation.
   */
  const dissolveSprint = (sprintId: string) => {
    setRemovingSprintId(null);

    if (prefersReducedMotion()) {
      removeSprint(sprintId);
      return;
    }

    const orphaned = removalImpact(board, sprintId).unplaced.map((ticket) => ticket.id);
    lift(orphaned);
    setPending({
      kind: 'sprint',
      sprintId,
      phase: 'evacuating',
      leaving: orphaned,
      future: removeSprintFrom(board, sprintId),
    });
  };

  /**
   * Drives whatever is pending to its next step. A layout effect because the
   * backlog is holding a row open for every arriving ticket but nothing has
   * painted yet: measuring here means the copies never flash at the wrong place.
   */
  useLayoutEffect(() => {
    if (!pending) return;
    let cancelled = false;
    const after = (ms: number, step: () => void) => {
      const timer = window.setTimeout(() => {
        if (!cancelled) step();
      }, ms);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    };

    if (pending.kind === 'unplace') {
      land();
      return after(FLIGHT_MS, () => {
        moveToBacklog(pending.ticketId);
        setPending(null);
      });
    }

    if (pending.phase === 'evacuating') {
      land();
      return after(FLIGHT_MS, () => setPending({ ...pending, phase: 'dissolving' }));
    }

    return after(SPRINT_DISSOLVE_MS, () => {
      removeSprint(pending.sprintId);
      setPending(null);
    });
  }, [pending, land, moveToBacklog, removeSprint]);

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

  const resizeWithinBlockers = (ticketId: string, startSprintId: string, span: number) => {
    const refused = placementRejection(board, ticketId, startSprintId, span);
    if (refused) {
      reject(refused);
      return;
    }
    resizeTicket(ticketId, startSprintId, span);
  };

  const actions: BoardActions = useMemo(
    () => ({
      editTicket: (ticketId: string) => {
        setShowCapacity(false);
        setEditingTicketId(ticketId);
      },
      deleteTicket: setPendingDeleteId,
      unplaceTicket: flyToBacklog,
      resizeTicket: resizeWithinBlockers,
      editSprint: setEditingSprintId,
      removeSprint: setRemovingSprintId,
      addSprint: () => addSprint(today),
      setUpSprints: () => setSettingUp(true),
      openCapacity: () => {
        setEditingTicketId(null);
        setShowCapacity(true);
      },
    }),
    // Both wrappers close over the current board, which is what they check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, moveToBacklog, resizeTicket, addSprint, today],
  );

  const onDragStart = (event: DragStartEvent) => setDraggingId(String(event.active.id));

  const onDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    if (!event.over) return;

    const target = parseDropId(String(event.over.id));
    if (!target) return;

    const ticketId = String(event.active.id);
    if (target.kind === 'backlog') {
      const refused = unplaceRejection(board, ticketId);
      if (refused) reject(refused);
      else moveToBacklog(ticketId);
      return;
    }

    const span = board.tickets.find((ticket) => ticket.id === ticketId)?.placement?.span ?? 1;
    const refused = placementRejection(board, ticketId, target.sprintId, span);
    if (refused) {
      reject(refused);
      return;
    }
    placeTicket(ticketId, target.sprintId, span, target.beforeTicketId);
  };

  const dragging = board.tickets.find((ticket) => ticket.id === draggingId) ?? null;
  const pendingDelete = board.tickets.find((ticket) => ticket.id === pendingDeleteId) ?? null;
  const blocked = pendingDelete ? dependentsOf(board, pendingDelete.id) : [];
  const keys = ticketKeysById(board.tickets);

  const editingTicket = board.tickets.find((ticket) => ticket.id === editingTicketId) ?? null;
  const editingSprintIndex = board.sprints.findIndex((sprint) => sprint.id === editingSprintId);
  const editingSprint = editingSprintIndex === -1 ? null : board.sprints[editingSprintIndex];
  const removingSprintIndex = board.sprints.findIndex((sprint) => sprint.id === removingSprintId);
  const removingSprint = removingSprintIndex === -1 ? null : board.sprints[removingSprintIndex];
  const removalCost = removingSprint ? removalImpact(board, removingSprint.id) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      {rejection && (
        <div className="rejection" role="status">
          <span>{rejection}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setRejection(null)}>
            ×
          </button>
        </div>
      )}

      <div className="workspace">
        <Backlog
          tickets={backlogTickets(pending?.future ?? board)}
          members={board.members}
          allTickets={board.tickets}
          flyingTicketIds={flights.map((flight) => flight.ticketId)}
          actions={actions}
        />
        <BoardView
          board={board}
          today={today}
          actions={actions}
          leavingTicketIds={pending?.leaving ?? EMPTY}
          evacuatingSprintId={
            pending?.kind === 'sprint' && pending.phase === 'evacuating' ? pending.sprintId : null
          }
          dissolvingSprintId={
            pending?.kind === 'sprint' && pending.phase === 'dissolving' ? pending.sprintId : null
          }
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

      {flights.length > 0 &&
        createPortal(
          <div>
            {flights.map((flight) => {
              const inFlight = board.tickets.find((ticket) => ticket.id === flight.ticketId);
              const at = flight.to ?? flight.from;
              if (!inFlight) return null;

              return (
                <div
                  key={flight.ticketId}
                  className="ticket-flight"
                  style={{ left: at.left, top: at.top, width: at.width, height: at.height }}
                >
                  <TicketCard
                    ticket={inFlight}
                    assignee={assigneeName(board.members, inFlight.assigneeId)}
                    hue={assigneeHue(board.members, inFlight.assigneeId)}
                    blockedByKeys={inFlight.blockedBy.map((id) => keys.get(id) ?? id)}
                  >
                    {null}
                  </TicketCard>
                </div>
              );
            })}
          </div>,
          document.body,
        )}

      {editingTicket && (
        <TicketPanel
          ticket={editingTicket}
          members={board.members}
          tickets={board.tickets}
          onSave={(edit) => {
            updateTicket(editingTicket.id, edit);
            setEditingTicketId(null);
          }}
          onClose={() => setEditingTicketId(null)}
        />
      )}

      {editingSprint && (
        <SprintPanel
          sprint={editingSprint}
          number={editingSprintIndex + 1}
          issues={sprintDateIssues(board.sprints)}
          previousSprintId={board.sprints[editingSprintIndex - 1]?.id ?? null}
          nextSprintId={board.sprints[editingSprintIndex + 1]?.id ?? null}
          onSave={(edit) => {
            updateSprint(editingSprint.id, edit);
            setEditingSprintId(null);
          }}
          onReflow={reflowSprints}
          onRemove={() => {
            setEditingSprintId(null);
            setRemovingSprintId(editingSprint.id);
          }}
          onClose={() => setEditingSprintId(null)}
        />
      )}

      {showCapacity && (
        <CapacityPanel
          board={board}
          today={today}
          onAddMember={addMember}
          onRenameMember={renameMember}
          onRemoveMember={removeMember}
          onAddTimeOff={addTimeOff}
          onRemoveTimeOff={removeTimeOff}
          onUpdateSettings={updateSettings}
          onClose={() => setShowCapacity(false)}
        />
      )}

      {settingUp && (
        <SetupWizard
          today={today}
          onCreate={(sprints) => {
            replaceSprints(sprints);
            setSettingUp(false);
          }}
          onClose={() => setSettingUp(false)}
        />
      )}

      {removingSprint && removalCost && (
        <ConfirmDialog
          title={`Remove sprint ${removingSprintIndex + 1}?`}
          body={
            <>
              <p>
                {removingSprint.startDate} – {removingSprint.endDate}
              </p>
              {removalCost.unplaced.length > 0 && (
                <p className="dialog-warning">
                  {removalCost.unplaced.map((ticket) => ticket.key).join(', ')} started here and
                  will return to the backlog.
                </p>
              )}
              {removalCost.clipped.length > 0 && (
                <p className="dialog-warning">
                  {removalCost.clipped.map((ticket) => ticket.key).join(', ')} span across it and
                  will lose a column.
                </p>
              )}
            </>
          }
          confirmLabel="Remove sprint"
          onConfirm={() => dissolveSprint(removingSprint.id)}
          onCancel={() => setRemovingSprintId(null)}
        />
      )}

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

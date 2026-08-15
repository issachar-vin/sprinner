import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as mutations from '../lib/mutations';
import { parseBoard } from '../model/schema';
import { createEmptyBoard, SCHEMA_VERSION } from '../model/types';
import type { Board, ISODate, Sprint } from '../model/types';
import type { SprintEdit, TicketEdit } from '../lib/mutations';

export const STORAGE_KEY = 'sprinner-board';
/** Deep enough to cover a run of mis-drops without holding the session forever. */
export const UNDO_LIMIT = 50;

type BoardState = {
  board: Board;
  /** Newest first. Session-only — never persisted. */
  past: Board[];
  replaceBoard: (board: Board) => void;
  resetBoard: () => void;
  placeTicket: (
    ticketId: string,
    startSprintId: string,
    span: number,
    beforeTicketId: string | null,
  ) => void;
  moveToBacklog: (ticketId: string) => void;
  clearPlacements: () => void;
  resizeTicket: (ticketId: string, startSprintId: string, span: number) => void;
  deleteTicket: (ticketId: string) => void;
  updateTicket: (ticketId: string, edit: TicketEdit) => void;
  updateSprint: (sprintId: string, edit: SprintEdit) => void;
  addSprint: (today: ISODate) => void;
  removeSprint: (sprintId: string) => void;
  replaceSprints: (sprints: Sprint[]) => void;
  reflowSprints: (fromSprintId: string) => void;
  undo: () => void;
};

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => {
      /**
       * Snapshots only when the board actually changed, so a no-op drop does
       * not consume an undo step.
       */
      const apply = (mutate: (board: Board) => Board) =>
        set((state) => {
          const board = mutate(state.board);
          if (board === state.board) return state;
          return { board, past: [state.board, ...state.past].slice(0, UNDO_LIMIT) };
        });

      return {
        board: createEmptyBoard(),
        past: [],
        replaceBoard: (board) => set({ board, past: [] }),
        resetBoard: () => set({ board: createEmptyBoard(), past: [] }),
        placeTicket: (ticketId, startSprintId, span, beforeTicketId) =>
          apply((board) =>
            mutations.placeTicket(board, ticketId, startSprintId, span, beforeTicketId),
          ),
        moveToBacklog: (ticketId) => apply((board) => mutations.moveToBacklog(board, ticketId)),
        clearPlacements: () => apply(mutations.clearPlacements),
        resizeTicket: (ticketId, startSprintId, span) =>
          apply((board) => mutations.resizeTicket(board, ticketId, startSprintId, span)),
        deleteTicket: (ticketId) => apply((board) => mutations.deleteTicket(board, ticketId)),
        updateTicket: (ticketId, edit) =>
          apply((board) => mutations.updateTicket(board, ticketId, edit)),
        updateSprint: (sprintId, edit) =>
          apply((board) => mutations.updateSprint(board, sprintId, edit)),
        addSprint: (today) => apply((board) => mutations.addSprint(board, today)),
        removeSprint: (sprintId) => apply((board) => mutations.removeSprint(board, sprintId)),
        replaceSprints: (sprints) => apply((board) => mutations.replaceSprints(board, sprints)),
        reflowSprints: (fromSprintId) =>
          apply((board) => mutations.reflowSprints(board, fromSprintId)),
        undo: () =>
          set((state) => {
            const [previous, ...rest] = state.past;
            if (!previous) return state;
            return { board: previous, past: rest };
          }),
      };
    },
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      partialize: (state) => ({ board: state.board }),
      /**
       * Rehydrated state is untrusted — another tab, an older build or a hand
       * edit could have written it. Anything that fails validation is dropped
       * in favour of an empty board rather than crashing the app.
       */
      merge: (persisted, current) => {
        const result = parseBoard((persisted as { board?: unknown } | null)?.board);
        return result.ok ? { ...current, board: result.board } : current;
      },
    },
  ),
);

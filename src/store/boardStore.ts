import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parseBoard } from '../model/schema';
import { createEmptyBoard, SCHEMA_VERSION } from '../model/types';
import type { Board } from '../model/types';

export const STORAGE_KEY = 'sprinner-board';

type BoardState = {
  board: Board;
  replaceBoard: (board: Board) => void;
  resetBoard: () => void;
};

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      board: createEmptyBoard(),
      replaceBoard: (board) => set({ board }),
      resetBoard: () => set({ board: createEmptyBoard() }),
    }),
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

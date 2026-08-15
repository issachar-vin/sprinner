import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoBoard } from '../lib/seed';
import { STORAGE_KEY, UNDO_LIMIT, useBoardStore } from './boardStore';

const store = () => useBoardStore.getState();

describe('boardStore undo', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => store().replaceBoard(createDemoBoard('2026-08-14')));
  });

  it('starts with nothing to undo', () => {
    expect(store().past).toEqual([]);
  });

  it('restores the previous board', () => {
    const before = store().board;
    act(() => store().moveToBacklog('t-101'));
    expect(store().board.tickets.find((t) => t.id === 't-101')?.placement).toBeNull();

    act(() => store().undo());
    expect(store().board).toBe(before);
  });

  it('unwinds several edits in order', () => {
    act(() => store().moveToBacklog('t-101'));
    act(() => store().deleteTicket('t-104'));
    act(() => store().undo());

    expect(store().board.tickets.some((t) => t.id === 't-104')).toBe(true);
    expect(store().board.tickets.find((t) => t.id === 't-101')?.placement).toBeNull();
  });

  it('does not spend an undo step on a no-op edit', () => {
    act(() => store().placeTicket('t-101', 'no-such-sprint', 1, null));
    expect(store().past).toEqual([]);
  });

  it('does nothing when there is no history', () => {
    const board = store().board;
    act(() => store().undo());
    expect(store().board).toBe(board);
  });

  it('caps the history', () => {
    for (let i = 0; i < UNDO_LIMIT + 10; i += 1) {
      const span = (i % 2) + 1;
      act(() => store().resizeTicket('t-112', 's2', span));
    }
    expect(store().past).toHaveLength(UNDO_LIMIT);
  });

  it('clears history when the board is replaced or reset', () => {
    act(() => store().moveToBacklog('t-101'));
    act(() => store().replaceBoard(createDemoBoard('2026-08-14')));
    expect(store().past).toEqual([]);

    act(() => store().moveToBacklog('t-101'));
    act(() => store().resetBoard());
    expect(store().past).toEqual([]);
  });

  it('keeps history out of persisted storage', () => {
    act(() => store().moveToBacklog('t-101'));

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(persisted.state).toHaveProperty('board');
    expect(persisted.state).not.toHaveProperty('past');
  });
});

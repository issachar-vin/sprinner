import { fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { createEmptyBoard } from './model/types';
import { useBoardStore } from './store/boardStore';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useBoardStore.getState().replaceBoard(createEmptyBoard()));
  });

  it('offers setup and demo data when the board is empty', () => {
    render(<App />);

    expect(screen.getByText('No sprints yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set up sprints' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load demo board' })).toBeInTheDocument();
  });

  it('renders the board and backlog once the demo board is loaded', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Load demo board' }));

    expect(screen.getByRole('region', { name: 'Sprint board' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Backlog' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sprint 1' })).toBeInTheDocument();
    expect(screen.getAllByText('Today')).toHaveLength(1);
    expect(screen.getByText(/4 members · 6 sprints/)).toBeInTheDocument();
  });

  it('clears the columns without discarding the board', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Load demo board' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear board' }));

    const board = useBoardStore.getState().board;
    expect(board.sprints).toHaveLength(6);
    expect(board.tickets.every((ticket) => ticket.placement === null)).toBe(true);
    expect(screen.getByRole('heading', { name: 'Sprint 1' })).toBeInTheDocument();
  });

  it('undoes a clear', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Load demo board' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear board' }));
    fireEvent.keyDown(window, { key: 'z', metaKey: true });

    expect(useBoardStore.getState().board.tickets.some((t) => t.placement !== null)).toBe(true);
  });

  it('resets to an empty board only after confirming', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Load demo board' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset board' }));
    expect(useBoardStore.getState().board.sprints).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(useBoardStore.getState().board.sprints).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: 'Reset board' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset board' }),
    );

    expect(useBoardStore.getState().board.sprints).toEqual([]);
    expect(useBoardStore.getState().board.tickets).toEqual([]);
    expect(screen.getByText('No sprints yet')).toBeInTheDocument();
  });
});

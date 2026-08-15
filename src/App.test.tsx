import { fireEvent, render, screen } from '@testing-library/react';
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

  it('offers the demo board when there is nothing to plan', () => {
    render(<App />);

    expect(screen.getByText('Nothing to plan yet')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sprint board' })).not.toBeInTheDocument();
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

  it('clears back to the empty state', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Load demo board' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear board' }));

    expect(screen.getByText('Nothing to plan yet')).toBeInTheDocument();
  });
});

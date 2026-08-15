import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Board } from '../model/types';
import { createEmptyBoard } from '../model/types';
import { BoardView } from './BoardView';

const TODAY = '2026-01-21';

function buildBoard(): Board {
  return {
    ...createEmptyBoard(),
    members: [{ id: 'm1', name: 'Priya Raman' }],
    sprints: [
      { id: 's1', name: null, startDate: '2026-01-05', endDate: '2026-01-16' },
      { id: 's2', name: null, startDate: '2026-01-19', endDate: '2026-01-30' },
      { id: 's3', name: 'Hardening', startDate: '2026-02-02', endDate: '2026-02-13' },
    ],
    tickets: [
      {
        id: 't1',
        key: 'PLAT-1',
        title: 'Rewrite auth token refresh',
        points: 3,
        assigneeId: 'm1',
        blockedBy: [],
        epicKey: null,
        placement: { startSprintId: 's1', span: 2 },
      },
      {
        id: 't2',
        key: 'PLAT-2',
        title: 'Audit log pipeline',
        points: 8,
        assigneeId: null,
        blockedBy: ['t1'],
        epicKey: null,
        placement: { startSprintId: 's2', span: 2 },
      },
      {
        id: 't3',
        key: 'PLAT-3',
        title: 'Scheduler dead-letter queue',
        points: null,
        assigneeId: 'm1',
        blockedBy: [],
        epicKey: null,
        placement: { startSprintId: 's2', span: 1 },
      },
    ],
    rowOrder: ['t1', 't2', 't3'],
  };
}

describe('BoardView', () => {
  it('numbers sprints by position and falls back to a name when set', () => {
    render(<BoardView board={buildBoard()} today={TODAY} />);

    expect(screen.getByRole('heading', { name: 'Sprint 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sprint 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hardening' })).toBeInTheDocument();
  });

  it('renders the sprint date range', () => {
    render(<BoardView board={buildBoard()} today={TODAY} />);
    expect(screen.getByText('Jan 5 – Jan 16')).toBeInTheDocument();
  });

  it('marks only the sprint containing today', () => {
    render(<BoardView board={buildBoard()} today={TODAY} />);

    const chips = screen.getAllByText('Today');
    expect(chips).toHaveLength(1);
    expect(chips[0]?.closest('.sprint-header')).toHaveTextContent('Sprint 2');
  });

  it('shows committed points, creep and the unestimated count', () => {
    render(<BoardView board={buildBoard()} today={TODAY} />);

    const second = screen.getByRole('heading', { name: 'Sprint 2' }).closest('.sprint-header');
    expect(second).not.toBeNull();
    expect(within(second as HTMLElement).getByText('8')).toBeInTheDocument();
    expect(within(second as HTMLElement).getByText('(+3 creep)')).toBeInTheDocument();
    expect(within(second as HTMLElement).getByText('1 unestimated')).toBeInTheDocument();
  });

  it('colours the balance chip from the thresholds', () => {
    render(<BoardView board={buildBoard()} today={TODAY} />);

    // 10 workdays for one member, 3 points committed.
    expect(screen.getByText('+7 balance')).toHaveClass('balance--green');
    // Sprint 2 commits 8 of 10, leaving 2 — inside the yellow band.
    expect(screen.getByText('+2 balance')).toHaveClass('balance--yellow');
  });

  it('places cards with grid spans rather than pixel maths', () => {
    render(<BoardView board={buildBoard()} today={TODAY} />);

    const cell = screen.getByText('Rewrite auth token refresh').closest('.board-cell');
    expect(cell?.getAttribute('style')).toContain('grid-column: 1 / span 2');
    expect(cell?.getAttribute('style')).toContain('grid-row: 2');
  });

  it('renders every ticket field', () => {
    render(<BoardView board={buildBoard()} today={TODAY} />);

    const card = screen.getByText('Audit log pipeline').closest('.ticket') as HTMLElement;
    expect(within(card).getByText('PLAT-2')).toBeInTheDocument();
    expect(within(card).getByText('8')).toBeInTheDocument();
    expect(within(card).getByText('Unassigned')).toBeInTheDocument();
    expect(within(card).getByText('Blocked by PLAT-1')).toBeInTheDocument();
  });

  it('marks an unestimated ticket instead of showing zero', () => {
    render(<BoardView board={buildBoard()} today={TODAY} />);

    const card = screen.getByText('Scheduler dead-letter queue').closest('.ticket') as HTMLElement;
    expect(within(card).getByTitle('Unestimated')).toHaveTextContent('—');
  });

  it('shows an empty state when the board has no sprints', () => {
    render(<BoardView board={createEmptyBoard()} today={TODAY} />);
    expect(screen.getByText('No sprints yet')).toBeInTheDocument();
  });

  it('notes when sprints exist but nothing is planned', () => {
    const board = { ...buildBoard(), tickets: [], rowOrder: [] };
    render(<BoardView board={board} today={TODAY} />);
    expect(screen.getByText(/every ticket is in the backlog/i)).toBeInTheDocument();
  });
});

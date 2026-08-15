import { DndContext } from '@dnd-kit/core';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Board } from '../model/types';
import { createEmptyBoard } from '../model/types';
import type { BoardActions } from './actions';
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

const actions: BoardActions = {
  editTicket: vi.fn(),
  deleteTicket: vi.fn(),
  unplaceTicket: vi.fn(),
  resizeTicket: vi.fn(),
  editSprint: vi.fn(),
  removeSprint: vi.fn(),
  addSprint: vi.fn(),
  setUpSprints: vi.fn(),
};

function renderBoard(board: Board, today = TODAY) {
  return render(
    <DndContext>
      <BoardView
        board={board}
        today={today}
        actions={actions}
        leavingTicketIds={[]}
        evacuatingSprintId={null}
        dissolvingSprintId={null}
      />
    </DndContext>,
  );
}

describe('BoardView', () => {
  it('numbers sprints by position and falls back to a name when set', () => {
    renderBoard(buildBoard());

    expect(screen.getByRole('heading', { name: 'Sprint 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sprint 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hardening' })).toBeInTheDocument();
  });

  it('renders the sprint date range', () => {
    renderBoard(buildBoard());
    expect(screen.getByText('Jan 5 – Jan 16')).toBeInTheDocument();
  });

  it('marks only the sprint containing today', () => {
    renderBoard(buildBoard());

    const chips = screen.getAllByText('Today');
    expect(chips).toHaveLength(1);
    expect(chips[0]?.closest('.sprint-header')).toHaveTextContent('Sprint 2');
  });

  it('shows committed points, creep and the unestimated count', () => {
    renderBoard(buildBoard());

    const second = screen.getByRole('heading', { name: 'Sprint 2' }).closest('.sprint-header');
    expect(second).not.toBeNull();
    expect(within(second as HTMLElement).getByText('8')).toBeInTheDocument();
    expect(within(second as HTMLElement).getByText('(+3 creep)')).toBeInTheDocument();
    expect(within(second as HTMLElement).getByText('1 unestimated')).toBeInTheDocument();
  });

  it('colours the balance chip from the thresholds', () => {
    renderBoard(buildBoard());

    // 10 workdays for one member, 3 points committed.
    expect(screen.getByText('+7 balance')).toHaveClass('balance--green');
    // Sprint 2 commits 8 of 10, leaving 2 — inside the yellow band.
    expect(screen.getByText('+2 balance')).toHaveClass('balance--yellow');
  });

  it('keeps column structure once something is planned', () => {
    renderBoard(buildBoard());
    expect(document.querySelector('.board-grid')).not.toHaveAttribute('data-empty');
  });

  it('places cards with grid spans rather than pixel maths', () => {
    renderBoard(buildBoard());

    const cell = screen.getByText('Rewrite auth token refresh').closest('.board-cell');
    expect(cell?.getAttribute('style')).toContain('grid-column: 1 / span 2');
    expect(cell?.getAttribute('style')).toContain('grid-row: 2');
  });

  it('renders every ticket field', () => {
    renderBoard(buildBoard());

    const card = screen.getByText('Audit log pipeline').closest('.ticket') as HTMLElement;
    expect(within(card).getByText('PLAT-2')).toBeInTheDocument();
    expect(within(card).getByText('8')).toBeInTheDocument();
    expect(within(card).getByText('Unassigned')).toBeInTheDocument();
    expect(within(card).getByText('Blocked by PLAT-1')).toBeInTheDocument();
  });

  it('shows points in the card footer', () => {
    renderBoard(buildBoard());

    const card = screen.getByText('Audit log pipeline').closest('.ticket') as HTMLElement;
    expect(within(card).getByText('8').closest('.ticket-foot')).not.toBeNull();
  });

  it('marks an unestimated ticket instead of showing zero', () => {
    renderBoard(buildBoard());

    const card = screen.getByText('Scheduler dead-letter queue').closest('.ticket') as HTMLElement;
    expect(within(card).getByTitle('Unestimated')).toHaveTextContent('—');
  });

  it('shows an empty state when the board has no sprints', () => {
    renderBoard(createEmptyBoard());
    expect(screen.getByText('No sprints yet')).toBeInTheDocument();
  });

  it('notes when sprints exist but nothing is planned', () => {
    renderBoard({ ...buildBoard(), tickets: [], rowOrder: [] });

    const note = screen.getByText(/drag a ticket from the backlog/i);
    // Inside the grid's only row, so an empty board shows no blank band above it.
    expect(note.parentElement).toHaveClass('board-grid');
    // Drives the CSS that hides the column dividers across an empty row.
    expect(note.parentElement).toHaveAttribute('data-empty', 'true');
    expect(note.getAttribute('style')).toContain('grid-row: 2');
    expect(document.querySelectorAll('.board-cell')).toHaveLength(0);
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoBoard } from '../lib/seed';
import { useBoardStore } from '../store/boardStore';
import { BoardWorkspace } from './BoardWorkspace';

const board = () => useBoardStore.getState().board;
const ticket = (id: string) => board().tickets.find((entry) => entry.id === id);

/** The grid is `fr` sized, so resize measures real rects. jsdom has none. */
function stubColumnRects(width = 100) {
  for (const [index, column] of Array.from(
    document.querySelectorAll('[data-column-index]'),
  ).entries()) {
    const left = index * width;
    column.getBoundingClientRect = () =>
      ({ left, right: left + width, width }) as unknown as DOMRect;
  }
}

describe('BoardWorkspace', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useBoardStore.getState().replaceBoard(createDemoBoard('2026-08-14')));
  });

  it('returns a placed ticket to the backlog', () => {
    render(<BoardWorkspace />);

    fireEvent.click(screen.getByLabelText('Return PLAT-101 to the backlog'));

    expect(ticket('t-101')?.placement).toBeNull();
    const backlog = screen.getByRole('region', { name: 'Backlog' });
    expect(within(backlog).getByText('Rewrite auth token refresh')).toBeInTheDocument();
  });

  it('undoes the last edit with the keyboard shortcut', () => {
    render(<BoardWorkspace />);

    fireEvent.click(screen.getByLabelText('Return PLAT-101 to the backlog'));
    fireEvent.keyDown(window, { key: 'z', metaKey: true });

    expect(ticket('t-101')?.placement).toEqual({ startSprintId: 's1', span: 1 });
  });

  it('confirms before deleting and names the dependents', () => {
    render(<BoardWorkspace />);

    fireEvent.click(screen.getByLabelText('Delete PLAT-101'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/PLAT-108/)).toBeInTheDocument();
    expect(ticket('t-101')).toBeDefined();
  });

  it('deletes on confirm and strips the dangling blocker', () => {
    render(<BoardWorkspace />);

    fireEvent.click(screen.getByLabelText('Delete PLAT-101'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(ticket('t-101')).toBeUndefined();
    expect(ticket('t-108')?.blockedBy).toEqual([]);
  });

  it('keeps the ticket when the dialog is cancelled or dismissed', () => {
    render(<BoardWorkspace />);

    fireEvent.click(screen.getByLabelText('Delete PLAT-101'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(ticket('t-101')).toBeDefined();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Delete PLAT-101'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(ticket('t-101')).toBeDefined();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stretches freely while dragging and only commits on release', () => {
    render(<BoardWorkspace />);
    stubColumnRects();

    const handle = screen.getByTestId('resize-end-PLAT-101');
    fireEvent.pointerDown(handle, { clientX: 50 });
    fireEvent.pointerMove(window, { clientX: 137 });

    const cell = screen.getByText('Rewrite auth token refresh').closest('.board-cell');
    expect(cell?.getAttribute('data-resizing')).toBe('end');
    expect(cell?.getAttribute('style')).toContain('--stretch: 87px');
    expect(ticket('t-101')?.placement).toEqual({ startSprintId: 's1', span: 1 });

    fireEvent.pointerUp(window, { clientX: 137 });
    expect(ticket('t-101')?.placement).toEqual({ startSprintId: 's1', span: 2 });
  });

  it('grows a span by dragging the right edge to another column', () => {
    render(<BoardWorkspace />);
    stubColumnRects();

    const handle = screen.getByTestId('resize-end-PLAT-101');
    fireEvent.pointerDown(handle, { clientX: 50 });
    fireEvent.pointerMove(window, { clientX: 250 });
    fireEvent.pointerUp(window, { clientX: 250 });

    expect(ticket('t-101')?.placement).toEqual({ startSprintId: 's1', span: 3 });
  });

  it('moves the start sprint when the left edge is dragged', () => {
    render(<BoardWorkspace />);
    stubColumnRects();

    // PLAT-117 starts in sprint 3 and spans 2; drag its left edge to sprint 2.
    const handle = screen.getByTestId('resize-start-PLAT-117');
    fireEvent.pointerDown(handle, { clientX: 250 });
    fireEvent.pointerMove(window, { clientX: 150 });
    fireEvent.pointerUp(window, { clientX: 150 });

    expect(ticket('t-117')?.placement).toEqual({ startSprintId: 's2', span: 3 });
  });

  it('leaves the placement alone when a resize ends where it started', () => {
    render(<BoardWorkspace />);
    stubColumnRects();

    const handle = screen.getByTestId('resize-end-PLAT-101');
    fireEvent.pointerDown(handle, { clientX: 50 });
    fireEvent.pointerUp(window, { clientX: 50 });

    expect(useBoardStore.getState().past).toEqual([]);
  });
});

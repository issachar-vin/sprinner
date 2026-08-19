import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('flies a ticket back to the backlog before unplacing it', async () => {
    render(<BoardWorkspace />);

    fireEvent.click(screen.getByLabelText('Return PLAT-115 to the backlog'));

    // Mid-flight: still placed, a copy is travelling, and the backlog is
    // already holding its row open.
    expect(ticket('t-115')?.placement).toEqual({ startSprintId: 's3', span: 1 });
    expect(document.querySelectorAll('.ticket-flight')).toHaveLength(1);
    expect(document.querySelectorAll('.backlog-list li[data-flying="true"]')).toHaveLength(1);
    expect(document.querySelector('.board-cell[data-leaving="true"]')).toContainElement(
      document.querySelector('.board-cell [data-ticket-id="t-115"]'),
    );

    await waitFor(() => expect(ticket('t-115')?.placement).toBeNull());
    await waitFor(() => expect(document.querySelectorAll('.ticket-flight')).toHaveLength(0));

    const backlog = screen.getByRole('region', { name: 'Backlog' });
    expect(within(backlog).getByText('SSO metadata refresh job')).toBeInTheDocument();
  });

  it('unplaces at once when the viewer asks for reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    render(<BoardWorkspace />);
    fireEvent.click(screen.getByLabelText('Return PLAT-115 to the backlog'));

    expect(ticket('t-115')?.placement).toBeNull();
    vi.unstubAllGlobals();
  });

  it('undoes the last edit with the keyboard shortcut', async () => {
    render(<BoardWorkspace />);

    fireEvent.click(screen.getByLabelText('Return PLAT-115 to the backlog'));
    await waitFor(() => expect(ticket('t-115')?.placement).toBeNull());

    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(ticket('t-115')?.placement).toEqual({ startSprintId: 's3', span: 1 });
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

    const handle = screen.getByTestId('resize-end-PLAT-115');
    fireEvent.pointerDown(handle, { clientX: 250 });
    fireEvent.pointerMove(window, { clientX: 450 });
    fireEvent.pointerUp(window, { clientX: 450 });

    expect(ticket('t-115')?.placement).toEqual({ startSprintId: 's3', span: 3 });
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

describe('blocked-by rules', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useBoardStore.getState().replaceBoard(createDemoBoard('2026-08-14')));
  });

  it('refuses to unplace a blocker while a dependent is on the board', () => {
    render(<BoardWorkspace />);

    // PLAT-108 is placed and blocked by PLAT-101.
    fireEvent.click(screen.getByLabelText('Return PLAT-101 to the backlog'));

    expect(ticket('t-101')?.placement).not.toBeNull();
    expect(document.querySelector('.rejection')).toHaveTextContent(
      'PLAT-108 depends on this and is still placed',
    );
  });

  it('refuses to stretch a blocker over its dependent', () => {
    render(<BoardWorkspace />);
    stubColumnRects();

    const handle = screen.getByTestId('resize-end-PLAT-101');
    fireEvent.pointerDown(handle, { clientX: 50 });
    fireEvent.pointerMove(window, { clientX: 250 });
    fireEvent.pointerUp(window, { clientX: 250 });

    expect(ticket('t-101')?.placement).toEqual({ startSprintId: 's1', span: 1 });
    expect(document.querySelector('.rejection')).toHaveTextContent(
      'PLAT-108 depends on this and starts in sprint 2',
    );
  });

  it('lets a blocker move where no dependent is disturbed', () => {
    render(<BoardWorkspace />);

    // PLAT-124's only dependent, PLAT-158, is still in the backlog.
    fireEvent.click(screen.getByLabelText('Return PLAT-124 to the backlog'));

    expect(document.querySelector('.rejection')).toBeNull();
  });

  it('dismisses a rejection on request', () => {
    render(<BoardWorkspace />);

    fireEvent.click(screen.getByLabelText('Return PLAT-101 to the backlog'));
    fireEvent.click(screen.getByLabelText('Dismiss'));

    expect(document.querySelector('.rejection')).toBeNull();
  });
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoBoard } from '../lib/seed';
import { useBoardStore } from '../store/boardStore';
import { BoardWorkspace } from './BoardWorkspace';

const board = () => useBoardStore.getState().board;
const ticket = (id: string) => board().tickets.find((entry) => entry.id === id);

function openTicket(key: string) {
  fireEvent.click(screen.getByLabelText(`Edit ${key}`));
  return screen.getByRole('dialog');
}

/** Scoped to the picker: native `select` options carry the same role. */
function blockerOptions() {
  return within(screen.getByRole('listbox', { name: 'Add a blocker' })).getAllByRole('option');
}

describe('ticket panel', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useBoardStore.getState().replaceBoard(createDemoBoard('2026-08-14')));
  });

  it('edits every field the editor owns', () => {
    render(<BoardWorkspace />);
    openTicket('PLAT-101');

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'PLAT-999' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Renamed work' } });
    fireEvent.change(screen.getByLabelText('Points'), { target: { value: '13' } });
    fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: 'm3' } });
    fireEvent.change(screen.getByLabelText('Epic'), { target: { value: 'EPIC-7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(ticket('t-101')).toMatchObject({
      key: 'PLAT-999',
      title: 'Renamed work',
      points: 13,
      assigneeId: 'm3',
      epicKey: 'EPIC-7',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the placement while editing fields', () => {
    render(<BoardWorkspace />);
    openTicket('PLAT-117');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Still placed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(ticket('t-117')?.placement).toEqual({ startSprintId: 's3', span: 2 });
  });

  it('reads an empty points field as unestimated', () => {
    render(<BoardWorkspace />);
    openTicket('PLAT-101');

    fireEvent.change(screen.getByLabelText('Points'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(ticket('t-101')?.points).toBeNull();
  });

  it('rejects a blocker that would create a cycle', () => {
    render(<BoardWorkspace />);
    // PLAT-108 is already blocked by PLAT-101, so blocking PLAT-101 on it loops.
    const dialog = openTicket('PLAT-101');

    fireEvent.focus(screen.getByLabelText('Add a blocker'));
    fireEvent.click(
      blockerOptions().find((option) => option.textContent?.includes('PLAT-108')) as HTMLElement,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(within(dialog).getByText(/would create a cycle/i)).toBeInTheDocument();
    expect(ticket('t-101')?.blockedBy).toEqual([]);
  });

  it('lists every other ticket before anything is typed', () => {
    render(<BoardWorkspace />);
    openTicket('PLAT-101');

    fireEvent.focus(screen.getByLabelText('Add a blocker'));

    // Every ticket except this one.
    expect(blockerOptions()).toHaveLength(16);
  });

  it('filters the picker as you type, by key or title', () => {
    render(<BoardWorkspace />);
    openTicket('PLAT-101');
    const input = screen.getByLabelText('Add a blocker');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'audit' } });

    const options = blockerOptions();
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('PLAT-112');
  });

  it('adds a blocker from the picker and drops it again', () => {
    render(<BoardWorkspace />);
    openTicket('PLAT-133');
    const input = screen.getByLabelText('Add a blocker');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'PLAT-115' } });
    fireEvent.click(blockerOptions()[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(ticket('t-133')?.blockedBy).toEqual(['t-115']);

    openTicket('PLAT-133');
    fireEvent.click(screen.getByRole('button', { name: 'Remove blocker PLAT-115' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(ticket('t-133')?.blockedBy).toEqual([]);
  });

  it('offers a blocker only once', () => {
    render(<BoardWorkspace />);
    openTicket('PLAT-108');

    fireEvent.focus(screen.getByLabelText('Add a blocker'));

    // PLAT-101 already blocks it, so it is not on offer again.
    expect(blockerOptions().some((option) => option.textContent?.includes('PLAT-101'))).toBe(false);
  });

  it('rejects an empty key and unparseable points', () => {
    render(<BoardWorkspace />);
    const dialog = openTicket('PLAT-101');

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByText(/key is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'PLAT-101' } });
    fireEvent.change(screen.getByLabelText('Points'), { target: { value: 'lots' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByText(/points must be a number/i)).toBeInTheDocument();
    expect(ticket('t-101')?.key).toBe('PLAT-101');
  });

  it('discards the edit on cancel', () => {
    render(<BoardWorkspace />);
    openTicket('PLAT-101');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(ticket('t-101')?.title).toBe('Rewrite auth token refresh');
  });

  it('is undoable', () => {
    render(<BoardWorkspace />);
    openTicket('PLAT-101');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.keyDown(window, { key: 'z', metaKey: true });

    expect(ticket('t-101')?.title).toBe('Rewrite auth token refresh');
  });
});

describe('sprint panel', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useBoardStore.getState().replaceBoard(createDemoBoard('2026-08-14')));
  });

  it('edits name and dates', () => {
    render(<BoardWorkspace />);
    fireEvent.click(screen.getByLabelText('Edit sprint 1'));

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Hardening' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2026-07-24' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(board().sprints[0]).toMatchObject({ name: 'Hardening', endDate: '2026-07-24' });
  });

  it('refuses a range that runs backwards', () => {
    render(<BoardWorkspace />);
    fireEvent.click(screen.getByLabelText('Edit sprint 2'));

    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText(/end date must not be before/i)).toBeInTheDocument();
    expect(board().sprints[1]?.endDate).not.toBe('2026-01-01');
  });

  it('does not move the following sprints when one is edited', () => {
    render(<BoardWorkspace />);

    fireEvent.click(screen.getByLabelText('Edit sprint 1'));
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2026-07-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(board().sprints[1]?.startDate).toBe('2026-07-27');
    expect(board().sprints[2]?.startDate).toBe('2026-08-10');
  });

  it('warns on both sides of the gap and closes it from either panel', () => {
    render(<BoardWorkspace />);
    fireEvent.click(screen.getByLabelText('Edit sprint 1'));
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2026-07-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // The sprint that was edited reports the gap that opened after it.
    fireEvent.click(screen.getByLabelText('Edit sprint 1'));
    expect(screen.getByText(/gap between this sprint and the one after/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Re-flow following sprints' }));

    expect(board().sprints[1]?.startDate).toBe('2026-07-21');
    expect(board().sprints[2]?.startDate).toBe('2026-08-04');
  });

  it('closes a gap from the later sprint too', () => {
    render(<BoardWorkspace />);
    fireEvent.click(screen.getByLabelText('Edit sprint 1'));
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2026-07-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.click(screen.getByLabelText('Edit sprint 2'));
    expect(screen.getByText(/gap between this sprint and the one before/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Re-flow following sprints' }));

    expect(board().sprints[1]?.startDate).toBe('2026-07-21');
  });

  it('warns about an overlap', () => {
    render(<BoardWorkspace />);
    fireEvent.click(screen.getByLabelText('Edit sprint 1'));
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2026-08-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.click(screen.getByLabelText('Edit sprint 2'));
    expect(screen.getByText(/overlaps the one before it/i)).toBeInTheDocument();
  });

  it('removes a sprint after naming what it costs', async () => {
    render(<BoardWorkspace />);
    fireEvent.click(screen.getByLabelText('Edit sprint 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove sprint' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/PLAT-101/)).toBeInTheDocument();
    expect(board().sprints).toHaveLength(6);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove sprint' }));

    await waitFor(() => expect(board().sprints).toHaveLength(5), { timeout: 2000 });
    expect(ticket('t-101')?.placement).toBeNull();
  });

  it('empties the column before closing it, and commits last', async () => {
    render(<BoardWorkspace />);
    fireEvent.click(screen.getByLabelText('Remove sprint 3'));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove sprint' }),
    );

    // Stage one: nothing has changed yet, the three tickets that start in the
    // sprint have handed over to flying copies, and the backlog is already
    // holding their rows open.
    expect(board().sprints).toHaveLength(6);
    expect(document.querySelector('.board-grid')?.getAttribute('style')).not.toContain(
      'minmax(0px, 0fr)',
    );
    expect(document.querySelectorAll('.board-cell[data-leaving="true"]')).toHaveLength(3);
    expect(document.querySelectorAll('.ticket-flight')).toHaveLength(3);
    expect(document.querySelectorAll('.backlog-list li[data-flying="true"]')).toHaveLength(3);

    // Stage two: the emptied column collapses, still before any commit.
    await waitFor(() =>
      expect(document.querySelector('.board-grid')?.getAttribute('style')).toContain(
        'minmax(0px, 0fr)',
      ),
    );
    expect(board().sprints).toHaveLength(6);
    expect(document.querySelectorAll('.ticket-flight')).toHaveLength(0);

    await waitFor(() => expect(board().sprints).toHaveLength(5), { timeout: 2000 });
    expect(document.querySelector('[data-dissolving="true"]')).toBeNull();
    expect(document.querySelectorAll('.backlog-list li[data-flying="true"]')).toHaveLength(0);
  });

  it('pulls back a card that ends in the sprint being removed', async () => {
    render(<BoardWorkspace />);
    // PLAT-112 spans sprints 2-4, so removing sprint 4 shortens it.
    fireEvent.click(screen.getByLabelText('Remove sprint 4'));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove sprint' }),
    );

    const cell = screen.getByText('Audit log pipeline').closest('.board-cell');
    expect(cell).toHaveAttribute('data-retracting', 'true');
    expect(cell?.getAttribute('style')).toContain('--retract: 0.6666666666666666');

    await waitFor(() => expect(ticket('t-112')?.placement?.span).toBe(2), { timeout: 2000 });
  });

  it('skips the animation when the viewer asks for reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    render(<BoardWorkspace />);
    fireEvent.click(screen.getByLabelText('Remove sprint 3'));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove sprint' }),
    );

    expect(board().sprints).toHaveLength(5);
    vi.unstubAllGlobals();
  });

  it('removes a sprint from its header, with the same clip rules', async () => {
    render(<BoardWorkspace />);

    // PLAT-112 starts in sprint 2 and spans 3; sprint 3 also starts three tickets.
    expect(ticket('t-112')?.placement).toEqual({ startSprintId: 's2', span: 3 });

    fireEvent.click(screen.getByLabelText('Remove sprint 3'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/PLAT-115/)).toBeInTheDocument();
    expect(within(dialog).getByText(/PLAT-112/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove sprint' }));

    await waitFor(() => expect(board().sprints).toHaveLength(5), { timeout: 2000 });
    expect(board().sprints.map((s) => s.id)).toEqual(['s1', 's2', 's4', 's5', 's6']);
    // Started in the removed sprint: back to the backlog.
    expect(ticket('t-115')?.placement).toBeNull();
    expect(ticket('t-121')?.placement).toBeNull();
    // Only spanned across it: shrinks to the last sprint it still covers.
    expect(ticket('t-112')?.placement).toEqual({ startSprintId: 's2', span: 2 });
  });

  it('can be cancelled from the header', () => {
    render(<BoardWorkspace />);

    fireEvent.click(screen.getByLabelText('Remove sprint 3'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(board().sprints).toHaveLength(6);
    expect(ticket('t-115')?.placement).not.toBeNull();
  });

  it('adds a sprint to the end', () => {
    render(<BoardWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Add sprint' }));

    expect(board().sprints).toHaveLength(7);
    expect(screen.getByLabelText('Edit sprint 7')).toBeInTheDocument();
  });
});

describe('setup wizard', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useBoardStore.getState().resetBoard());
  });

  it('generates the requested run of sprints', () => {
    render(<BoardWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Set up sprints' }));

    fireEvent.change(screen.getByLabelText('First sprint starts'), {
      target: { value: '2026-09-07' },
    });
    fireEvent.change(screen.getByLabelText('Number of sprints'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Length in calendar days'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create sprints' }));

    expect(board().sprints).toHaveLength(3);
    expect(board().sprints[0]).toMatchObject({ startDate: '2026-09-07', endDate: '2026-09-13' });
    expect(board().sprints[1]?.startDate).toBe('2026-09-14');
  });

  it('rejects counts and lengths that are not whole numbers', () => {
    render(<BoardWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Set up sprints' }));

    fireEvent.change(screen.getByLabelText('Number of sprints'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create sprints' }));
    expect(screen.getByText(/whole number of at least 1/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Number of sprints'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Length in calendar days'), {
      target: { value: '2.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create sprints' }));
    expect(screen.getByText(/whole number of calendar days/i)).toBeInTheDocument();

    expect(board().sprints).toEqual([]);
  });
});

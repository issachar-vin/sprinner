import { fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoBoard } from '../lib/seed';
import { useBoardStore } from '../store/boardStore';
import { BoardWorkspace } from './BoardWorkspace';

const board = () => useBoardStore.getState().board;

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: 'Team and capacity' }));
  return screen.getByRole('dialog');
}

describe('capacity panel', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useBoardStore.getState().replaceBoard(createDemoBoard('2026-08-14')));
  });

  it('adds a member, which changes every sprint bandwidth', () => {
    render(<BoardWorkspace />);
    const before = screen.getAllByText('40')[0];
    expect(before).toBeInTheDocument();

    openPanel();
    fireEvent.change(screen.getByLabelText('New member name'), { target: { value: 'Sam Okafor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(board().members).toHaveLength(5);
    expect(board().members[4]?.name).toBe('Sam Okafor');
    // Ten workdays for five people rather than four.
    expect(screen.getAllByText('50').length).toBeGreaterThan(0);
  });

  it('renames a member in place', () => {
    render(<BoardWorkspace />);
    openPanel();

    fireEvent.change(screen.getByLabelText('Name of Priya Raman'), {
      target: { value: 'Priya R.' },
    });

    expect(board().members[0]?.name).toBe('Priya R.');
  });

  it('leaves nothing pointing at a removed member', () => {
    render(<BoardWorkspace />);
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Marcus Cole' }));

    expect(board().members.map((member) => member.name)).not.toContain('Marcus Cole');
    expect(board().tickets.filter((ticket) => ticket.assigneeId === 'm2')).toEqual([]);
    expect(board().timeOff.filter((entry) => entry.type === 'pto')).toEqual([]);
  });

  it('adds a company holiday and takes it off the bandwidth', () => {
    render(<BoardWorkspace />);
    const dialog = openPanel();

    fireEvent.change(within(dialog).getByLabelText('Label'), { target: { value: 'Summer day' } });
    fireEvent.change(within(dialog).getByLabelText('From'), { target: { value: '2026-08-25' } });
    fireEvent.change(within(dialog).getByLabelText('To'), { target: { value: '2026-08-25' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add time off' }));

    const added = board().timeOff.find((entry) => entry.label === 'Summer day');
    expect(added?.type).toBe('holiday');
    expect(added?.startDate).toBe('2026-08-25');
  });

  it('requires a member for personal time off', () => {
    render(<BoardWorkspace />);
    const dialog = openPanel();

    fireEvent.change(within(dialog).getByLabelText('Type'), { target: { value: 'pto' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add time off' }));

    expect(within(dialog).getByText(/choose whose time off/i)).toBeInTheDocument();
    expect(board().timeOff).toHaveLength(2);
  });

  it('records time off for one member', () => {
    render(<BoardWorkspace />);
    const dialog = openPanel();

    fireEvent.change(within(dialog).getByLabelText('Type'), { target: { value: 'pto' } });
    fireEvent.change(within(dialog).getByLabelText('Member'), { target: { value: 'm3' } });
    fireEvent.change(within(dialog).getByLabelText('Label'), { target: { value: 'Conference' } });
    fireEvent.change(within(dialog).getByLabelText('From'), { target: { value: '2026-08-17' } });
    fireEvent.change(within(dialog).getByLabelText('To'), { target: { value: '2026-08-18' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add time off' }));

    const added = board().timeOff.find((entry) => entry.label === 'Conference');
    expect(added).toMatchObject({ type: 'pto', memberId: 'm3', endDate: '2026-08-18' });
  });

  it('refuses a range that runs backwards', () => {
    render(<BoardWorkspace />);
    const dialog = openPanel();

    fireEvent.change(within(dialog).getByLabelText('From'), { target: { value: '2026-08-20' } });
    fireEvent.change(within(dialog).getByLabelText('To'), { target: { value: '2026-08-10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add time off' }));

    expect(within(dialog).getByText(/must not be before/i)).toBeInTheDocument();
    expect(board().timeOff).toHaveLength(2);
  });

  it('removes a time off entry', () => {
    render(<BoardWorkspace />);
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Company holiday' }));

    expect(board().timeOff.some((entry) => entry.label === 'Company holiday')).toBe(false);
  });

  it('converts days to points with the configured rate', () => {
    render(<BoardWorkspace />);
    const dialog = openPanel();

    fireEvent.change(within(dialog).getByLabelText('Days per point'), { target: { value: '2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save conversion' }));

    expect(board().settings.daysPerPoint).toBe(2);
    // Forty person-days at two days a point is twenty points of bandwidth.
    expect(screen.getAllByText('20').length).toBeGreaterThan(0);
  });

  it('refuses a conversion rate that is not a positive number', () => {
    render(<BoardWorkspace />);
    const dialog = openPanel();

    fireEvent.change(within(dialog).getByLabelText('Days per point'), { target: { value: '0' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save conversion' }));

    expect(within(dialog).getByText(/positive number/i)).toBeInTheDocument();
    expect(board().settings.daysPerPoint).toBe(1);
  });

  it('moves the balance colours with the thresholds', () => {
    render(<BoardWorkspace />);
    const dialog = openPanel();

    fireEvent.change(within(dialog).getByLabelText('Green above'), { target: { value: '30' } });
    fireEvent.change(within(dialog).getByLabelText('Yellow above'), { target: { value: '25' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save conversion' }));

    expect(board().settings.thresholds).toEqual({ green: 30, yellow: 25 });
    // Sprint 1 has a balance of 27, which now reads as yellow rather than green.
    const header = screen.getByRole('heading', { name: 'Sprint 1' }).closest('.sprint-header');
    expect(within(header as HTMLElement).getByText('+27 balance')).toHaveClass('balance--yellow');
  });
});

describe('per-member load', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useBoardStore.getState().replaceBoard(createDemoBoard('2026-08-14')));
  });

  it('breaks a sprint total down by assignee', () => {
    render(<BoardWorkspace />);

    const header = screen.getByRole('heading', { name: 'Sprint 1' }).closest('.sprint-header');
    const chips = within(header as HTMLElement).getAllByRole('listitem');

    // Sprint 1 holds PLAT-101 (Priya, 5) and PLAT-104 (Marcus, 8).
    expect(chips.map((chip) => chip.textContent)).toEqual(['PR5', 'MC8']);
    expect(chips[0]).toHaveAttribute('title', 'Priya Raman: 5 points');
  });

  it('counts unestimated work under its assignee', () => {
    render(<BoardWorkspace />);

    const header = screen.getByRole('heading', { name: 'Sprint 3' }).closest('.sprint-header');
    const dana = within(header as HTMLElement)
      .getAllByRole('listitem')
      .find((chip) => chip.textContent?.startsWith('DW'));

    expect(dana).toHaveAttribute('title', 'Dana Whitfield: 0 points, 1 unestimated');
  });
});

import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Member, Ticket } from '../model/types';
import { Backlog } from './Backlog';

const members: Member[] = [
  { id: 'm1', name: 'Priya Raman' },
  { id: 'm2', name: 'Marcus Cole' },
];

const tickets: Ticket[] = [
  {
    id: 't1',
    key: 'PLAT-1',
    title: 'Webhook retry backoff',
    points: 5,
    assigneeId: 'm1',
    blockedBy: [],
    epicKey: null,
    placement: null,
  },
  {
    id: 't2',
    key: 'PLAT-2',
    title: 'Purge orphaned attachments',
    points: 3,
    assigneeId: 'm2',
    blockedBy: ['t3'],
    epicKey: null,
    placement: null,
  },
  {
    id: 't3',
    key: 'PLAT-3',
    title: 'Tenant export service',
    points: null,
    assigneeId: null,
    blockedBy: [],
    epicKey: null,
    placement: null,
  },
];

const onDelete = vi.fn();

function renderBacklog(list: Ticket[] = tickets) {
  return render(
    <DndContext>
      <Backlog tickets={list} members={members} allTickets={tickets} onDelete={onDelete} />
    </DndContext>,
  );
}

describe('Backlog', () => {
  it('lists every unplaced ticket with its count', () => {
    renderBacklog();

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: /backlog/i })).toHaveTextContent('Backlog 3');
  });

  it('resolves blocker ids to keys', () => {
    renderBacklog();
    expect(screen.getByText('Blocked by PLAT-3')).toBeInTheDocument();
  });

  it('searches by key and title', () => {
    renderBacklog();
    const search = screen.getByLabelText('Search backlog');

    fireEvent.change(search, { target: { value: 'orphaned' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Purge orphaned attachments')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'plat-1' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Webhook retry backoff')).toBeInTheDocument();
  });

  it('filters by assignee and by unassigned', () => {
    renderBacklog();
    const filter = screen.getByLabelText('Filter by assignee');

    fireEvent.change(filter, { target: { value: 'm1' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Webhook retry backoff')).toBeInTheDocument();

    fireEvent.change(filter, { target: { value: 'unassigned' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Tenant export service')).toBeInTheDocument();
  });

  it('explains an empty result rather than showing a blank panel', () => {
    renderBacklog();

    fireEvent.change(screen.getByLabelText('Search backlog'), {
      target: { value: 'nothing matches this' },
    });
    expect(screen.getByText('No tickets match these filters.')).toBeInTheDocument();
  });

  it('asks to delete a backlog ticket by id', () => {
    renderBacklog();

    fireEvent.click(screen.getByLabelText('Delete PLAT-2'));
    expect(onDelete).toHaveBeenCalledWith('t2');
  });

  it('shows a distinct empty state when nothing is in the backlog', () => {
    renderBacklog([]);
    expect(screen.getByText(/backlog is empty/i)).toBeInTheDocument();
  });
});

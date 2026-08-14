import { describe, expect, it } from 'vitest';
import { parseBoard } from './schema';
import { createEmptyBoard, SCHEMA_VERSION } from './types';

describe('parseBoard', () => {
  it('accepts an empty board', () => {
    const result = parseBoard(createEmptyBoard());
    expect(result.ok).toBe(true);
  });

  it('accepts a fully populated board', () => {
    const board = {
      ...createEmptyBoard(),
      members: [{ id: 'm1', name: 'Alice' }],
      sprints: [{ id: 's1', name: 'Sprint 1', startDate: '2026-08-03', endDate: '2026-08-14' }],
      tickets: [
        {
          id: 't1',
          key: 'PROJ-1',
          title: 'Build the thing',
          points: 5,
          assigneeId: 'm1',
          blockedBy: [],
          epicKey: 'PROJ-100',
          placement: { startSprintId: 's1', span: 2 },
        },
      ],
      timeOff: [
        {
          id: 'o1',
          type: 'pto',
          memberId: 'm1',
          startDate: '2026-08-05',
          endDate: null,
          label: 'Vacation',
        },
      ],
      rowOrder: ['t1'],
    };
    expect(parseBoard(board).ok).toBe(true);
  });

  it('rejects a mismatched version', () => {
    const result = parseBoard({ ...createEmptyBoard(), version: SCHEMA_VERSION + 1 });
    expect(result.ok).toBe(false);
  });

  it('rejects a missing version', () => {
    const board: Record<string, unknown> = { ...createEmptyBoard() };
    delete board.version;
    expect(parseBoard(board).ok).toBe(false);
  });

  it('rejects a malformed date', () => {
    const board = {
      ...createEmptyBoard(),
      sprints: [{ id: 's1', name: null, startDate: '03-08-2026', endDate: '2026-08-14' }],
    };
    const result = parseBoard(board);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/YYYY-MM-DD/);
  });

  it('rejects a zero-column span', () => {
    const board = {
      ...createEmptyBoard(),
      tickets: [
        {
          id: 't1',
          key: 'PROJ-1',
          title: 'x',
          points: null,
          assigneeId: null,
          blockedBy: [],
          epicKey: null,
          placement: { startSprintId: 's1', span: 0 },
        },
      ],
    };
    expect(parseBoard(board).ok).toBe(false);
  });

  it('rejects PTO with no member', () => {
    const board = {
      ...createEmptyBoard(),
      timeOff: [
        { id: 'o1', type: 'pto', startDate: '2026-08-05', endDate: null, label: 'Vacation' },
      ],
    };
    expect(parseBoard(board).ok).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(parseBoard(null).ok).toBe(false);
    expect(parseBoard('nope').ok).toBe(false);
    expect(parseBoard(undefined).ok).toBe(false);
  });

  it('reports the offending field', () => {
    const result = parseBoard({ ...createEmptyBoard(), members: [{ id: '', name: 'Alice' }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/members\.0\.id/);
  });
});

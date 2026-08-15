import { describe, expect, it } from 'vitest';
import { BACKLOG_DROP_ID, cellDropId, parseDropId } from './dropTarget';

describe('drop targets', () => {
  it('round-trips a cell above a given row', () => {
    expect(parseDropId(cellDropId('s2', 't-104'))).toEqual({
      kind: 'cell',
      sprintId: 's2',
      beforeTicketId: 't-104',
    });
  });

  it('round-trips the trailing append row', () => {
    expect(parseDropId(cellDropId('s2', null))).toEqual({
      kind: 'cell',
      sprintId: 's2',
      beforeTicketId: null,
    });
  });

  it('recognises the backlog', () => {
    expect(parseDropId(BACKLOG_DROP_ID)).toEqual({ kind: 'backlog' });
  });

  it('rejects anything else', () => {
    expect(parseDropId('nonsense')).toBeNull();
    expect(parseDropId('cell:')).toBeNull();
  });
});

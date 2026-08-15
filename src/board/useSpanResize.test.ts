import { describe, expect, it } from 'vitest';
import type { ResizeDrag } from './useSpanResize';
import { columnIndexAt, snapToColumn, stretchBounds } from './useSpanResize';

function rect(left: number, right: number): DOMRect {
  return { left, right, width: right - left } as DOMRect;
}

const columns = [rect(0, 100), rect(100, 200), rect(200, 300)];

describe('columnIndexAt', () => {
  it('finds the column under the pointer', () => {
    expect(columnIndexAt(columns, 50)).toBe(0);
    expect(columnIndexAt(columns, 150)).toBe(1);
    expect(columnIndexAt(columns, 250)).toBe(2);
  });

  it('clamps to the nearest column outside the grid', () => {
    expect(columnIndexAt(columns, -400)).toBe(0);
    expect(columnIndexAt(columns, 900)).toBe(2);
  });

  it('returns the first column when nothing is measured', () => {
    expect(columnIndexAt([], 120)).toBe(0);
  });
});

describe('snapToColumn', () => {
  const drag = (over: Partial<ResizeDrag>): ResizeDrag => ({
    ticketId: 't1',
    edge: 'end',
    startIndex: 1,
    span: 1,
    endIndex: 1,
    originX: 150,
    columns,
    minDelta: -1000,
    maxDelta: 1000,
    ...over,
  });

  it('takes the span out to the column the pointer is over', () => {
    expect(snapToColumn(drag({}), 250)).toEqual({ startIndex: 1, span: 2 });
  });

  it('never snaps below one column', () => {
    expect(snapToColumn(drag({}), 0)).toEqual({ startIndex: 1, span: 1 });
  });

  it('moves the start column when the left edge is dragged', () => {
    expect(snapToColumn(drag({ edge: 'start', startIndex: 1, endIndex: 2, span: 2 }), 50)).toEqual({
      startIndex: 0,
      span: 3,
    });
  });

  it('will not drag the left edge past its own end', () => {
    expect(snapToColumn(drag({ edge: 'start', startIndex: 0, endIndex: 1, span: 2 }), 290)).toEqual(
      {
        startIndex: 1,
        span: 1,
      },
    );
  });
});

describe('stretchBounds', () => {
  const card = (left: number, right: number) => ({ left, right, width: right - left }) as DOMRect;

  it('stops the right edge at the last column', () => {
    const bounds = stretchBounds('end', card(100, 200), columns);
    expect(bounds.maxDelta).toBe(100);
  });

  it('stops the left edge at the first column', () => {
    const bounds = stretchBounds('start', card(100, 200), columns);
    expect(bounds.minDelta).toBe(-100);
  });

  it('never lets a card shrink away entirely', () => {
    expect(stretchBounds('end', card(100, 200), columns).minDelta).toBe(-52);
    expect(stretchBounds('start', card(100, 200), columns).maxDelta).toBe(52);
  });

  it('gives no room when the card already fills the board', () => {
    expect(stretchBounds('end', card(0, 300), columns).maxDelta).toBe(0);
    expect(stretchBounds('start', card(0, 300), columns).minDelta).toBe(0);
  });
});

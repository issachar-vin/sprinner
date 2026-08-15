import { describe, expect, it } from 'vitest';
import type { ResizeDrag } from './useSpanResize';
import { columnIndexAt, snapToColumn } from './useSpanResize';

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

import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

export type ResizeEdge = 'start' | 'end';

export type ResizePreview = {
  ticketId: string;
  edge: ResizeEdge;
  /** Pointer travel in px. The card stretches freely by this much until release. */
  delta: number;
};

export type Span = {
  startIndex: number;
  span: number;
};

export type ResizeDrag = Span & {
  ticketId: string;
  edge: ResizeEdge;
  endIndex: number;
  originX: number;
  columns: DOMRect[];
  /** How far the card may stretch before it leaves the board. */
  minDelta: number;
  maxDelta: number;
};

/** A card never shrinks below this, whichever edge is being dragged. */
const MIN_CARD_WIDTH = 48;

/**
 * The stretch is bounded by the board itself. Beyond it the card would overhang
 * the grid, which grows the scroll container and flickers a scrollbar in and
 * out mid-drag — and it would preview a span that the snap cannot produce.
 */
export function stretchBounds(
  edge: ResizeEdge,
  card: DOMRect,
  columns: readonly DOMRect[],
): { minDelta: number; maxDelta: number } {
  const first = columns[0];
  const last = columns[columns.length - 1];
  const room = Math.max(card.width - MIN_CARD_WIDTH, 0);

  if (edge === 'end') {
    return { minDelta: -room, maxDelta: last ? Math.max(last.right - card.right, 0) : 0 };
  }
  return { minDelta: first ? Math.min(first.left - card.left, 0) : 0, maxDelta: room };
}

/** Nearest column to `x`, clamped to the grid rather than returning nothing. */
export function columnIndexAt(columns: readonly DOMRect[], x: number): number {
  if (columns.length === 0) return 0;

  let nearest = 0;
  let nearestDistance = Infinity;

  for (const [index, rect] of columns.entries()) {
    if (x >= rect.left && x <= rect.right) return index;
    const distance = Math.min(Math.abs(x - rect.left), Math.abs(x - rect.right));
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Whole sprints only — the release lands on the column under the pointer. */
export function snapToColumn(drag: ResizeDrag, x: number): Span {
  const column = columnIndexAt(drag.columns, x);

  if (drag.edge === 'end') {
    return { startIndex: drag.startIndex, span: Math.max(column - drag.startIndex + 1, 1) };
  }

  const startIndex = Math.min(column, drag.endIndex);
  return { startIndex, span: drag.endIndex - startIndex + 1 };
}

/**
 * Resize is pointer-only by design (see docs/spec.md), so this owns raw pointer
 * handlers rather than going through dnd-kit. The card follows the pointer
 * pixel for pixel while dragging and snaps to a whole sprint on release —
 * a live-snapping preview hides which column you are actually over.
 */
export function useSpanResize(
  gridRef: RefObject<HTMLElement | null>,
  onCommit: (ticketId: string, startIndex: number, span: number) => void,
) {
  const [preview, setPreview] = useState<ResizePreview | null>(null);
  const drag = useRef<ResizeDrag | null>(null);

  const beginResize = useCallback(
    (
      event: ReactPointerEvent,
      ticketId: string,
      startIndex: number,
      span: number,
      edge: ResizeEdge,
    ) => {
      // Without this the card's own drag sensor claims the gesture.
      event.stopPropagation();
      event.preventDefault();

      const columns = Array.from(
        gridRef.current?.querySelectorAll('[data-column-index]') ?? [],
      ).map((column) => column.getBoundingClientRect());
      // The handle is a few pixels wide; the bounds belong to the cell it sits on.
      const cell = event.currentTarget.closest('.board-cell') ?? event.currentTarget;
      const card = cell.getBoundingClientRect();

      drag.current = {
        ticketId,
        edge,
        startIndex,
        span,
        endIndex: startIndex + span - 1,
        originX: event.clientX,
        columns,
        ...stretchBounds(edge, card, columns),
      };
      setPreview({ ticketId, edge, delta: 0 });

      const onMove = (moveEvent: PointerEvent) => {
        const current = drag.current;
        if (!current) return;
        const travel = moveEvent.clientX - current.originX;
        setPreview({ ticketId, edge, delta: clamp(travel, current.minDelta, current.maxDelta) });
      };

      const onUp = (upEvent: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        const current = drag.current;
        drag.current = null;
        setPreview(null);
        if (!current) return;

        const snapped = snapToColumn(current, upEvent.clientX);
        if (snapped.startIndex !== current.startIndex || snapped.span !== current.span) {
          onCommit(current.ticketId, snapped.startIndex, snapped.span);
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [gridRef, onCommit],
  );

  return { preview, beginResize };
}

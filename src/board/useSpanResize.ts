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
};

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

      drag.current = {
        ticketId,
        edge,
        startIndex,
        span,
        endIndex: startIndex + span - 1,
        originX: event.clientX,
        columns,
      };
      setPreview({ ticketId, edge, delta: 0 });

      const onMove = (moveEvent: PointerEvent) => {
        const current = drag.current;
        if (!current) return;
        setPreview({ ticketId, edge, delta: moveEvent.clientX - current.originX });
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

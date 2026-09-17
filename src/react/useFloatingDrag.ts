'use client';

import { useCallback, useRef, useState } from 'react';

import {
  clampFloatingPoint,
  loadFloatingPoint,
  saveFloatingPoint,
  type FloatingPoint,
} from './widgetLayer.js';

type DragSession = {
  startX: number;
  startY: number;
  orig: FloatingPoint;
  moved: boolean;
};

export function useFloatingDrag(
  storageKey: string,
  defaultPoint: () => FloatingPoint,
  size: { width: number; height: number },
) {
  const [point, setPoint] = useState<FloatingPoint>(() =>
    clampFloatingPoint(loadFloatingPoint(storageKey, defaultPoint()), size),
  );
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragSession | null>(null);

  const commit = useCallback(
    (next: FloatingPoint) => {
      const clamped = clampFloatingPoint(next, size);
      setPoint(clamped);
      saveFloatingPoint(storageKey, clamped);
      return clamped;
    },
    [size, storageKey],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('label, input, a')) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      orig: point,
      moved: false,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const session = dragRef.current;
    if (!session) return;
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) session.moved = true;
    commit({
      x: session.orig.x + dx,
      y: session.orig.y + dy,
    });
  };

  const endPointer = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    const moved = dragRef.current.moved;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    return moved;
  };

  return {
    point,
    dragging,
    onPointerDown,
    onPointerMove,
    endPointer,
    setPoint: commit,
  };
}

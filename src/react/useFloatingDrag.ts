'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  anchorToPoint,
  loadWidgetAnchor,
  nearestAnchor,
  saveWidgetAnchor,
  type WidgetAnchor,
} from './widgetAnchors';
import { clampFloatingPoint, type FloatingPoint } from './widgetLayer';

type DragSession = {
  startX: number;
  startY: number;
  orig: FloatingPoint;
  moved: boolean;
};

const SNAP_TRANSITION =
  'left 0.32s cubic-bezier(0.34, 1.2, 0.64, 1), top 0.32s cubic-bezier(0.34, 1.2, 0.64, 1)';

export function useFloatingDrag(
  storageKey: string,
  defaultAnchor: WidgetAnchor,
  size: { width: number; height: number },
) {
  const [anchor, setAnchor] = useState<WidgetAnchor>(() =>
    loadWidgetAnchor(storageKey, defaultAnchor, size),
  );
  const [point, setPoint] = useState<FloatingPoint>(() =>
    typeof window === 'undefined'
      ? { x: 16, y: 16 }
      : anchorToPoint(loadWidgetAnchor(storageKey, defaultAnchor, size), size),
  );
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragSession | null>(null);

  const snapToAnchor = useCallback(
    (nextAnchor: WidgetAnchor) => {
      const target = anchorToPoint(nextAnchor, size);
      setAnchor(nextAnchor);
      setPoint(target);
      saveWidgetAnchor(storageKey, nextAnchor);
      return target;
    },
    [size, storageKey],
  );

  const snapToNearest = useCallback(
    (from: FloatingPoint) => {
      const nextAnchor = nearestAnchor(from, size);
      return snapToAnchor(nextAnchor);
    },
    [size, snapToAnchor],
  );

  useEffect(() => {
    const onResize = () => {
      setPoint(anchorToPoint(anchor, size));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [anchor, size]);

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
    setPoint(
      clampFloatingPoint(
        {
          x: session.orig.x + dx,
          y: session.orig.y + dy,
        },
        size,
      ),
    );
  };

  const endPointer = (event: React.PointerEvent<HTMLElement>) => {
    const session = dragRef.current;
    if (!session) return false;
    const moved = session.moved;
    const releasePoint = moved
      ? clampFloatingPoint(
          {
            x: session.orig.x + (event.clientX - session.startX),
            y: session.orig.y + (event.clientY - session.startY),
          },
          size,
        )
      : point;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (moved) {
      snapToNearest(releasePoint);
    }
    return moved;
  };

  return {
    point,
    anchor,
    dragging,
    snapTransition: dragging ? 'none' : SNAP_TRANSITION,
    onPointerDown,
    onPointerMove,
    endPointer,
    snapToAnchor,
  };
}

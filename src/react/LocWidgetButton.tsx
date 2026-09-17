'use client';

import { COLOCATION_WIDGET_Z } from './widgetLayer.js';
import { useFloatingDrag } from './useFloatingDrag.js';

const PILL_STORAGE = 'next-colocation-widget-pill-position';
const PILL_W = 44;
const PILL_H = 28;

function defaultPillPoint() {
  return {
    x: 16,
    y: Math.max(16, window.innerHeight - PILL_H - 16),
  };
}

export type LocWidgetButtonProps = {
  open: boolean;
  onToggle: () => void;
};

export function LocWidgetButton({ open, onToggle }: LocWidgetButtonProps) {
  const { point, dragging, onPointerDown, onPointerMove, endPointer } = useFloatingDrag(
    PILL_STORAGE,
    defaultPillPoint,
    { width: PILL_W, height: PILL_H },
  );

  return (
    <div
      role="button"
      tabIndex={0}
      data-colocation-devtools
      data-colocation-drag-handle
      aria-pressed={open}
      aria-label="Colocation audit. Drag to move, click to toggle."
      className={`fixed touch-none rounded-full border px-3 py-1 font-mono text-[10px] shadow-lg backdrop-blur-sm ${
        open
          ? 'border-sky-500/50 bg-zinc-900/95 text-sky-200 ring-2 ring-sky-400/30'
          : 'border-white/15 bg-zinc-900/90 text-zinc-300 hover:text-white'
      } ${dragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
      style={{
        left: point.x,
        top: point.y,
        zIndex: COLOCATION_WIDGET_Z,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => {
        const moved = endPointer(event);
        if (!moved) onToggle();
      }}
      onPointerCancel={(event) => {
        endPointer(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
      title="Drag to move · click to toggle · Alt+Shift+C"
    >
      loc
    </div>
  );
}

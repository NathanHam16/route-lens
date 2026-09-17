'use client';

import { FolderTree } from 'lucide-react';

import { COLOCATION_WIDGET_Z } from './widgetLayer';
import { useFloatingDrag } from './useFloatingDrag';

const PILL_STORAGE = 'route-lens-pill';
const WIDGET_SIZE = 44;

export type LocWidgetButtonProps = {
  open: boolean;
  onToggle: () => void;
};

export function LocWidgetButton({ open, onToggle }: LocWidgetButtonProps) {
  const { point, dragging, snapTransition, onPointerDown, onPointerMove, endPointer } =
    useFloatingDrag(PILL_STORAGE, 'bottom-left', {
      width: WIDGET_SIZE,
      height: WIDGET_SIZE,
    });

  return (
    <div
      role="button"
      tabIndex={0}
      data-route-lens
      data-colocation-drag-handle
      aria-pressed={open}
      aria-label="Colocation audit. Drag to a screen edge, click to toggle."
      className={`fixed flex touch-none items-center justify-center rounded-full border shadow-lg backdrop-blur-md ${
        open
          ? 'border-sky-400/60 bg-zinc-900/95 text-sky-300 ring-2 ring-sky-400/35'
          : 'border-white/20 bg-zinc-900/90 text-zinc-200 hover:border-white/30 hover:bg-zinc-900 hover:text-white'
      } ${dragging ? 'scale-105 cursor-grabbing select-none shadow-xl' : 'cursor-grab hover:scale-105'}`}
      style={{
        left: point.x,
        top: point.y,
        width: WIDGET_SIZE,
        height: WIDGET_SIZE,
        zIndex: COLOCATION_WIDGET_Z,
        transition: snapTransition,
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
      title="Drag to snap · click to toggle · Alt+Shift+C"
    >
      <FolderTree
        className={`pointer-events-none ${open ? 'text-sky-300' : 'text-current'}`}
        size={20}
        strokeWidth={2}
        aria-hidden
      />
    </div>
  );
}

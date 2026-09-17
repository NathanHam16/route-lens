'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { COLOCATION_WIDGET_Z } from './widgetLayer.js';

export type PanelBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const STORAGE_KEY = 'next-colocation-widget-panel-bounds';
const MIN_W = 240;
const MIN_H = 160;
const DEFAULT_W = 300;
const DEFAULT_H = 380;

function defaultBounds(): PanelBounds {
  if (typeof window === 'undefined') {
    return { x: 24, y: 80, width: DEFAULT_W, height: DEFAULT_H };
  }
  return clampBounds({
    x: Math.max(16, window.innerWidth - DEFAULT_W - 24),
    y: Math.max(16, Math.round(window.innerHeight * 0.1)),
    width: DEFAULT_W,
    height: DEFAULT_H,
  });
}

function loadBounds(): PanelBounds {
  if (typeof window === 'undefined') return defaultBounds();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBounds();
    const parsed = JSON.parse(raw) as PanelBounds;
    if (
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number' &&
      typeof parsed.width === 'number' &&
      typeof parsed.height === 'number'
    ) {
      return clampBounds(parsed);
    }
  } catch {
    // ignore
  }
  return defaultBounds();
}

export function clampBounds(bounds: PanelBounds): PanelBounds {
  const margin = 8;
  const maxW = Math.max(MIN_W, window.innerWidth - margin * 2);
  const maxH = Math.max(MIN_H, window.innerHeight - margin * 2);
  const width = Math.min(Math.max(MIN_W, bounds.width), maxW);
  const height = Math.min(Math.max(MIN_H, bounds.height), maxH);
  const x = Math.min(Math.max(margin, bounds.x), Math.max(margin, window.innerWidth - width - margin));
  const y = Math.min(Math.max(margin, bounds.y), Math.max(margin, window.innerHeight - height - margin));
  return { x, y, width, height };
}

export type DraggablePanelProps = {
  children: ReactNode;
  header: ReactNode;
  fontSizePx: number;
};

export function DraggablePanel({ children, header, fontSizePx }: DraggablePanelProps) {
  const [bounds, setBounds] = useState<PanelBounds>(() => loadBounds());
  const dragRef = useRef<{ startX: number; startY: number; orig: PanelBounds } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; orig: PanelBounds } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  const persist = useCallback((next: PanelBounds) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const commitBounds = useCallback(
    (next: PanelBounds) => {
      const clamped = clampBounds(next);
      setBounds(clamped);
      persist(clamped);
      return clamped;
    },
    [persist],
  );

  const onDragPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, label, input')) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, orig: bounds };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onDragPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = dragRef.current;
    if (!session) return;
    commitBounds({
      ...session.orig,
      x: session.orig.x + (event.clientX - session.startX),
      y: session.orig.y + (event.clientY - session.startY),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeRef.current = { startX: event.clientX, startY: event.clientY, orig: bounds };
    setResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  };

  const onResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = resizeRef.current;
    if (!session) return;
    commitBounds({
      ...session.orig,
      width: session.orig.width + (event.clientX - session.startX),
      height: session.orig.height + (event.clientY - session.startY),
    });
  };

  const endResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    setResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const onWindowResize = () => {
      setBounds((current) => clampBounds(current));
    };
    window.addEventListener('resize', onWindowResize);
    return () => window.removeEventListener('resize', onWindowResize);
  }, []);

  return (
    <div
      data-colocation-devtools
      className={`fixed flex flex-col overflow-hidden rounded-lg border border-white/15 bg-zinc-950/95 font-mono text-zinc-100 shadow-2xl ring-1 ring-white/10 backdrop-blur-md ${
        dragging || resizing ? 'select-none touch-none' : ''
      }`}
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        fontSize: fontSizePx,
        zIndex: COLOCATION_WIDGET_Z,
      }}
    >
      <div
        data-colocation-drag-handle
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`shrink-0 border-b border-white/10 leading-none ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {header}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

      <div
        role="separator"
        aria-label="Resize panel"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize touch-none"
        title="Drag to resize"
      >
        <svg viewBox="0 0 12 12" className="h-full w-full text-zinc-600" aria-hidden>
          <path d="M12 12H8V8h4v4zm-4 0H4V8h4v4zM8 8H4V4h4v4z" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

'use client';

import { createPortal } from 'react-dom';

import type { PageMountRect } from './highlightPageFile';
import { COLOCATION_WIDGET_Z } from './widgetLayer';

export type { PageMountRect };

export function PageHoverOverlay({ rects }: { rects: PageMountRect[] }) {
  if (rects.length === 0) return null;

  return createPortal(
    <>
      {rects.map((rect, index) => (
        <div
          key={index}
          aria-hidden
          className="pointer-events-none fixed box-border border-2 border-violet-400/90 shadow-[0_0_0_2px_rgba(167,139,250,0.35)]"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            zIndex: COLOCATION_WIDGET_Z - 1,
          }}
        />
      ))}
    </>,
    document.body,
  );
}

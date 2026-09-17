import type { FloatingPoint } from './widgetLayer';

export const WIDGET_MARGIN = 16;

export type WidgetAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'right-center'
  | 'bottom-right'
  | 'bottom-center'
  | 'bottom-left'
  | 'left-center';

export const WIDGET_ANCHORS: WidgetAnchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'right-center',
  'bottom-right',
  'bottom-center',
  'bottom-left',
  'left-center',
];

export function isWidgetAnchor(value: string): value is WidgetAnchor {
  return (WIDGET_ANCHORS as string[]).includes(value);
}

export function anchorToPoint(
  anchor: WidgetAnchor,
  size: { width: number; height: number },
  margin = WIDGET_MARGIN,
): FloatingPoint {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { width, height } = size;

  switch (anchor) {
    case 'top-left':
      return { x: margin, y: margin };
    case 'top-center':
      return { x: (vw - width) / 2, y: margin };
    case 'top-right':
      return { x: vw - width - margin, y: margin };
    case 'right-center':
      return { x: vw - width - margin, y: (vh - height) / 2 };
    case 'bottom-right':
      return { x: vw - width - margin, y: vh - height - margin };
    case 'bottom-center':
      return { x: (vw - width) / 2, y: vh - height - margin };
    case 'bottom-left':
      return { x: margin, y: vh - height - margin };
    case 'left-center':
      return { x: margin, y: (vh - height) / 2 };
  }
}

export function nearestAnchor(
  point: FloatingPoint,
  size: { width: number; height: number },
): WidgetAnchor {
  let best: WidgetAnchor = 'bottom-left';
  let bestDist = Infinity;

  for (const anchor of WIDGET_ANCHORS) {
    const target = anchorToPoint(anchor, size);
    const dist = (point.x - target.x) ** 2 + (point.y - target.y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = anchor;
    }
  }

  return best;
}

const ANCHOR_STORAGE_SUFFIX = '-anchor';
const LEGACY_POSITION_SUFFIX = '-position';

export function loadWidgetAnchor(
  storageKey: string,
  defaultAnchor: WidgetAnchor,
  size: { width: number; height: number },
): WidgetAnchor {
  if (typeof window === 'undefined') return defaultAnchor;

  try {
    const anchorRaw = sessionStorage.getItem(`${storageKey}${ANCHOR_STORAGE_SUFFIX}`);
    if (anchorRaw && isWidgetAnchor(anchorRaw)) {
      return anchorRaw;
    }
  } catch {
    // ignore
  }

  try {
    const legacyRaw = sessionStorage.getItem(`${storageKey}${LEGACY_POSITION_SUFFIX}`);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as FloatingPoint;
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return nearestAnchor(parsed, size);
      }
    }
  } catch {
    // ignore
  }

  return defaultAnchor;
}

export function saveWidgetAnchor(storageKey: string, anchor: WidgetAnchor): void {
  try {
    sessionStorage.setItem(`${storageKey}${ANCHOR_STORAGE_SUFFIX}`, anchor);
  } catch {
    // ignore
  }
}

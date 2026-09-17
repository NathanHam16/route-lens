/** Above modals, onboarding (9999), and app chrome — dev overlay only. */
export const COLOCATION_WIDGET_Z = 2_147_483_000;

export type FloatingPoint = { x: number; y: number };

export function clampFloatingPoint(
  point: FloatingPoint,
  size: { width: number; height: number },
): FloatingPoint {
  const margin = 8;
  return {
    x: Math.min(
      Math.max(margin, point.x),
      Math.max(margin, window.innerWidth - size.width - margin),
    ),
    y: Math.min(
      Math.max(margin, point.y),
      Math.max(margin, window.innerHeight - size.height - margin),
    ),
  };
}

export function loadFloatingPoint(storageKey: string, fallback: FloatingPoint): FloatingPoint {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as FloatingPoint;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return parsed;
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function saveFloatingPoint(storageKey: string, point: FloatingPoint): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(point));
  } catch {
    // ignore
  }
}

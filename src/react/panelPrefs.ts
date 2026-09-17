const ZOOM_KEY = 'next-colocation-widget-panel-zoom';
const MIN_ZOOM = 9;
const MAX_ZOOM = 18;
const DEFAULT_ZOOM = 11;

export function loadPanelZoom(): number {
  if (typeof window === 'undefined') return DEFAULT_ZOOM;
  try {
    const raw = sessionStorage.getItem(ZOOM_KEY);
    if (!raw) return DEFAULT_ZOOM;
    const value = Number.parseInt(raw, 10);
    if (Number.isFinite(value) && value >= MIN_ZOOM && value <= MAX_ZOOM) {
      return value;
    }
  } catch {
    // ignore
  }
  return DEFAULT_ZOOM;
}

export function savePanelZoom(px: number): void {
  try {
    sessionStorage.setItem(ZOOM_KEY, String(px));
  } catch {
    // ignore
  }
}

export function stepPanelZoom(current: number, delta: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
}

export { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM };

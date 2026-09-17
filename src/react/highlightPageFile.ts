import { getElementFiberUpward } from 'react-dev-inspector/es/Inspector/utils/fiber';

import type { AuditRow } from '../core/classify.js';
import type { ImportEdge } from '../core/importGraph.js';
import { resolveInspectTarget } from './resolveInspect.js';

export const PAGE_FILE_HIGHLIGHT_CLASS = 'colocation-page-file-highlight';

const HIGHLIGHT_CLASSES = [
  PAGE_FILE_HIGHLIGHT_CLASS,
  'outline',
  'outline-2',
  '-outline-offset-2',
  'outline-sky-400',
  'shadow-[0_0_0_3px_rgba(56,189,248,0.35)]',
] as const;

function isDevToolsElement(element: HTMLElement): boolean {
  return Boolean(element.closest('[data-colocation-devtools]'));
}

/** Outermost DOM nodes whose inspect target resolves to `file`. */
export function findPageElementsForFile(
  file: string,
  rows: AuditRow[],
  routeRoot: string | undefined,
  edges: ImportEdge[],
): HTMLElement[] {
  const matches: HTMLElement[] = [];
  const seen = new WeakSet<HTMLElement>();

  for (const element of document.body.querySelectorAll('*')) {
    if (!(element instanceof HTMLElement)) continue;
    if (isDevToolsElement(element)) continue;
    if (!getElementFiberUpward(element)) continue;
    if (seen.has(element)) continue;

    const target = resolveInspectTarget(element, rows, routeRoot, edges);
    if (target.file !== file) continue;

    matches.push(element);
    seen.add(element);
  }

  return keepOutermostMatches(matches);
}

function keepOutermostMatches(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter(
    (element) => !elements.some((other) => other !== element && other.contains(element)),
  );
}

export function applyPageFileHighlights(elements: HTMLElement[]): HTMLElement[] {
  for (const element of elements) {
    element.classList.add(...HIGHLIGHT_CLASSES);
  }
  return elements;
}

export function clearPageFileHighlights(elements: HTMLElement[]): void {
  for (const element of elements) {
    element.classList.remove(...HIGHLIGHT_CLASSES);
  }
}

export function revealPageFileOnScreen(
  file: string,
  rows: AuditRow[],
  routeRoot: string | undefined,
  edges: ImportEdge[],
): { elements: HTMLElement[]; scrolled: boolean } {
  const elements = findPageElementsForFile(file, rows, routeRoot, edges);
  applyPageFileHighlights(elements);

  if (elements.length > 0) {
    elements[0]!.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return { elements, scrolled: true };
  }

  return { elements, scrolled: false };
}

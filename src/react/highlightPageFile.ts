import {
  getElementFiberUpward,
  isReactSymbolFiber,
} from 'react-dev-inspector/es/Inspector/utils/fiber';

import type { AuditRow } from '../core/classify.js';
import type { ImportEdge } from '../core/importGraph.js';
import { buildImportIndex } from '../core/importGraph.js';
import { auditFileForFiber, resolveNearestAuditFile, type FiberLike } from './resolveInspect';
export const PAGE_FILE_HIGHLIGHT_CLASS = 'colocation-page-file-highlight';

export type PageMountRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const FOCUS_HIGHLIGHT_CLASSES = [
  PAGE_FILE_HIGHLIGHT_CLASS,
  'outline',
  'outline-2',
  '-outline-offset-2',
  'outline-sky-400',
  'shadow-[0_0_0_3px_rgba(56,189,248,0.35)]',
] as const;

const mountCache = new Map<string, HTMLElement[]>();
const cachedViaEntryShell = new Map<string, boolean>();

export function clearPageFileMountCache(): void {
  mountCache.clear();
  cachedViaEntryShell.clear();
}

function cacheKey(file: string, entryFile?: string): string {
  return entryFile ? `${file}|${entryFile}` : file;
}

function isDevToolsElement(element: HTMLElement): boolean {
  return Boolean(element.closest('[data-route-lens]'));
}

function addOutermostMatch(matches: HTMLElement[], element: HTMLElement): void {
  for (let i = matches.length - 1; i >= 0; i--) {
    if (element.contains(matches[i]!)) {
      matches.splice(i, 1);
    }
  }
  if (matches.some((match) => match.contains(element))) return;
  matches.push(element);
}

function findDomHostInFiber(fiber: FiberLike): HTMLElement | null {
  const queue: FiberLike[] = [fiber];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.stateNode instanceof HTMLElement && !isDevToolsElement(current.stateNode)) {
      return current.stateNode;
    }
    let child = current.child;
    while (child) {
      queue.push(child);
      child = child.sibling;
    }
  }
  return null;
}

function walkFibers(
  fiber: FiberLike | undefined,
  parentFile: string | null,
  rows: AuditRow[],
  importsOf: Map<string, Set<string>>,
  onRow: (fiber: FiberLike, row: AuditRow) => void,
): void {
  let current: FiberLike | undefined = fiber;
  while (current) {
    if (!isReactSymbolFiber(current as Parameters<typeof isReactSymbolFiber>[0])) {
      const row = auditFileForFiber(current, rows, importsOf, parentFile);
      const childParent = row?.file ?? parentFile;
      if (row) onRow(current, row);
      if (current.child) {
        walkFibers(current.child, childParent, rows, importsOf, onRow);
      }
    } else if (current.child) {
      walkFibers(current.child, parentFile, rows, importsOf, onRow);
    }
    current = current.sibling;
  }
}

function reactRootFiber(): FiberLike | undefined {
  const rootHost =
    document.getElementById('__next') ??
    document.body.firstElementChild ??
    document.body;
  if (!(rootHost instanceof HTMLElement)) return undefined;
  return getElementFiberUpward(rootHost) as FiberLike | undefined;
}

function entryShellFromIndex(
  entryFile: string,
  byFile: Map<string, HTMLElement[]>,
  importsOf: Map<string, Set<string>>,
): HTMLElement[] {
  const merged: HTMLElement[] = [];
  for (const child of importsOf.get(entryFile) ?? []) {
    if (!child.endsWith('.tsx')) continue;
    for (const element of byFile.get(child) ?? []) {
      addOutermostMatch(merged, element);
    }
  }
  return merged;
}

/** One fiber-tree pass — fills mount cache for every audit file on the page. */
export function warmPageFileMountCache(
  rows: AuditRow[],
  edges: ImportEdge[],
  entryFile?: string,
): void {
  clearPageFileMountCache();
  if (rows.length === 0) return;

  const rootFiber = reactRootFiber();
  if (!rootFiber) return;

  const { importsOf } = buildImportIndex(edges);
  const byFile = new Map<string, HTMLElement[]>();

  walkFibers(rootFiber, null, rows, importsOf, (fiber, row) => {
    const host = findDomHostInFiber(fiber);
    if (!host) return;
    let list = byFile.get(row.file);
    if (!list) {
      list = [];
      byFile.set(row.file, list);
    }
    addOutermostMatch(list, host);
  });

  for (const row of rows) {
    const key = cacheKey(row.file, entryFile);
    const elements = byFile.get(row.file) ?? [];
    mountCache.set(key, elements);
    cachedViaEntryShell.set(key, false);
  }

  if (entryFile) {
    const entryKey = cacheKey(entryFile, entryFile);
    if ((mountCache.get(entryKey)?.length ?? 0) === 0) {
      const shell = entryShellFromIndex(entryFile, byFile, importsOf);
      mountCache.set(entryKey, shell);
      cachedViaEntryShell.set(entryKey, shell.length > 0);
    }
  }
}

function findMountElementsViaFiberWalk(
  file: string,
  rows: AuditRow[],
  edges: ImportEdge[],
): HTMLElement[] {
  const rootFiber = reactRootFiber();
  if (!rootFiber) return [];

  const { importsOf } = buildImportIndex(edges);
  const matches: HTMLElement[] = [];

  walkFibers(rootFiber, null, rows, importsOf, (fiber, row) => {
    if (row.file !== file) return;
    const host = findDomHostInFiber(fiber);
    if (host) addOutermostMatch(matches, host);
  });

  return matches;
}

function findMountElementsViaDomScan(
  file: string,
  rows: AuditRow[],
  edges: ImportEdge[],
): HTMLElement[] {
  const matches: HTMLElement[] = [];

  for (const element of document.body.querySelectorAll('*')) {
    if (!(element instanceof HTMLElement)) continue;
    if (isDevToolsElement(element)) continue;
    if (!getElementFiberUpward(element)) continue;
    if (resolveNearestAuditFile(element, rows, edges)?.file !== file) continue;
    addOutermostMatch(matches, element);
  }

  return matches;
}

export function findPageElementsForFile(
  file: string,
  rows: AuditRow[],
  _routeRoot: string | undefined,
  edges: ImportEdge[],
): HTMLElement[] {
  const fromFibers = findMountElementsViaFiberWalk(file, rows, edges);
  if (fromFibers.length > 0) return fromFibers;
  return findMountElementsViaDomScan(file, rows, edges);
}

function findEntryShellElements(
  entryFile: string,
  rows: AuditRow[],
  routeRoot: string | undefined,
  edges: ImportEdge[],
): HTMLElement[] {
  const { importsOf } = buildImportIndex(edges);
  const childFiles = [...(importsOf.get(entryFile) ?? [])].filter((child) =>
    child.endsWith('.tsx'),
  );

  const merged: HTMLElement[] = [];
  for (const childFile of childFiles) {
    for (const element of findPageElementsForFile(childFile, rows, routeRoot, edges)) {
      addOutermostMatch(merged, element);
    }
  }

  return merged;
}

function applyHighlightClasses(elements: HTMLElement[], classes: readonly string[]): void {
  for (const element of elements) {
    element.classList.add(...classes);
  }
}

function clearHighlightClasses(elements: HTMLElement[], classes: readonly string[]): void {
  for (const element of elements) {
    element.classList.remove(...classes);
  }
}

export function applyPageFileHighlights(elements: HTMLElement[]): HTMLElement[] {
  applyHighlightClasses(elements, FOCUS_HIGHLIGHT_CLASSES);
  return elements;
}

export function clearPageFileHighlights(elements: HTMLElement[]): void {
  clearHighlightClasses(elements, FOCUS_HIGHLIGHT_CLASSES);
}

export function getCachedMountElements(file: string, entryFile?: string): HTMLElement[] {
  return mountCache.get(cacheKey(file, entryFile)) ?? [];
}

export function isFileMountedOnPage(file: string, entryFile?: string): boolean {
  return getCachedMountElements(file, entryFile).length > 0;
}

export function mountedAuditFiles(entryFile?: string): Set<string> {
  const mounted = new Set<string>();
  for (const [key, elements] of mountCache.entries()) {
    if (elements.length === 0) continue;
    const file = key.includes('|') ? key.split('|')[0]! : key;
    mounted.add(file);
  }
  void entryFile;
  return mounted;
}

export function mountRectsForFile(file: string, entryFile?: string): PageMountRect[] {
  return getCachedMountElements(file, entryFile).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  });
}

export function resolvePageFileElements(
  file: string,
  rows: AuditRow[],
  routeRoot: string | undefined,
  edges: ImportEdge[],
  entryFile?: string,
): { elements: HTMLElement[]; viaEntryShell: boolean } {
  const key = cacheKey(file, entryFile);
  const cached = mountCache.get(key);
  if (cached) {
    return { elements: cached, viaEntryShell: cachedViaEntryShell.get(key) ?? false };
  }

  let viaEntryShell = false;
  let elements = findPageElementsForFile(file, rows, routeRoot, edges);

  if (elements.length === 0 && entryFile && file === entryFile) {
    elements = findEntryShellElements(entryFile, rows, routeRoot, edges);
    viaEntryShell = elements.length > 0;
  }

  mountCache.set(key, elements);
  cachedViaEntryShell.set(key, viaEntryShell);
  return { elements, viaEntryShell };
}

export type RevealPageFileResult = {
  elements: HTMLElement[];
  scrolled: boolean;
  viaEntryShell: boolean;
};

export function revealPageFileOnScreen(
  file: string,
  rows: AuditRow[],
  routeRoot: string | undefined,
  edges: ImportEdge[],
  entryFile?: string,
): RevealPageFileResult {
  const { elements, viaEntryShell } = resolvePageFileElements(
    file,
    rows,
    routeRoot,
    edges,
    entryFile,
  );

  applyPageFileHighlights(elements);

  if (elements.length > 0) {
    elements[0]!.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    return { elements, scrolled: true, viaEntryShell };
  }

  return { elements, scrolled: false, viaEntryShell };
}

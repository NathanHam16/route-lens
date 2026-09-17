import {
  getElementFiberUpward,
  getFiberName,
  isReactSymbolFiber,
} from 'react-dev-inspector/es/Inspector/utils/fiber';
import {
  getCodeInfoFromFiber,
  getElementCodeInfo,
  getElementInspect,
  getReferenceFiber,
} from 'react-dev-inspector/es/Inspector/utils/inspect';

import type { AuditBucket, AuditRow } from '../core/classify.js';
import { classify } from '../core/classify.js';
import { buildImportIndex, disambiguateComponentRow, type ImportEdge } from '../core/importGraph.js';

export type FiberLike = {
  return?: FiberLike;
  child?: FiberLike;
  sibling?: FiberLike;
  stateNode?: unknown;
};

const SKIP_FIBER_NAMES = new Set([
  'Fragment',
  'StrictMode',
  'Profiler',
  'Suspense',
  'Activity',
]);

/** Normalize dev-server paths to src-relative audit paths (`app/...`). */
export function normalizeAuditPath(rawPath: string | undefined): string | null {
  if (!rawPath) return null;
  const normalized = rawPath.replace(/\\/g, '/');

  const srcIdx = normalized.indexOf('/src/');
  if (srcIdx !== -1) {
    return normalized.slice(srcIdx + '/src/'.length);
  }

  if (normalized.startsWith('src/')) {
    return normalized.slice('src/'.length);
  }

  if (
    normalized.startsWith('app/') ||
    normalized.startsWith('components/') ||
    normalized.startsWith('lib/')
  ) {
    return normalized;
  }

  const frontendSrc = '/frontend/src/';
  const feIdx = normalized.indexOf(frontendSrc);
  if (feIdx !== -1) {
    return normalized.slice(feIdx + frontendSrc.length);
  }

  return null;
}

export function findAuditRowByPath(pathFile: string, rows: AuditRow[]): AuditRow | undefined {
  const exact = rows.find((row) => row.file === pathFile);
  if (exact) return exact;

  // Dev paths occasionally omit or duplicate the src/ prefix.
  return rows.find(
    (row) =>
      pathFile.endsWith(`/${row.file}`) ||
      row.file.endsWith(`/${pathFile}`) ||
      pathFile.endsWith(row.file) ||
      row.file.endsWith(pathFile),
  );
}

function fiberChainFromElement(element: HTMLElement): FiberLike[] {
  const base = getElementFiberUpward(element) as FiberLike | undefined;
  const start = (getReferenceFiber(base as Parameters<typeof getReferenceFiber>[0]) ??
    base) as FiberLike | undefined;
  if (!start) return [];

  const chain: FiberLike[] = [];
  let fiber: FiberLike | undefined = start;
  while (fiber) {
    chain.push(fiber);
    fiber = fiber.return;
  }
  return chain;
}

function rowFromFiberPath(fiber: FiberLike, rows: AuditRow[]): AuditRow | null {
  const codeInfo = getCodeInfoFromFiber(fiber as Parameters<typeof getCodeInfoFromFiber>[0]);
  const pathFile = normalizeAuditPath(codeInfo?.relativePath ?? codeInfo?.absolutePath);
  if (!pathFile) return null;
  return findAuditRowByPath(pathFile, rows) ?? null;
}

function rowFromFiberName(
  fiber: FiberLike,
  rows: AuditRow[],
  importsOf: Map<string, Set<string>>,
  parentFile: string | null,
): AuditRow | null {
  const name = getFiberName(fiber as Parameters<typeof getFiberName>[0]);
  if (!name || SKIP_FIBER_NAMES.has(name)) return null;
  return disambiguateComponentRow(name, rows, parentFile, importsOf);
}

function parentFileFromChainIndex(
  chain: FiberLike[],
  fromIndex: number,
  rows: AuditRow[],
  importsOf: Map<string, Set<string>>,
): string | null {
  for (let j = fromIndex + 1; j < chain.length; j++) {
    const parentRow =
      rowFromFiberPath(chain[j]!, rows) ??
      rowFromFiberName(chain[j]!, rows, importsOf, null);
    if (parentRow) return parentRow.file;
  }
  return null;
}

/**
 * Walk the React fiber chain and return the nearest component file on this page's audit graph.
 * Used when the hover target is a native node, design-system primitive, or anonymous wrapper.
 */
export function resolveNearestAuditFile(
  element: HTMLElement,
  rows: AuditRow[],
  edges: ImportEdge[],
): AuditRow | null {
  if (rows.length === 0) return null;

  const chain = fiberChainFromElement(element);
  if (chain.length === 0) return null;

  const { importsOf } = buildImportIndex(edges);

  for (const fiber of chain) {
    if (isReactSymbolFiber(fiber as Parameters<typeof isReactSymbolFiber>[0])) continue;
    const row = rowFromFiberPath(fiber, rows);
    if (row) return row;
  }

  for (let i = 0; i < chain.length; i++) {
    const fiber = chain[i]!;
    if (isReactSymbolFiber(fiber as Parameters<typeof isReactSymbolFiber>[0])) continue;

    const parentFile = parentFileFromChainIndex(chain, i, rows, importsOf);
    const row = rowFromFiberName(fiber, rows, importsOf, parentFile);
    if (row) return row;
  }

  return null;
}

export type InspectTarget = {
  file: string | null;
  lineNumber?: number;
  componentName?: string;
  bucket: AuditBucket | null;
  source: 'path' | 'name' | 'nearest' | 'none';
};

/** Map a fiber to an audit row using source path or component name. */
export function auditFileForFiber(
  fiber: FiberLike,
  rows: AuditRow[],
  importsOf: Map<string, Set<string>>,
  parentFile: string | null,
): AuditRow | null {
  if (isReactSymbolFiber(fiber as Parameters<typeof isReactSymbolFiber>[0])) return null;
  const pathRow = rowFromFiberPath(fiber, rows);
  if (pathRow) return pathRow;
  return rowFromFiberName(fiber, rows, importsOf, parentFile);
}

/** True when any fiber on this DOM node’s React chain maps to `file`. */
export function fileAppearsInElementChain(
  element: HTMLElement,
  file: string,
  rows: AuditRow[],
  edges: ImportEdge[],
): boolean {
  const chain = fiberChainFromElement(element);
  if (chain.length === 0) return false;

  const { importsOf } = buildImportIndex(edges);

  for (let i = 0; i < chain.length; i++) {
    const fiber = chain[i]!;
    if (isReactSymbolFiber(fiber as Parameters<typeof isReactSymbolFiber>[0])) continue;

    const pathRow = rowFromFiberPath(fiber, rows);
    if (pathRow?.file === file) return true;

    const name = getFiberName(fiber as Parameters<typeof getFiberName>[0]);
    if (!name || SKIP_FIBER_NAMES.has(name)) continue;

    const parentFile = parentFileFromChainIndex(chain, i, rows, importsOf);
    const row = disambiguateComponentRow(name, rows, parentFile, importsOf);
    if (row?.file === file) return true;
  }

  return false;
}

export function resolveInspectTarget(
  element: HTMLElement,
  rows: AuditRow[],
  routeRoot: string | undefined,
  edges: ImportEdge[],
): InspectTarget {
  const codeInfo = getElementCodeInfo(element);
  const pathFile = normalizeAuditPath(codeInfo?.relativePath ?? codeInfo?.absolutePath);
  const lineNumber = codeInfo?.lineNumber ? Number.parseInt(codeInfo.lineNumber, 10) : undefined;

  if (pathFile) {
    const match = findAuditRowByPath(pathFile, rows);
    if (match) {
      return {
        file: match.file,
        lineNumber: Number.isFinite(lineNumber) ? lineNumber : undefined,
        componentName: match.component,
        bucket: match.bucket,
        source: 'path',
      };
    }
  }

  const inspect = getElementInspect(element);
  const componentName = inspect.name;

  if (componentName && !SKIP_FIBER_NAMES.has(componentName)) {
    const { importsOf } = buildImportIndex(edges);
    const chain = fiberChainFromElement(element);
    const fiberIndex = chain.findIndex(
      (fiber) =>
        getFiberName(fiber as Parameters<typeof getFiberName>[0]) === componentName,
    );
    const parentFile =
      fiberIndex >= 0
        ? parentFileFromChainIndex(chain, fiberIndex, rows, importsOf)
        : parentFileFromChainIndex(chain, 0, rows, importsOf);

    const row = disambiguateComponentRow(componentName, rows, parentFile, importsOf);
    if (row) {
      return {
        file: row.file,
        lineNumber: Number.isFinite(lineNumber) ? lineNumber : undefined,
        componentName: row.component,
        bucket: row.bucket,
        source: 'name',
      };
    }
  }

  const nearest = resolveNearestAuditFile(element, rows, edges);
  if (nearest) {
    return {
      file: nearest.file,
      componentName: nearest.component,
      bucket: nearest.bucket,
      source: 'nearest',
    };
  }

  return {
    file: null,
    componentName: componentName ?? undefined,
    bucket: pathFile && routeRoot ? classify(pathFile, routeRoot) : null,
    source: 'none',
  };
}

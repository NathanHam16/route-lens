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
import {
  buildImportIndex,
  disambiguateComponentRow,
  focusImportScope,
  type ImportEdge,
} from '../core/importGraph.js';

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

export type ResolveInspectOptions = {
  /** When set, prefer this file or its downstream imports over deeper leaf components. */
  focusFile?: string;
  /** When focused: include the full transitive import closure (default: direct imports only). */
  focusTransitive?: boolean;
  /** Files with a live DOM mount on the page — used to break name ties. */
  mountedFiles?: Set<string>;
};

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
  mountedFiles?: Set<string>,
): AuditRow | null {
  const name = getFiberName(fiber as Parameters<typeof getFiberName>[0]);
  if (!name || SKIP_FIBER_NAMES.has(name)) return null;
  return disambiguateComponentRow(name, rows, parentFile, importsOf, mountedFiles);
}

function parentFileFromChainIndex(
  chain: FiberLike[],
  fromIndex: number,
  rows: AuditRow[],
  importsOf: Map<string, Set<string>>,
  mountedFiles?: Set<string>,
): string | null {
  for (let j = fromIndex + 1; j < chain.length; j++) {
    const parentRow =
      rowFromFiberPath(chain[j]!, rows) ??
      rowFromFiberName(chain[j]!, rows, importsOf, null, mountedFiles);
    if (parentRow) return parentRow.file;
  }
  return null;
}

/** Innermost → outermost audit rows on the React fiber chain for this DOM node. */
export function auditRowsFromFiberChain(
  element: HTMLElement,
  rows: AuditRow[],
  edges: ImportEdge[],
  options?: ResolveInspectOptions,
): AuditRow[] {
  const chain = fiberChainFromElement(element);
  if (chain.length === 0) return [];

  const { importsOf } = buildImportIndex(edges);
  const seen = new Set<string>();
  const chainRows: AuditRow[] = [];

  for (let i = 0; i < chain.length; i++) {
    const fiber = chain[i]!;
    if (isReactSymbolFiber(fiber as Parameters<typeof isReactSymbolFiber>[0])) continue;

    const parentFile = parentFileFromChainIndex(chain, i, rows, importsOf, options?.mountedFiles);
    const row =
      rowFromFiberPath(fiber, rows) ??
      rowFromFiberName(fiber, rows, importsOf, parentFile, options?.mountedFiles);
    if (row && !seen.has(row.file)) {
      seen.add(row.file);
      chainRows.push(row);
    }
  }

  return chainRows;
}

/** True when `file` is the focus root or a static import descendant of it. */
export function isInFocusSubtree(
  file: string,
  focusFile: string | undefined,
  importsOf: Map<string, Set<string>>,
  focusTransitive = false,
): boolean {
  if (!focusFile) return true;
  if (file === focusFile) return true;
  return focusImportScope(focusFile, importsOf, focusTransitive).has(file);
}

/** Pick the audit row that best matches user intent for inspect / click-to-focus. */
export function pickInspectRow(
  chainRows: AuditRow[],
  importsOf: Map<string, Set<string>>,
  options?: ResolveInspectOptions,
): AuditRow | null {
  if (chainRows.length === 0) return null;

  const focusFile = options?.focusFile;
  if (focusFile) {
    const exact = chainRows.find((row) => row.file === focusFile);
    if (exact) return exact;

    const scope = focusImportScope(focusFile, importsOf, options?.focusTransitive ?? false);
    for (let i = chainRows.length - 1; i >= 0; i--) {
      const row = chainRows[i]!;
      if (scope.has(row.file)) return row;
    }

    // Focus is on — do not fall back to unrelated page components (e.g. sidebar rubric).
    return null;
  }

  const tsxRows = chainRows.filter((row) => row.file.endsWith('.tsx'));
  if (tsxRows.length > 0) return tsxRows[0]!;

  return chainRows[0]!;
}

/**
 * Walk the React fiber chain and return the nearest component file on this page's audit graph.
 * Used when the hover target is a native node, design-system primitive, or anonymous wrapper.
 */
export function resolveNearestAuditFile(
  element: HTMLElement,
  rows: AuditRow[],
  edges: ImportEdge[],
  options?: ResolveInspectOptions,
): AuditRow | null {
  const { importsOf } = buildImportIndex(edges);
  const chainRows = auditRowsFromFiberChain(element, rows, edges, options);
  return pickInspectRow(chainRows, importsOf, options);
}

export type InspectTarget = {
  file: string | null;
  lineNumber?: number;
  componentName?: string;
  bucket: AuditBucket | null;
  source: 'path' | 'name' | 'nearest' | 'chain' | 'none';
};

/** Map a fiber to an audit row using source path or component name. */
export function auditFileForFiber(
  fiber: FiberLike,
  rows: AuditRow[],
  importsOf: Map<string, Set<string>>,
  parentFile: string | null,
  mountedFiles?: Set<string>,
): AuditRow | null {
  if (isReactSymbolFiber(fiber as Parameters<typeof isReactSymbolFiber>[0])) return null;
  const pathRow = rowFromFiberPath(fiber, rows);
  if (pathRow) return pathRow;
  return rowFromFiberName(fiber, rows, importsOf, parentFile, mountedFiles);
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
  options?: ResolveInspectOptions,
): InspectTarget {
  const codeInfo = getElementCodeInfo(element);
  const lineNumber = codeInfo?.lineNumber ? Number.parseInt(codeInfo.lineNumber, 10) : undefined;
  const { importsOf } = buildImportIndex(edges);

  const chainRows = auditRowsFromFiberChain(element, rows, edges, options);
  const picked = pickInspectRow(chainRows, importsOf, options);
  if (picked) {
    return {
      file: picked.file,
      lineNumber: Number.isFinite(lineNumber) ? lineNumber : undefined,
      componentName: picked.component,
      bucket: picked.bucket,
      source: 'chain',
    };
  }

  if (options?.focusFile) {
    return {
      file: null,
      componentName: 'outside focus',
      bucket: null,
      source: 'none',
    };
  }

  const inspect = getElementInspect(element);
  const componentName = inspect.name;

  if (componentName && !SKIP_FIBER_NAMES.has(componentName)) {
    const chain = fiberChainFromElement(element);
    const fiberIndex = chain.findIndex(
      (fiber) =>
        getFiberName(fiber as Parameters<typeof getFiberName>[0]) === componentName,
    );
    const parentFile =
      fiberIndex >= 0
        ? parentFileFromChainIndex(chain, fiberIndex, rows, importsOf, options?.mountedFiles)
        : parentFileFromChainIndex(chain, 0, rows, importsOf, options?.mountedFiles);

    const row = disambiguateComponentRow(
      componentName,
      rows,
      parentFile,
      importsOf,
      options?.mountedFiles,
    );
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

  const pathFile = normalizeAuditPath(codeInfo?.relativePath ?? codeInfo?.absolutePath);
  const nearest = resolveNearestAuditFile(element, rows, edges, options);
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

import type { AuditRow } from './classify.js';
import { rowsForComponentName } from './auditSymbols.js';

export type ImportEdge = { from: string; to: string };

export function buildImportIndex(edges: ImportEdge[]): {
  importsOf: Map<string, Set<string>>;
  importedBy: Map<string, Set<string>>;
} {
  const importsOf = new Map<string, Set<string>>();
  const importedBy = new Map<string, Set<string>>();

  for (const { from, to } of edges) {
    if (!importsOf.has(from)) importsOf.set(from, new Set());
    importsOf.get(from)!.add(to);
    if (!importedBy.has(to)) importedBy.set(to, new Set());
    importedBy.get(to)!.add(from);
  }

  return { importsOf, importedBy };
}

export function fileBasename(file: string): string {
  return file.split('/').pop() ?? file;
}

/** Direct importers of `file`, sorted by path. */
export function importersOf(file: string, importedBy: Map<string, Set<string>>): string[] {
  return [...(importedBy.get(file) ?? [])].sort((a, b) => a.localeCompare(b));
}

/** Direct imports from `file`, sorted by path. */
export function directImportsOf(file: string, importsOf: Map<string, Set<string>>): string[] {
  return [...(importsOf.get(file) ?? [])].sort((a, b) => a.localeCompare(b));
}

/** Prefer `.tsx` children; fall back to all direct imports when none. */
export function componentImportsOf(file: string, importsOf: Map<string, Set<string>>): string[] {
  const all = directImportsOf(file, importsOf);
  const tsx = all.filter((path) => path.endsWith('.tsx'));
  return tsx.length > 0 ? tsx : all;
}

/** Direct parent components in the import graph (↑ navigation). */
export function graphParents(file: string, importedBy: Map<string, Set<string>>): string[] {
  const all = importersOf(file, importedBy);
  const tsx = all.filter((path) => path.endsWith('.tsx'));
  return tsx.length > 0 ? tsx : all;
}

/** Direct child components in the import graph (↓ navigation). */
export function graphChildren(file: string, importsOf: Map<string, Set<string>>): string[] {
  return componentImportsOf(file, importsOf);
}

export type GraphStep = {
  file: string | null;
  /** 1-based index in the neighbor list. */
  index: number;
  total: number;
};

/** Pick neighbor at `step` (0-based, wraps). */
export function pickGraphNeighbor(list: string[], step: number): GraphStep {
  if (list.length === 0) return { file: null, index: 0, total: 0 };
  const normalized = ((step % list.length) + list.length) % list.length;
  return { file: list[normalized]!, index: normalized + 1, total: list.length };
}

function formatBasenameList(files: string[], max: number): string {
  const names = files.map(fileBasename);
  if (names.length === 0) return 'none';
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} +${names.length - max} more`;
}

/** One-line hover label: `Viewer.tsx, Sidebar.tsx` or `page entry`. */
export function formatImporterSummary(
  file: string,
  importers: string[],
  entryFile?: string,
  max = 3,
): string {
  if (importers.length === 0) {
    return entryFile && file === entryFile ? 'page entry' : 'no importers in graph';
  }
  return formatBasenameList(importers, max);
}

/** One-line label for direct child imports. */
export function formatChildImportSummary(imports: string[], max = 3): string {
  if (imports.length === 0) return 'none';
  return formatBasenameList(imports, max);
}

/** Files reachable by following imports downstream from `root`. */
export function importSubtree(root: string, importsOf: Map<string, Set<string>>): Set<string> {
  const result = new Set<string>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const child of importsOf.get(current) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }

  return result;
}

function bucketRank(bucket: AuditRow['bucket']): number {
  switch (bucket) {
    case 'cross-route':
      return 5;
    case 'shared-feature':
      return 4;
    case 'other':
      return 3;
    case 'colocated':
      return 2;
    case 'product':
      return 1;
    default:
      return 0;
  }
}

/** Pick one audit row when several share the same component name. */
export function disambiguateComponentRow(
  componentName: string,
  rows: AuditRow[],
  parentFile: string | null,
  importsOf: Map<string, Set<string>>,
  mountedFiles?: Set<string>,
): AuditRow | null {
  let matches = rowsForComponentName(componentName, rows);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;

  if (parentFile) {
    const parentImports = importsOf.get(parentFile);
    if (parentImports) {
      const imported = matches.filter((row) => parentImports.has(row.file));
      if (imported.length === 1) return imported[0]!;
      if (imported.length > 1) matches = imported;
    }
  }

  if (mountedFiles && mountedFiles.size > 0) {
    const mounted = matches.filter((row) => mountedFiles.has(row.file));
    if (mounted.length === 1) return mounted[0]!;
    if (mounted.length > 1) matches = mounted;
  }

  return [...matches].sort((a, b) => bucketRank(b.bucket) - bucketRank(a.bucket))[0]!;
}

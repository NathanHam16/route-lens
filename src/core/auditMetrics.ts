import type { AuditBucket, AuditRow } from './classify.js';
import type { ImportEdge } from './importGraph.js';
import { buildImportIndex, componentImportsOf, importersOf } from './importGraph.js';

const SMELL_BUCKETS: AuditBucket[] = ['cross-route', 'shared-feature', 'other'];

const BUCKET_SORT_RANK: Record<AuditBucket, number> = {
  'cross-route': 0,
  'shared-feature': 1,
  other: 2,
  colocated: 3,
  product: 4,
  shared: 5,
  logic: 6,
};

export function isSmellBucket(bucket: AuditBucket): boolean {
  return SMELL_BUCKETS.includes(bucket);
}

/** BFS hop count from page entry along import edges. */
export function buildGraphDepthIndex(
  entryFile: string | undefined,
  edges: ImportEdge[],
): Map<string, number> {
  const depths = new Map<string, number>();
  if (!entryFile) return depths;

  const { importsOf } = buildImportIndex(edges);
  depths.set(entryFile, 0);
  const queue = [entryFile];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const depth = depths.get(current) ?? 0;
    for (const child of importsOf.get(current) ?? []) {
      if (depths.has(child)) continue;
      depths.set(child, depth + 1);
      queue.push(child);
    }
  }

  return depths;
}

export function sortRowsForDisplay(
  rows: AuditRow[],
  edges: ImportEdge[],
  options: { sortSmellsFirst: boolean },
): AuditRow[] {
  if (!options.sortSmellsFirst) {
    return [...rows].sort((a, b) => a.file.localeCompare(b.file));
  }

  const { importedBy } = buildImportIndex(edges);

  return [...rows].sort((a, b) => {
    const rankA = BUCKET_SORT_RANK[a.bucket];
    const rankB = BUCKET_SORT_RANK[b.bucket];
    if (rankA !== rankB) return rankA - rankB;
    const fanInDiff =
      importersOf(b.file, importedBy).length - importersOf(a.file, importedBy).length;
    if (fanInDiff !== 0) return fanInDiff;
    return a.file.localeCompare(b.file);
  });
}

export function filterRowsForSettings(
  rows: AuditRow[],
  options: { hideShared: boolean; smellsOnly: boolean },
): AuditRow[] {
  return rows.filter((row) => {
    if (options.smellsOnly && !isSmellBucket(row.bucket)) return false;
    if (options.hideShared && row.bucket === 'shared') return false;
    if (options.hideShared && row.bucket === 'logic') return false;
    return true;
  });
}

export function importCountsForRow(
  file: string,
  importedBy: Map<string, Set<string>>,
  importsOf: Map<string, Set<string>>,
): { importers: number; imports: number } {
  return {
    importers: importersOf(file, importedBy).length,
    imports: componentImportsOf(file, importsOf).length,
  };
}

import fs from 'node:fs';
import path from 'node:path';

import { createClassifier, routeRootFromEntry, type AuditRow } from './classify.js';
import { resolveConfig, type ColocationConfig } from './config.js';
import type { ImportEdge } from './importGraph.js';
import { extractSymbols } from './auditSymbols.js';

const IMPORT_RE = /from\s+["'](@\/[^"']+|\.\.?\/[^"']+)["']/g;
const RESOLVE_EXTS = ['', '.tsx', '.ts', '/index.tsx', '/index.ts'];

export type PageAuditResult = {
  entry: string;
  routeRoot: string;
  totalFiles: number;
  tsxComponents: number;
  counts: Record<string, number>;
  suspects: AuditRow[];
  edges: ImportEdge[];
  all: AuditRow[];
};

function assertUnderAppRoot(appRoot: string, absPath: string): string {
  const normalizedRoot = path.resolve(appRoot);
  const normalized = path.resolve(absPath);
  const rootWithSep = normalizedRoot.endsWith(path.sep)
    ? normalizedRoot
    : `${normalizedRoot}${path.sep}`;
  if (normalized !== normalizedRoot && !normalized.startsWith(rootWithSep)) {
    throw new Error('Entry must stay under src/app');
  }
  return normalized;
}

function resolveEntry(config: ReturnType<typeof resolveConfig>, entryArg: string): string {
  const { srcAbs } = config;
  const appRoot = path.join(srcAbs, 'app');

  if (entryArg.includes('..')) {
    throw new Error('Invalid entry');
  }

  if (entryArg.endsWith('.tsx') || entryArg.endsWith('.ts')) {
    if (!entryArg.endsWith('page.tsx')) {
      throw new Error('Entry must be an app/page.tsx file');
    }
    const abs = path.isAbsolute(entryArg)
      ? path.resolve(entryArg)
      : path.resolve(srcAbs, entryArg.replace(/^src\//, ''));
    if (!fs.existsSync(abs)) {
      throw new Error('Page entry not found');
    }
    return assertUnderAppRoot(appRoot, abs);
  }

  if (path.isAbsolute(entryArg)) {
    throw new Error('Invalid route');
  }

  const route = entryArg.replace(/^\/+|\/+$/g, '');
  const candidate = path.join(appRoot, route, 'page.tsx');
  if (!fs.existsSync(candidate)) {
    throw new Error('Page entry not found');
  }
  return assertUnderAppRoot(appRoot, candidate);
}

function relSrc(config: ReturnType<typeof resolveConfig>, abs: string): string {
  return path.relative(config.srcAbs, abs).replaceAll('\\', '/');
}

function resolveImport(
  config: ReturnType<typeof resolveConfig>,
  fromFile: string,
  spec: string,
): string | null {
  let base: string;
  if (spec.startsWith(config.alias)) {
    base = path.join(config.srcAbs, spec.slice(config.alias.length));
  } else {
    base = path.resolve(path.dirname(fromFile), spec);
  }
  for (const ext of RESOLVE_EXTS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && /\.(tsx|ts)$/.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

function walkImports(
  config: ReturnType<typeof resolveConfig>,
  entryAbs: string,
  seen = new Set<string>(),
  edges: ImportEdge[] = [],
): { seen: Set<string>; edges: ImportEdge[] } {
  if (seen.has(entryAbs)) return { seen, edges };
  seen.add(entryAbs);
  const text = fs.readFileSync(entryAbs, 'utf8');
  for (const match of text.matchAll(IMPORT_RE)) {
    const spec = match[1];
    if (!spec) continue;
    const resolved = resolveImport(config, entryAbs, spec);
    if (resolved) {
      edges.push({ from: relSrc(config, entryAbs), to: relSrc(config, resolved) });
      if (!seen.has(resolved)) walkImports(config, resolved, seen, edges);
    }
  }
  return { seen, edges };
}

export function auditPage(entryArg: string, userConfig: ColocationConfig = {}): PageAuditResult {
  const config = resolveConfig(userConfig);
  const { classify, smellNote } = createClassifier(config);
  const entryAbs = resolveEntry(config, entryArg);
  const routeRoot = routeRootFromEntry(relSrc(config, entryAbs));
  const { seen, edges } = walkImports(config, entryAbs);
  const files = [...seen].map((abs) => relSrc(config, abs)).sort();

  const rows: AuditRow[] = files.map((rel) => {
    const bucket = classify(rel, routeRoot);
    const abs = path.join(config.srcAbs, rel);
    const text = fs.readFileSync(abs, 'utf8');
    return {
      file: rel,
      component: path.basename(rel, '.tsx'),
      symbols: rel.endsWith('.tsx') ? extractSymbols(abs, text) : [],
      bucket,
      note: smellNote(rel, bucket, routeRoot),
      lineCount: text.split('\n').length,
      useClient: rel.endsWith('.tsx') && /^["']use client["'];?/m.test(text),
    };
  });

  const tsxRows = rows.filter((r) => r.file.endsWith('.tsx'));
  const suspects = tsxRows.filter((r) =>
    ['cross-route', 'shared-feature', 'other'].includes(r.bucket),
  );

  const counts = tsxRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.bucket] = (acc[r.bucket] ?? 0) + 1;
    return acc;
  }, {});

  return {
    entry: relSrc(config, entryAbs),
    routeRoot,
    totalFiles: files.length,
    tsxComponents: tsxRows.length,
    counts,
    suspects,
    edges,
    all: tsxRows,
  };
}

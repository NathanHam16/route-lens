import { resolveConfig, type ResolvedColocationConfig } from './config.js';

export type AuditBucket =
  | 'colocated'
  | 'product'
  | 'shared'
  | 'shared-feature'
  | 'cross-route'
  | 'other'
  | 'logic';

export interface AuditRow {
  file: string;
  component: string;
  bucket: AuditBucket;
  note: string;
}

function normalizeRel(rel: string): string {
  return rel.replaceAll('\\', '/');
}

export function routeRootFromEntry(entryRel: string): string {
  const rel = normalizeRel(entryRel);
  const idx = rel.lastIndexOf('/page.tsx');
  if (idx === -1) {
    const lastSlash = rel.lastIndexOf('/');
    return lastSlash === -1 ? rel : rel.slice(0, lastSlash);
  }
  return rel.slice(0, idx);
}

/** app/submissions/[id] → app/submissions/_product/ */
export function featureSiblingPrefix(routeRoot: string): string | null {
  const parts = routeRoot.split('/');
  if (parts.length < 3 || parts[0] !== 'app') return null;
  return `${parts[0]}/${parts[1]}/_product/`;
}

export function createClassifier(config: ResolvedColocationConfig) {
  function classify(rel: string, routeRoot: string): AuditBucket {
    if (!rel.endsWith('.tsx')) return 'logic';
    if (rel.startsWith(`${routeRoot}/`) || rel === `${routeRoot}/page.tsx`) {
      return 'colocated';
    }
    if (config.productSibling) {
      const sibling = featureSiblingPrefix(routeRoot);
      if (sibling && rel.startsWith(sibling)) return 'product';
    }
    for (const prefix of config.okPrefixes) {
      if (rel.startsWith(prefix) || rel === prefix.replace(/\/$/, '')) {
        return 'shared';
      }
    }
    if (rel.startsWith('app/')) return 'cross-route';
    if (rel.startsWith('components/')) return 'shared-feature';
    return 'other';
  }

  function smellNote(rel: string, bucket: AuditBucket, routeRoot: string): string {
    if (bucket !== 'cross-route' && bucket !== 'shared-feature' && bucket !== 'other') {
      return '';
    }
    const other =
      rel.match(/^app\/([^/]+\/[^/]+)/)?.[1] ?? rel.match(/^components\/([^/]+)/)?.[1];
    const mine = routeRoot.match(/^app\/([^/]+\/[^/]+)/)?.[1];
    if (other && mine && !rel.startsWith(routeRoot.split('/').slice(0, 3).join('/'))) {
      return `other feature tree (${other}) on ${mine} page`;
    }
    if (bucket === 'shared-feature') {
      return 'feature component used here — single owner?';
    }
    return '';
  }

  return { classify, smellNote };
}

/** Default Next App Router colocation rules (no productSibling). */
const defaultRules = createClassifier(
  resolveConfig({ rootDir: typeof process !== 'undefined' ? process.cwd() : '.' }),
);

export const classify = defaultRules.classify;
export const smellNote = defaultRules.smellNote;

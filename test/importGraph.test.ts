import { describe, expect, it } from 'vitest';

import type { AuditRow } from '../src/core/classify.js';
import {
  buildImportIndex,
  disambiguateComponentRow,
  formatImporterSummary,
  importSubtree,
  importersOf,
} from '../src/core/importGraph.js';

describe('buildImportIndex', () => {
  it('builds bidirectional import maps', () => {
    const edges = [
      { from: 'app/page.tsx', to: 'app/Layout.tsx' },
      { from: 'app/Layout.tsx', to: 'components/ui/Button.tsx' },
      { from: 'app/page.tsx', to: 'components/ui/Button.tsx' },
    ];
    const { importsOf, importedBy } = buildImportIndex(edges);

    expect([...(importsOf.get('app/page.tsx') ?? [])].sort()).toEqual([
      'app/Layout.tsx',
      'components/ui/Button.tsx',
    ]);
    expect([...(importedBy.get('components/ui/Button.tsx') ?? [])].sort()).toEqual([
      'app/Layout.tsx',
      'app/page.tsx',
    ]);
  });
});

describe('importersOf', () => {
  it('returns direct importers sorted by path', () => {
    const { importedBy } = buildImportIndex([
      { from: 'b.tsx', to: 'target.tsx' },
      { from: 'a.tsx', to: 'target.tsx' },
    ]);
    expect(importersOf('target.tsx', importedBy)).toEqual(['a.tsx', 'b.tsx']);
  });

  it('returns empty array when file has no importers', () => {
    const { importedBy } = buildImportIndex([]);
    expect(importersOf('orphan.tsx', importedBy)).toEqual([]);
  });
});

describe('formatImporterSummary', () => {
  it('labels page entry when file is the entry and has no importers', () => {
    expect(formatImporterSummary('app/page.tsx', [], 'app/page.tsx')).toBe('page entry');
  });

  it('lists basenames up to max', () => {
    expect(formatImporterSummary('x.tsx', ['app/Viewer.tsx', 'app/Sidebar.tsx'])).toBe(
      'Viewer.tsx, Sidebar.tsx',
    );
  });

  it('truncates long importer lists', () => {
    const importers = ['a/A.tsx', 'b/B.tsx', 'c/C.tsx', 'd/D.tsx'];
    expect(formatImporterSummary('x.tsx', importers, undefined, 2)).toBe('A.tsx, B.tsx +2 more');
  });
});

describe('importSubtree', () => {
  it('collects all reachable files from a root', () => {
    const { importsOf } = buildImportIndex([
      { from: 'root.tsx', to: 'a.tsx' },
      { from: 'a.tsx', to: 'b.tsx' },
      { from: 'c.tsx', to: 'd.tsx' },
    ]);
    expect([...importSubtree('root.tsx', importsOf)].sort()).toEqual(['a.tsx', 'b.tsx', 'root.tsx']);
  });
});

describe('disambiguateComponentRow', () => {
  const rows: AuditRow[] = [
    {
      file: 'app/foo/Viewer.tsx',
      component: 'Viewer',
      bucket: 'colocated',
      note: '',
    },
    {
      file: 'app/bar/Viewer.tsx',
      component: 'Viewer',
      bucket: 'cross-route',
      note: '',
    },
    {
      file: 'components/shared/Viewer.tsx',
      component: 'Viewer',
      bucket: 'shared-feature',
      note: '',
    },
  ];

  it('returns null when no component matches', () => {
    const { importsOf } = buildImportIndex([]);
    expect(disambiguateComponentRow('Missing', rows, null, importsOf)).toBeNull();
  });

  it('returns the sole match', () => {
    const { importsOf } = buildImportIndex([]);
    const only = rows.filter((r) => r.bucket === 'colocated');
    expect(disambiguateComponentRow('Viewer', only, null, importsOf)?.file).toBe(
      'app/foo/Viewer.tsx',
    );
  });

  it('prefers the file imported by parent', () => {
    const { importsOf } = buildImportIndex([{ from: 'app/page.tsx', to: 'app/foo/Viewer.tsx' }]);
    expect(disambiguateComponentRow('Viewer', rows, 'app/page.tsx', importsOf)?.file).toBe(
      'app/foo/Viewer.tsx',
    );
  });

  it('breaks ties by worst bucket rank', () => {
    const { importsOf } = buildImportIndex([]);
    expect(disambiguateComponentRow('Viewer', rows, null, importsOf)?.bucket).toBe('cross-route');
  });

  it('prefers a mounted file when breaking name ties', () => {
    const { importsOf } = buildImportIndex([]);
    const mounted = new Set(['app/foo/Viewer.tsx']);
    expect(
      disambiguateComponentRow('Viewer', rows, null, importsOf, mounted)?.file,
    ).toBe('app/foo/Viewer.tsx');
  });
});

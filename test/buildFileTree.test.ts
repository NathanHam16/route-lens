import { describe, expect, it } from 'vitest';

import type { AuditRow } from '../src/core/classify.js';
import { buildFileTree, dominantBucket, type FileTreeNode } from '../src/core/buildFileTree.js';

function findNode(root: FileTreeNode, path: string): FileTreeNode | undefined {
  if (root.path === path) return root;
  for (const child of root.children) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return undefined;
}

describe('buildFileTree', () => {
  const rows: AuditRow[] = [
    {
      file: 'app/submissions/[id]/page.tsx',
      component: 'page',
      bucket: 'colocated',
      note: '',
    },
    {
      file: 'app/submissions/[id]/_viewer/Viewer.tsx',
      component: 'Viewer',
      bucket: 'colocated',
      note: '',
    },
    {
      file: 'components/ui/Button.tsx',
      component: 'Button',
      bucket: 'shared',
      note: '',
    },
  ];

  it('nests rows into a src-relative directory tree', () => {
    const root = buildFileTree(rows);
    expect(root.name).toBe('src');
    expect(root.path).toBe('');

    const page = findNode(root, 'app/submissions/[id]/page.tsx');
    expect(page?.row?.component).toBe('page');

    const viewer = findNode(root, 'app/submissions/[id]/_viewer/Viewer.tsx');
    expect(viewer?.row?.bucket).toBe('colocated');

    const appFolder = findNode(root, 'app/');
    expect(appFolder?.children.some((c) => c.name === 'submissions')).toBe(true);
  });

  it('sorts folders before files and alphabetically within each group', () => {
    const root = buildFileTree(rows);
    const topNames = root.children.map((c) => c.name);
    expect(topNames).toEqual(['app', 'components']);

    const components = findNode(root, 'components/');
    const childNames = components?.children.map((c) => c.name) ?? [];
    expect(childNames).toEqual(['ui']);
  });

  it('reuses folder nodes for multiple files in the same directory', () => {
    const root = buildFileTree(rows);
    const viewerFolder = findNode(root, 'app/submissions/[id]/_viewer/');
    expect(viewerFolder?.children).toHaveLength(1);
    expect(viewerFolder?.children[0]?.name).toBe('Viewer.tsx');
  });
});

describe('dominantBucket', () => {
  it('returns the leaf bucket for file nodes', () => {
    const root = buildFileTree([
      {
        file: 'app/a/page.tsx',
        component: 'page',
        bucket: 'colocated',
        note: '',
      },
    ]);
    const page = findNode(root, 'app/a/page.tsx')!;
    expect(dominantBucket(page)).toBe('colocated');
  });

  it('returns the worst bucket among descendants for folders', () => {
    const root = buildFileTree([
      {
        file: 'app/a/page.tsx',
        component: 'page',
        bucket: 'colocated',
        note: '',
      },
      {
        file: 'app/a/Leak.tsx',
        component: 'Leak',
        bucket: 'cross-route',
        note: '',
      },
    ]);
    const appFolder = findNode(root, 'app/')!;
    expect(dominantBucket(appFolder)).toBe('cross-route');
  });
});

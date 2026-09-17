import type { AuditBucket, AuditRow } from './classify.js';

export interface FileTreeNode {
  /** Segment name (`Sidebar.tsx` or `app`). */
  name: string;
  /** Full src-relative path; folders end with `/`. */
  path: string;
  children: FileTreeNode[];
  /** Set on file leaves only. */
  row?: AuditRow;
}

function sortNodes(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    const aDir = a.row === undefined;
    const bDir = b.row === undefined;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.children.length > 0) sortNodes(node.children);
  }
}

/** Nest audit rows into a src-relative directory tree (page files only). */
export function buildFileTree(rows: AuditRow[]): FileTreeNode {
  const root: FileTreeNode = { name: 'src', path: '', children: [] };

  for (const row of rows) {
    const parts = row.file.split('/');
    let current = root;
    let accumulated = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLeaf = i === parts.length - 1;
      accumulated = accumulated ? `${accumulated}/${part}` : part;

      if (isLeaf) {
        current.children.push({
          name: part,
          path: row.file,
          children: [],
          row,
        });
        continue;
      }

      let folder = current.children.find((child) => child.name === part && !child.row);
      if (!folder) {
        folder = { name: part, path: `${accumulated}/`, children: [] };
        current.children.push(folder);
      }
      current = folder;
    }
  }

  sortNodes(root.children);
  return root;
}

/** Worst bucket under a folder (for folder tint). */
export function dominantBucket(node: FileTreeNode): AuditBucket | null {
  if (node.row) return node.row.bucket;

  let worst: AuditBucket | null = null;
  let worstRank = -1;
  const rank: Record<AuditBucket, number> = {
    'cross-route': 5,
    'shared-feature': 4,
    other: 3,
    logic: 2,
    shared: 1,
    product: 0,
    colocated: 0,
  };

  const walk = (n: FileTreeNode) => {
    if (n.row) {
      const r = rank[n.row.bucket] ?? 0;
      if (r > worstRank) {
        worstRank = r;
        worst = n.row.bucket;
      }
      return;
    }
    for (const child of n.children) walk(child);
  };
  walk(node);
  return worst;
}

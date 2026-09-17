import fs from 'node:fs';
import path from 'node:path';

import type { ResolvedColocationConfig } from '../core/config.js';

/** List routable child folders, flattening `(route-group)` segments. */
export function listRouteChildren(dir: string): { name: string; abs: string }[] {
  const children: { name: string; abs: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
      children.push(...listRouteChildren(abs));
      continue;
    }
    children.push({ name: entry.name, abs });
  }
  return children;
}

/** Map `/submissions/<uuid>` → `submissions/[id]`. */
export function pathnameToRoute(pathname: string, config: ResolvedColocationConfig): string {
  const appDir = path.join(config.srcAbs, 'app');
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

  if (segments.length === 0) {
    return '';
  }

  let currentDir = appDir;
  const routeParts: string[] = [];

  for (const segment of segments) {
    const children = listRouteChildren(currentDir);
    const exact = children.find((c) => c.name === segment);
    if (exact) {
      routeParts.push(segment);
      currentDir = exact.abs;
      continue;
    }

    const dynamic = children.find((c) => c.name.startsWith('[') && c.name.endsWith(']'));
    if (dynamic) {
      routeParts.push(dynamic.name);
      currentDir = dynamic.abs;
      continue;
    }

    throw new Error(
      `Cannot match segment "${segment}" under app/${routeParts.join('/') || '(root)'}`,
    );
  }

  return routeParts.join('/');
}

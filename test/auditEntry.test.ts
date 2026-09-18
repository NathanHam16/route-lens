import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { auditPage } from '../src/core/audit.js';

function makeAppTree(root: string): void {
  fs.mkdirSync(path.join(root, 'src', 'app', 'blog'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'src', 'app', 'blog', 'page.tsx'),
    "export default function BlogPage() { return null; }\n",
  );
  fs.writeFileSync(path.join(root, 'next.config.ts'), 'export default {};\n');
}

describe('auditPage entry resolution', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts route templates', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'route-lens-'));
    dirs.push(root);
    makeAppTree(root);
    const result = auditPage('blog', { rootDir: root });
    expect(result.entry).toBe('app/blog/page.tsx');
  });

  it('rejects arbitrary ts files outside app routes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'route-lens-'));
    dirs.push(root);
    makeAppTree(root);
    fs.writeFileSync(path.join(root, 'src', 'lib.ts'), 'export const x = 1;\n');
    expect(() => auditPage('../src/lib.ts', { rootDir: root })).toThrow(/Invalid entry|must be an app/);
    expect(() => auditPage('next.config.ts', { rootDir: root })).toThrow(/must be an app/);
  });
});

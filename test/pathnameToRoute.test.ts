import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveConfig, type ResolvedColocationConfig } from '../src/core/config.js';
import { listRouteChildren, pathnameToRoute } from '../src/next/pathnameToRoute.js';

describe('listRouteChildren', () => {
  let tmpDir: string;
  let appDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-lens-'));
    appDir = path.join(tmpDir, 'src', 'app');
    fs.mkdirSync(path.join(appDir, 'submissions', '[id]'), { recursive: true });
    fs.mkdirSync(path.join(appDir, 'classes', '(teacher)', 'dashboard'), { recursive: true });
    fs.mkdirSync(path.join(appDir, '_components'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('skips private folders and flattens route groups', () => {
    const atRoot = listRouteChildren(appDir).map((c) => c.name).sort();
    expect(atRoot).toEqual(['classes', 'submissions']);

    const underClasses = listRouteChildren(path.join(appDir, 'classes')).map((c) => c.name);
    expect(underClasses).toEqual(['dashboard']);
  });
});

describe('pathnameToRoute', () => {
  let tmpDir: string;
  let config: ResolvedColocationConfig;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-lens-'));
    const appDir = path.join(tmpDir, 'src', 'app');
    fs.mkdirSync(path.join(appDir, 'submissions', '[id]'), { recursive: true });
    fs.mkdirSync(path.join(appDir, 'classes', '(teacher)', 'dashboard'), { recursive: true });
    config = resolveConfig({ rootDir: tmpDir, srcDir: 'src' });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty string for root pathname', () => {
    expect(pathnameToRoute('/', config)).toBe('');
    expect(pathnameToRoute('', config)).toBe('');
  });

  it('maps static segments', () => {
    expect(pathnameToRoute('/classes/dashboard', config)).toBe('classes/dashboard');
  });

  it('maps dynamic segments when no exact folder exists', () => {
    expect(pathnameToRoute('/submissions/550e8400-e29b-41d4-a716-446655440000', config)).toBe(
      'submissions/[id]',
    );
  });

  it('throws when a segment cannot be matched', () => {
    expect(() => pathnameToRoute('/unknown', config)).toThrow(/Cannot match segment "unknown"/);
    expect(() => pathnameToRoute('/submissions/uuid/extra', config)).toThrow(
      /Cannot match segment "extra"/,
    );
  });
});

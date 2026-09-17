import { describe, expect, it } from 'vitest';

import {
  createClassifier,
  featureSiblingPrefix,
  routeRootFromEntry,
} from '../src/core/classify.js';
import { resolveConfig } from '../src/core/config.js';

const routeRoot = 'app/submissions/[id]';

describe('routeRootFromEntry', () => {
  it('strips /page.tsx suffix', () => {
    expect(routeRootFromEntry('app/submissions/[id]/page.tsx')).toBe('app/submissions/[id]');
  });

  it('normalizes backslashes', () => {
    expect(routeRootFromEntry('app\\foo\\[id]\\page.tsx')).toBe('app/foo/[id]');
  });

  it('falls back to parent dir when no page.tsx', () => {
    expect(routeRootFromEntry('app/submissions/[id]/Viewer.tsx')).toBe('app/submissions/[id]');
  });
});

describe('featureSiblingPrefix', () => {
  it('derives _product sibling from app route root', () => {
    expect(featureSiblingPrefix('app/submissions/[id]')).toBe('app/submissions/_product/');
  });

  it('returns null for shallow or non-app paths', () => {
    expect(featureSiblingPrefix('app/page.tsx')).toBeNull();
    expect(featureSiblingPrefix('components/ui/Button.tsx')).toBeNull();
  });
});

describe('createClassifier', () => {
  const baseConfig = resolveConfig({
    rootDir: '/project',
    okPrefixes: ['components/ui/', 'lib/'],
    productSibling: false,
  });
  const { classify, smellNote } = createClassifier(baseConfig);

  it('classifies non-tsx as logic', () => {
    expect(classify('app/submissions/[id]/helpers.ts', routeRoot)).toBe('logic');
  });

  it('classifies files under route root as colocated', () => {
    expect(classify('app/submissions/[id]/_viewer/Viewer.tsx', routeRoot)).toBe('colocated');
    expect(classify('app/submissions/[id]/page.tsx', routeRoot)).toBe('colocated');
  });

  it('classifies okPrefixes as shared', () => {
    expect(classify('components/ui/Button.tsx', routeRoot)).toBe('shared');
    expect(classify('lib/utils.ts', routeRoot)).toBe('logic');
    expect(classify('lib/format.tsx', routeRoot)).toBe('shared');
  });

  it('classifies other app/ paths as cross-route', () => {
    expect(classify('app/classes/[ClassId]/page.tsx', routeRoot)).toBe('cross-route');
  });

  it('classifies components/ outside okPrefixes as shared-feature', () => {
    expect(classify('components/activities/Form.tsx', routeRoot)).toBe('shared-feature');
  });

  it('classifies everything else as other', () => {
    expect(classify('hooks/useThing.tsx', routeRoot)).toBe('other');
  });

  it('with productSibling, treats _product tree as product', () => {
    const productRules = createClassifier(resolveConfig({ productSibling: true }));
    expect(productRules.classify('app/submissions/_product/viewer/types.tsx', routeRoot)).toBe(
      'product',
    );
  });

  it('smellNote flags cross-route imports from another feature tree', () => {
    const bucket = classify('app/classes/[ClassId]/TeacherView.tsx', routeRoot);
    expect(bucket).toBe('cross-route');
    expect(smellNote('app/classes/[ClassId]/TeacherView.tsx', bucket, routeRoot)).toMatch(
      /other feature tree/,
    );
  });

  it('smellNote nudges shared-feature when no cross-feature overlap', () => {
    const shallowRoot = 'app/foo';
    const file = 'components/activities/Form.tsx';
    const bucket = classify(file, shallowRoot);
    expect(bucket).toBe('shared-feature');
    expect(smellNote(file, bucket, shallowRoot)).toBe(
      'feature component used here — single owner?',
    );
  });

  it('smellNote prefers cross-feature warning over shared-feature nudge', () => {
    const file = 'components/activities/Form.tsx';
    const bucket = classify(file, routeRoot);
    expect(smellNote(file, bucket, routeRoot)).toMatch(/other feature tree \(activities\)/);
  });

  it('smellNote is empty for clean buckets', () => {
    expect(smellNote('app/submissions/[id]/Viewer.tsx', 'colocated', routeRoot)).toBe('');
  });
});

import { describe, expect, it } from 'vitest';

import type { AuditRow } from '../src/core/classify.js';
import { buildImportIndex } from '../src/core/importGraph.js';
import { pickInspectRow } from '../src/react/resolveInspect.js';

const rows: AuditRow[] = [
  {
    file: 'app/submissions/_product/viewer/paper/sheet/PaperStackedCards.tsx',
    component: 'PaperCardShell',
    bucket: 'product',
    note: '',
  },
  {
    file: 'features/rubric-grading/components/RubricProse.tsx',
    component: 'RubricProse',
    bucket: 'shared-feature',
    note: '',
  },
];

describe('pickInspectRow', () => {
  it('prefers focus file when it appears in the fiber chain', () => {
    const { importsOf } = buildImportIndex([]);
    const chainRows = [rows[1]!, rows[0]!];
    const picked = pickInspectRow(chainRows, importsOf, {
      focusFile: 'app/submissions/_product/viewer/paper/sheet/PaperStackedCards.tsx',
    });
    expect(picked?.file).toBe(
      'app/submissions/_product/viewer/paper/sheet/PaperStackedCards.tsx',
    );
  });

  it('prefers outermost row within focus downstream subtree', () => {
    const { importsOf } = buildImportIndex([
      {
        from: 'app/submissions/_product/viewer/paper/sheet/PaperStackedCards.tsx',
        to: 'features/rubric-grading/components/RubricProse.tsx',
      },
    ]);
    const chainRows = [rows[1]!, rows[0]!];
    const picked = pickInspectRow(chainRows, importsOf, {
      focusFile: 'app/submissions/_product/viewer/paper/sheet/PaperStackedCards.tsx',
    });
    expect(picked?.file).toBe(
      'app/submissions/_product/viewer/paper/sheet/PaperStackedCards.tsx',
    );
  });

  it('returns null when focus is set but the hover chain is outside the subtree', () => {
    const { importsOf } = buildImportIndex([]);
    const chainRows = [rows[1]!];
    const picked = pickInspectRow(chainRows, importsOf, {
      focusFile: 'app/submissions/_product/viewer/paper/sheet/PaperStackedCards.tsx',
    });
    expect(picked).toBeNull();
  });

  it('defaults to innermost tsx row when no focus is set', () => {
    const { importsOf } = buildImportIndex([]);
    const chainRows = [rows[1]!, rows[0]!];
    const picked = pickInspectRow(chainRows, importsOf);
    expect(picked?.file).toBe('features/rubric-grading/components/RubricProse.tsx');
  });
});

import { describe, expect, it } from 'vitest';

import { buildImportIndex, focusImportScope } from '../src/core/importGraph.js';

describe('focusImportScope', () => {
  const edges = [
    { from: 'paper/PaperStackedCards.tsx', to: 'shared/PromptRenderer.tsx' },
    { from: 'shared/PromptRenderer.tsx', to: 'bank/bankDisplay.tsx' },
    { from: 'bank/bankDisplay.tsx', to: 'features/rubric-grading/index.ts' },
    { from: 'features/rubric-grading/index.ts', to: 'features/rubric-grading/GridMarker.tsx' },
    { from: 'paper/PaperStackedCards.tsx', to: 'paper/PlanArtifact.tsx' },
  ];
  const { importsOf } = buildImportIndex(edges);
  const root = 'paper/PaperStackedCards.tsx';

  it('direct mode hides transitive rubric imports', () => {
    const scope = focusImportScope(root, importsOf, false);
    expect(scope.has('shared/PromptRenderer.tsx')).toBe(true);
    expect(scope.has('paper/PlanArtifact.tsx')).toBe(true);
    expect(scope.has('features/rubric-grading/GridMarker.tsx')).toBe(false);
  });

  it('transitive mode includes rubric imports', () => {
    const scope = focusImportScope(root, importsOf, true);
    expect(scope.has('features/rubric-grading/GridMarker.tsx')).toBe(true);
  });
});

/**
 * Custom colocation rules via createClassifier / createRouteLensHandler.
 *
 * Comments only — paste the pieces you need into your app or scripts.
 */

// ── Option A: API route config (most common) ─────────────────────────────────
// File: app/api/dev/route-lens/route.ts

// import { createRouteLensHandler } from '@nathanham16/route-lens/next';
//
// export const GET = createRouteLensHandler({
//   // Paths treated as shared infrastructure (hidden under "lib" toggle).
//   okPrefixes: [
//     'app/_components/',
//     'components/ui/',
//     'components/copilot/',
//     'lib/',
//   ],
//   // app/foo/[id] also accepts app/foo/_product/ as product (green).
//   productSibling: true,
// });

// ── Option B: Programmatic audit with the same config ────────────────────────
// Scripts, tests, or CI checks — run from project root.

// import { auditPage } from '@nathanham16/route-lens';
//
// const result = auditPage('submissions/[id]', {
//   okPrefixes: ['components/ui/', 'lib/', 'components/copilot/'],
//   productSibling: true,
// });
//
// console.log(result.counts);
// console.log(result.suspects);

// ── Option C: Low-level classifier (custom tooling) ──────────────────────────

// import {
//   createClassifier,
//   resolveConfig,
//   DEFAULT_OK_PREFIXES,
// } from '@nathanham16/route-lens';
//
// const config = resolveConfig({
//   okPrefixes: [...DEFAULT_OK_PREFIXES, 'components/copilot/'],
//   productSibling: true,
// });
//
// const { classify, smellNote } = createClassifier(config);
//
// const routeRoot = 'app/submissions/[id]';
// const bucket = classify('components/copilot/ChatPanel.tsx', routeRoot);
// // → 'shared' (listed in okPrefixes)
//
// const productBucket = classify('app/submissions/_product/viewer/Viewer.tsx', routeRoot);
// // → 'product' (when productSibling: true)
//
// const note = smellNote('components/shared/DataTable.tsx', 'shared-feature', routeRoot);
// // → 'feature component used here — single owner?'

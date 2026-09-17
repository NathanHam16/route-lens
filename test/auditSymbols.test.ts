import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AuditRow } from '../src/core/classify.js';
import { rowMatchesComponentName, rowsForComponentName } from '../src/core/auditSymbols.js';

const pageRow: AuditRow = {
  file: 'app/submissions/[id]/page.tsx',
  component: 'page',
  symbols: ['page', 'ShortSubmissionPage'],
  bucket: 'colocated',
  note: '',
};

test('matches basename and exported default function names', () => {
  assert.equal(rowMatchesComponentName(pageRow, 'page'), true);
  assert.equal(rowMatchesComponentName(pageRow, 'ShortSubmissionPage'), true);
  assert.equal(rowMatchesComponentName(pageRow, 'SubmissionPage'), false);
});

test('finds rows by symbol', () => {
  assert.deepEqual(rowsForComponentName('ShortSubmissionPage', [pageRow]), [pageRow]);
});

'use client';

import type { AuditBucket } from '../core/classify.js';

const BUCKET_COLORS: Record<AuditBucket, string> = {
  colocated: 'bg-green-500',
  product: 'bg-blue-500',
  shared: 'bg-gray-400',
  'shared-feature': 'bg-yellow-400',
  'cross-route': 'bg-red-500',
  other: 'bg-orange-500',
  logic: 'bg-slate-500',
};

const BUCKET_LABELS: Record<AuditBucket, string> = {
  colocated: 'Colocated',
  product: 'Product',
  shared: 'Shared',
  'shared-feature': 'Shared feature',
  'cross-route': 'Cross-route',
  other: 'Other',
  logic: 'Logic',
};

/** Green / red / orange first — what you scan in the file tree. */
const LEGEND_ORDER: readonly AuditBucket[] = [
  'colocated',
  'cross-route',
  'shared-feature',
  'other',
  'product',
  'shared',
  'logic',
];

export function bucketColor(bucket: AuditBucket): string {
  return BUCKET_COLORS[bucket];
}

export function bucketLabel(bucket: AuditBucket): string {
  return BUCKET_LABELS[bucket];
}

/** Compact horizontal legend for the colocation audit overlay. */
export function BucketLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 px-3 py-2"
      aria-label="Colocation bucket legend"
    >
      {LEGEND_ORDER.map((bucket) => (
        <div key={bucket} className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${bucketColor(bucket)}`}
            aria-hidden
          />
          <span className="text-[10px] leading-none text-gray-300">{bucketLabel(bucket)}</span>
        </div>
      ))}
    </div>
  );
}

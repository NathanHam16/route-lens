'use client';

import type { AuditBucket } from '../core/classify.js';
import { COLOCATION_WIDGET_Z } from './widgetLayer';

export type InspectBadgeProps = {
  file: string | null;
  componentName?: string;
  bucket: AuditBucket | null;
  visible: boolean;
  x: number;
  y: number;
  fontSizePx?: number;
};

function shortLabel(bucket: AuditBucket | null): string {
  if (!bucket) return '?';
  if (bucket === 'colocated' || bucket === 'product') return 'ok';
  if (bucket === 'cross-route') return 'cross';
  if (bucket === 'shared-feature' || bucket === 'other') return 'audit';
  return bucket;
}

function labelColor(bucket: AuditBucket | null): string {
  if (!bucket) return 'text-zinc-400';
  if (bucket === 'colocated' || bucket === 'product') return 'text-green-400';
  if (bucket === 'cross-route') return 'text-red-400';
  if (bucket === 'shared-feature' || bucket === 'other') return 'text-orange-400';
  return 'text-zinc-500';
}

export function InspectBadge({
  file,
  componentName,
  bucket,
  visible,
  x,
  y,
  fontSizePx = 11,
}: InspectBadgeProps) {
  if (!visible) return null;

  const name = componentName ?? file?.split('/').pop() ?? '?';

  return (
    <div
      className="pointer-events-none fixed z-[10050] max-w-[220px] truncate rounded border border-white/10 bg-black/85 px-1.5 py-px font-mono text-zinc-200"
      style={{ left: x, top: y, fontSize: fontSizePx, zIndex: COLOCATION_WIDGET_Z + 1 }}
      title={file ?? undefined}
    >
      <span className={labelColor(bucket)}>{shortLabel(bucket)}</span>
      <span className="text-zinc-600"> · </span>
      {name}
    </div>
  );
}

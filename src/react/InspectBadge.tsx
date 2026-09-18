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

  const outsideFocus = !file && componentName === 'outside focus';
  const name = outsideFocus ? 'outside focus' : (componentName ?? file?.split('/').pop() ?? '?');

  return (
    <div
      className={`pointer-events-none fixed z-[10050] max-w-[240px] truncate rounded border px-1.5 py-px font-mono ${
        outsideFocus
          ? 'border-amber-500/40 bg-amber-950/90 text-amber-200'
          : 'border-white/10 bg-black/85 text-zinc-200'
      }`}
      style={{ left: x, top: y, fontSize: fontSizePx, zIndex: COLOCATION_WIDGET_Z + 1 }}
      title={outsideFocus ? 'Hover is outside the focused import subtree' : (file ?? undefined)}
    >
      {outsideFocus ? (
        name
      ) : (
        <>
          <span className={labelColor(bucket)}>{shortLabel(bucket)}</span>
          <span className="text-zinc-600"> · </span>
          {name}
        </>
      )}
    </div>
  );
}

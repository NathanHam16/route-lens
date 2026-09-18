'use client';

import { Crosshair } from 'lucide-react';

import type { AuditBucket } from '../core/classify.js';
import { fileBasename } from '../core/importGraph.js';
import type { GraphStep } from '../core/importGraph.js';
import { bucketTextColor } from './FileTreePanel';

function shortBucket(bucket: AuditBucket): string {
  if (bucket === 'colocated' || bucket === 'product') return 'ok';
  if (bucket === 'cross-route') return 'cross';
  if (bucket === 'shared-feature' || bucket === 'other') return 'audit';
  return bucket;
}

function pageMatchLabel(count: number | null | undefined, viaShell: boolean | undefined): string {
  if (count == null) return '';
  if (count === 0) return 'no DOM';
  return viaShell ? `${count} boxed (via tree)` : `${count} boxed`;
}

function CycleButton({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onPointerDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`shrink-0 rounded px-0.5 tabular-nums ${
        disabled ? 'text-zinc-800' : 'text-zinc-500 hover:bg-white/10 hover:text-zinc-200'
      }`}
    >
      {direction === 'prev' ? '‹' : '›'}
    </button>
  );
}

function NavJumpButton({
  direction,
  target,
  step,
  onClick,
}: {
  direction: 'up' | 'down';
  target: GraphStep | null | undefined;
  step: GraphStep | null | undefined;
  onClick?: () => void;
}) {
  const disabled = !target?.file || !onClick;
  const label = target?.file ? fileBasename(target.file) : '—';

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(event) => {
        if (!disabled) event.preventDefault();
      }}
      onClick={onClick}
      title={disabled ? undefined : (target?.file ?? undefined)}
      className={`flex min-w-0 items-center gap-0.5 truncate rounded px-1 py-0.5 ${
        disabled ? 'text-zinc-700' : 'text-sky-300 hover:bg-sky-900/50 hover:text-white'
      }`}
    >
      <span className="shrink-0">{direction === 'up' ? '↑' : '↓'}</span>
      <span className="truncate">{label}</span>
      {step && step.total > 1 ? (
        <span className="shrink-0 tabular-nums text-zinc-600">
          {step.index}/{step.total}
        </span>
      ) : null}
    </button>
  );
}

export type ColocationPanelHeaderProps = {
  routeLabel: string;
  focusFile?: string;
  focusRootBucket?: AuditBucket;
  entryFile?: string;
  counts: { ok: number; cross: number; audit: number };
  countsAreDownstream: boolean;
  pageMatchCount?: number | null;
  pageMatchViaShell?: boolean;
  fontPx: number;
  onClearFocus: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onCycleParentPrev?: () => void;
  onCycleParentNext?: () => void;
  onCycleChildPrev?: () => void;
  onCycleChildNext?: () => void;
  navParent?: GraphStep | null;
  navChild?: GraphStep | null;
  onZoomDelta: (delta: number) => void;
  inspectMode: boolean;
  onInspectToggle: () => void;
  onClose: () => void;
  ready: boolean;
};

export function ColocationPanelHeader({
  routeLabel,
  focusFile,
  focusRootBucket,
  counts,
  countsAreDownstream,
  pageMatchCount,
  pageMatchViaShell,
  fontPx,
  onClearFocus,
  onNavigateUp,
  onNavigateDown,
  onCycleParentPrev,
  onCycleParentNext,
  onCycleChildPrev,
  onCycleChildNext,
  navParent,
  navChild,
  onZoomDelta,
  inspectMode,
  onInspectToggle,
  onClose,
  ready,
}: ColocationPanelHeaderProps) {
  const matchLabel = pageMatchLabel(pageMatchCount, pageMatchViaShell);
  const parentMulti = (navParent?.total ?? 0) > 1;
  const childMulti = (navChild?.total ?? 0) > 1;

  return (
    <div className="divide-y divide-white/10">
      <div className="flex items-center gap-2 px-1.5 py-0.5">
        <span className="min-w-0 flex-1 truncate text-zinc-500" title={routeLabel}>
          {routeLabel}
        </span>
        <span className="flex shrink-0 items-center tabular-nums text-zinc-500">
          <button
            type="button"
            onClick={() => onZoomDelta(-1)}
            className="px-0.5 hover:text-zinc-300"
            aria-label="Smaller text"
          >
            −
          </button>
          <span className="min-w-[1.25rem] text-center">{fontPx}</span>
          <button
            type="button"
            onClick={() => onZoomDelta(1)}
            className="px-0.5 hover:text-zinc-300"
            aria-label="Larger text"
          >
            +
          </button>
        </span>
        <button
          type="button"
          onClick={onInspectToggle}
          aria-pressed={inspectMode}
          aria-label="Inspect page components"
          title="Inspect — hover page to identify files · I to toggle"
          className={`flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 ${
            inspectMode
              ? 'bg-sky-900/70 text-sky-200 ring-1 ring-sky-500/50'
              : 'text-zinc-500 hover:bg-white/10 hover:text-zinc-200'
          }`}
        >
          <Crosshair className="h-3 w-3 shrink-0" aria-hidden />
          <span className="text-[10px] uppercase tracking-wide">inspect</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 px-0.5 text-zinc-500 hover:text-zinc-300"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {ready && focusFile ? (
        <div className="space-y-1 bg-sky-950/40 px-1.5 py-1">
          <div className="flex min-w-0 items-center gap-1">
            <div className="flex min-w-0 flex-1 items-center gap-0.5">
              {parentMulti ? (
                <>
                  <CycleButton
                    direction="prev"
                    disabled={!parentMulti}
                    onClick={onCycleParentPrev}
                    label="Previous parent"
                  />
                  <CycleButton
                    direction="next"
                    disabled={!parentMulti}
                    onClick={onCycleParentNext}
                    label="Next parent"
                  />
                </>
              ) : null}
              <NavJumpButton
                direction="up"
                target={navParent}
                step={navParent}
                onClick={onNavigateUp}
              />
            </div>

            <div className="flex shrink-0 items-center gap-1 px-1 text-sky-100">
              <span className="max-w-[5.5rem] truncate font-medium" title={focusFile}>
                {fileBasename(focusFile)}
              </span>
              <button
                type="button"
                onClick={onClearFocus}
                className="rounded px-0.5 font-bold text-sky-300 hover:bg-sky-900/60 hover:text-white"
                aria-label="Clear focus"
              >
                ×
              </button>
              {focusRootBucket ? (
                <span className={`text-[10px] ${bucketTextColor(focusRootBucket)}`}>
                  {shortBucket(focusRootBucket)}
                </span>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
              <NavJumpButton
                direction="down"
                target={navChild}
                step={navChild}
                onClick={onNavigateDown}
              />
              {childMulti ? (
                <>
                  <CycleButton
                    direction="prev"
                    disabled={!childMulti}
                    onClick={onCycleChildPrev}
                    label="Previous import"
                  />
                  <CycleButton
                    direction="next"
                    disabled={!childMulti}
                    onClick={onCycleChildNext}
                    label="Next import"
                  />
                </>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
            <span>{matchLabel || 'tree + inspect scoped to this file’s imports'}</span>
            <span className="shrink-0 tabular-nums">
              ↑↓ go · ←→ imports · ⇧←→ parents
            </span>
          </div>
        </div>
      ) : ready ? (
        <div className="px-1.5 py-0.5 text-zinc-500">
          click file to focus · Inspect to hover page · I toggles inspect
        </div>
      ) : null}

      {ready ? (
        <div className="flex items-center justify-between gap-2 px-1.5 py-0.5 tabular-nums">
          <span className="text-zinc-500">
            {countsAreDownstream ? 'smells · downstream' : 'smells · this page'}
          </span>
          <span className="flex shrink-0 items-center gap-x-2 text-[10px]">
            <span className="text-green-400" title="Green — colocated or product">
              ok {counts.ok}
            </span>
            <span className="text-red-400" title="Red — imported from another route">
              cross {counts.cross}
            </span>
            <span className="text-orange-400" title="Orange — shared feature or other smell">
              audit {counts.audit}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

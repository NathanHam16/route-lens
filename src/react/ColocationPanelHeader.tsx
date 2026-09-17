'use client';

import { useMemo } from 'react';

import type { AuditBucket } from '../core/classify.js';
import {
  buildImportIndex,
  fileBasename,
  formatImporterSummary,
  importersOf,
  type ImportEdge,
} from '../core/importGraph.js';
import { bucketTextColor } from './FileTreePanel.js';

const MINI_CHECKBOX =
  'm-0 h-[0.85em] w-[0.85em] shrink-0 appearance-auto accent-sky-500';

function shortBucket(bucket: AuditBucket): string {
  if (bucket === 'colocated' || bucket === 'product') return 'ok';
  if (bucket === 'cross-route') return 'cross';
  if (bucket === 'shared-feature' || bucket === 'other') return 'audit';
  return bucket;
}

export type ColocationPanelHeaderProps = {
  routeLabel: string;
  focusFile?: string;
  focusRootBucket?: AuditBucket;
  hoveredFile?: string | null;
  entryFile?: string;
  edges: ImportEdge[];
  /** When focused: smells in files this component imports (not the root). */
  counts: { ok: number; cross: number; audit: number };
  countsAreDownstream: boolean;
  /** How many DOM instances of the focused file were boxed on the page. */
  pageMatchCount?: number | null;
  inspectMode: boolean;
  hideShared: boolean;
  fontPx: number;
  onInspectChange: (value: boolean) => void;
  onHideSharedChange: (value: boolean) => void;
  onClearFocus: () => void;
  onZoomDelta: (delta: number) => void;
  onClose: () => void;
  ready: boolean;
};

export function ColocationPanelHeader({
  routeLabel,
  focusFile,
  focusRootBucket,
  hoveredFile,
  entryFile,
  edges,
  counts,
  countsAreDownstream,
  pageMatchCount,
  inspectMode,
  hideShared,
  fontPx,
  onInspectChange,
  onHideSharedChange,
  onClearFocus,
  onZoomDelta,
  onClose,
  ready,
}: ColocationPanelHeaderProps) {
  const { importedBy } = useMemo(() => buildImportIndex(edges), [edges]);

  const hoverImporters = hoveredFile ? importersOf(hoveredFile, importedBy) : [];
  const hoverImporterText = hoveredFile
    ? formatImporterSummary(hoveredFile, hoverImporters, entryFile, 4)
    : null;

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
          onClick={onClose}
          className="shrink-0 px-0.5 text-zinc-500 hover:text-zinc-300"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {ready ? (
        focusFile ? (
          <div className="space-y-0.5 bg-sky-950/50 px-1.5 py-1">
            <div className="flex items-center gap-1.5 text-sky-100">
              <span className="shrink-0 text-zinc-500">focus</span>
              <span className="min-w-0 truncate font-medium" title={focusFile}>
                {fileBasename(focusFile)}
              </span>
              {focusRootBucket ? (
                <span className={`shrink-0 ${bucketTextColor(focusRootBucket)}`}>
                  = {shortBucket(focusRootBucket)}
                </span>
              ) : null}
              <button
                type="button"
                onClick={onClearFocus}
                className="ml-auto shrink-0 rounded px-1 text-sky-300 hover:bg-sky-900/60 hover:text-white"
                aria-label="Clear focus"
                title="Clear focus"
              >
                ×
              </button>
            </div>
            <p className="text-zinc-500">
              {pageMatchCount == null ? (
                'Tree shows what it imports'
              ) : pageMatchCount > 0 ? (
                <>
                  <span className="text-sky-400">{pageMatchCount}</span> on page (sky box)
                  · red/orange = downstream imports
                </>
              ) : (
                'Not mounted on page right now · red/orange = downstream imports'
              )}
            </p>
          </div>
        ) : (
          <div className="px-1.5 py-0.5 text-zinc-600">full page · click file or inspect to focus</div>
        )
      ) : null}

      {ready ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1.5 py-1">
          <label className="flex shrink-0 cursor-pointer items-center gap-0.5">
            <input
              type="checkbox"
              checked={inspectMode}
              onChange={(event) => onInspectChange(event.target.checked)}
              className={MINI_CHECKBOX}
            />
            <span>inspect</span>
          </label>
          <label className="flex shrink-0 cursor-pointer items-center gap-0.5">
            <input
              type="checkbox"
              checked={!hideShared}
              onChange={(event) => onHideSharedChange(!event.target.checked)}
              className={MINI_CHECKBOX}
            />
            <span>lib</span>
          </label>
          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-x-2 tabular-nums">
            {countsAreDownstream ? (
              <span className="text-zinc-600">downstream </span>
            ) : null}
            <span title="Colocated or product — correct tree">
              <span className="text-zinc-600">ok </span>
              <span className="text-green-400">{counts.ok}</span>
            </span>
            <span title="Cross-route — wrong feature tree">
              <span className="text-zinc-600">cross </span>
              <span className="text-red-400">{counts.cross}</span>
            </span>
            <span title="Shared-feature / other — audit single owner">
              <span className="text-zinc-600">audit </span>
              <span className="text-orange-400">{counts.audit}</span>
            </span>
          </div>
        </div>
      ) : null}

      {ready && hoveredFile ? (
        <div className="truncate px-1.5 py-0.5 text-zinc-500" title={hoveredFile}>
          <span className="text-zinc-600">{fileBasename(hoveredFile)} </span>
          <span className="text-zinc-600">← </span>
          {hoverImporters.length === 0 ? (
            <span>{entryFile && hoveredFile === entryFile ? 'page entry' : 'no importers'}</span>
          ) : (
            <span className="text-zinc-400">imported by {hoverImporterText}</span>
          )}
        </div>
      ) : ready ? (
        <div className="px-1.5 py-0.5 text-zinc-700">hover → importers</div>
      ) : null}
    </div>
  );
}

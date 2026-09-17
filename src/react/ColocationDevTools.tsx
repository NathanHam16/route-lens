'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ColocationPanelHeader } from './ColocationPanelHeader.js';
import { ColocationWidgetPortal } from './ColocationWidgetPortal.js';
import { DraggablePanel } from './DraggablePanel.js';
import { LocWidgetButton } from './LocWidgetButton.js';
import { countDownstreamSmells, countSmells, FileTreePanel } from './FileTreePanel.js';
import { InspectBadge } from './InspectBadge.js';
import type { AuditBucket, AuditRow } from '../core/classify.js';
import { buildImportIndex, importSubtree } from '../core/importGraph.js';
import { loadPanelZoom, savePanelZoom, stepPanelZoom } from './panelPrefs.js';
import { clearPageFileHighlights, revealPageFileOnScreen } from './highlightPageFile.js';
import { resolveInspectTarget } from './resolveInspect.js';
import { usePageAudit, type PageAuditResult } from './usePageAudit.js';

type HoverState = {
  visible: boolean;
  x: number;
  y: number;
  file: string | null;
  componentName?: string;
  bucket: AuditBucket | null;
};

const INITIAL_HOVER: HoverState = {
  visible: false,
  x: 0,
  y: 0,
  file: null,
  bucket: null,
};

function flattenRows(data: PageAuditResult | null): AuditRow[] {
  if (!data?.all) return [];
  return Object.values(data.all)
    .flatMap((rows) => rows ?? [])
    .sort((a, b) => a.file.localeCompare(b.file));
}

const HIGHLIGHT_CLASS = 'colocation-inspect-highlight';

const BUCKET_OUTLINE: Record<AuditBucket, string> = {
  colocated: 'outline-green-500/80',
  product: 'outline-green-500/60',
  shared: 'outline-zinc-400/40',
  'shared-feature': 'outline-orange-400/80',
  'cross-route': 'outline-red-500/90',
  other: 'outline-orange-400/70',
  logic: 'outline-zinc-500/40',
};

export type RouteLensProps = {
  apiPath?: string;
};

/** @deprecated Use `RouteLensProps` */
export type NextColocationWidgetProps = RouteLensProps;

function RouteLensPanel({ apiPath }: RouteLensProps) {
  const pathname = usePathname();
  const { loading, error, data } = usePageAudit(pathname, { apiPath });
  const rows = useMemo(() => flattenRows(data), [data]);
  const edges = data?.edges ?? [];

  const [open, setOpen] = useState(false);
  const [inspectMode, setInspectMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const [focusFile, setFocusFile] = useState<string | undefined>();
  const [hideShared, setHideShared] = useState(true);
  const [fontPx, setFontPx] = useState(() => loadPanelZoom());
  const [hover, setHover] = useState<HoverState>(INITIAL_HOVER);
  const [hoveredTreeFile, setHoveredTreeFile] = useState<string | null>(null);
  const [highlightedEl, setHighlightedEl] = useState<HTMLElement | null>(null);
  const [pageMatchCount, setPageMatchCount] = useState<number | null>(null);
  const pageHighlightsRef = useRef<HTMLElement[]>([]);

  const { importsOf } = useMemo(() => buildImportIndex(edges), [edges]);

  const clearPageHighlights = useCallback(() => {
    clearPageFileHighlights(pageHighlightsRef.current);
    pageHighlightsRef.current = [];
    setPageMatchCount(null);
  }, []);

  const highlightFileOnPage = useCallback(
    (file: string) => {
      clearPageHighlights();
      const { elements } = revealPageFileOnScreen(file, rows, data?.routeRoot, edges);
      pageHighlightsRef.current = elements;
      setPageMatchCount(elements.length);
    },
    [clearPageHighlights, data?.routeRoot, edges, rows],
  );

  const focusFiles = useMemo(() => {
    if (!focusFile) return null;
    return importSubtree(focusFile, importsOf);
  }, [focusFile, importsOf]);

  const displayRows = useMemo(() => {
    if (!focusFiles) return rows;
    return rows.filter((row) => focusFiles.has(row.file));
  }, [focusFiles, rows]);

  const treeHideShared = hideShared && !focusFile;
  const focusRootRow = useMemo(
    () => (focusFile ? displayRows.find((row) => row.file === focusFile) : undefined),
    [displayRows, focusFile],
  );
  const counts = useMemo(() => {
    if (focusFile) return countDownstreamSmells(displayRows, focusFile);
    return countSmells(displayRows);
  }, [displayRows, focusFile]);
  const routeLabel = data?.routeRoot ?? pathname ?? '…';

  const bumpZoom = (delta: number) => {
    setFontPx((current) => {
      const next = stepPanelZoom(current, delta);
      savePanelZoom(next);
      return next;
    });
  };

  const handleSelectFile = useCallback(
    (file: string) => {
      setSelectedFile(file);
      setFocusFile(file);
      highlightFileOnPage(file);
    },
    [highlightFileOnPage],
  );

  const handleClearFocus = useCallback(() => {
    setFocusFile(undefined);
    clearPageHighlights();
  }, [clearPageHighlights]);

  const updateHoverFromElement = useCallback(
    (element: HTMLElement | null, x: number, y: number) => {
      if (!element || element.closest('[data-route-lens]')) {
        setHover((prev) => (prev.visible ? INITIAL_HOVER : prev));
        setHighlightedEl(null);
        return;
      }

      const target = resolveInspectTarget(element, rows, data?.routeRoot, edges);

      setHover({
        visible: true,
        x: x + 12,
        y: y + 12,
        file: target.file,
        componentName: target.componentName,
        bucket: target.bucket,
      });
      setHighlightedEl(element);

      if (target.file) setSelectedFile(target.file);
    },
    [data?.routeRoot, edges, rows],
  );

  useEffect(() => {
    if (!inspectMode || !highlightedEl) return;

    highlightedEl.classList.add(HIGHLIGHT_CLASS, 'outline', 'outline-2', '-outline-offset-2');
    const bucket = hover.bucket;
    if (bucket) highlightedEl.classList.add(BUCKET_OUTLINE[bucket]);

    return () => {
      highlightedEl.classList.remove(
        HIGHLIGHT_CLASS,
        'outline',
        'outline-2',
        '-outline-offset-2',
        ...Object.values(BUCKET_OUTLINE),
      );
    };
  }, [highlightedEl, hover.bucket, inspectMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!inspectMode) {
      setHover(INITIAL_HOVER);
      setHighlightedEl(null);
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      updateHoverFromElement(element instanceof HTMLElement ? element : null, event.clientX, event.clientY);
    };

    const onClick = (event: MouseEvent) => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (!(element instanceof HTMLElement) || element.closest('[data-route-lens]')) return;
      event.preventDefault();
      event.stopPropagation();
      const target = resolveInspectTarget(element, rows, data?.routeRoot, edges);
      if (target.file) {
        handleSelectFile(target.file);
      }
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('click', onClick, true);
    };
  }, [data?.routeRoot, edges, handleSelectFile, inspectMode, rows, updateHoverFromElement]);

  useEffect(() => {
    if (!open) {
      setInspectMode(false);
      setHover(INITIAL_HOVER);
      setHighlightedEl(null);
      clearPageHighlights();
    }
  }, [clearPageHighlights, open]);

  useEffect(() => {
    setFocusFile(undefined);
    setSelectedFile(undefined);
    clearPageHighlights();
  }, [clearPageHighlights, pathname]);

  useEffect(() => () => clearPageHighlights(), [clearPageHighlights]);

  const header = (
    <ColocationPanelHeader
      routeLabel={routeLabel}
      focusFile={focusFile}
      focusRootBucket={focusRootRow?.bucket}
      hoveredFile={hoveredTreeFile}
      entryFile={data?.entry}
      edges={edges}
      counts={counts}
      countsAreDownstream={Boolean(focusFile)}
      inspectMode={inspectMode}
      hideShared={hideShared}
      fontPx={fontPx}
      onInspectChange={setInspectMode}
      onHideSharedChange={setHideShared}
      pageMatchCount={pageMatchCount}
      onClearFocus={handleClearFocus}
      onZoomDelta={bumpZoom}
      onClose={() => setOpen(false)}
      ready={!loading && !error}
    />
  );

  return (
    <ColocationWidgetPortal>
      <LocWidgetButton open={open} onToggle={() => setOpen((prev) => !prev)} />

      {open ? (
        <DraggablePanel header={header} fontSizePx={fontPx}>
          {loading ? <p className="p-1 text-zinc-500">loading…</p> : null}
          {error ? <p className="p-1 text-red-400">{error}</p> : null}
          {!loading && !error ? (
            <FileTreePanel
              rows={displayRows}
              edges={edges}
              entryFile={data?.entry}
              selectedFile={selectedFile}
              onSelectFile={handleSelectFile}
              onClearFocus={handleClearFocus}
              onHoverFile={setHoveredTreeFile}
              focusFile={focusFile}
              hideShared={treeHideShared}
            />
          ) : null}
        </DraggablePanel>
      ) : null}

      <InspectBadge
        visible={inspectMode && hover.visible}
        x={hover.x}
        y={hover.y}
        file={hover.file}
        componentName={hover.componentName}
        bucket={hover.bucket}
        fontSizePx={fontPx}
      />
    </ColocationWidgetPortal>
  );
}

export default function RouteLens(props: RouteLensProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <RouteLensPanel {...props} />;
}

/** @deprecated Use `RouteLens` */
export const NextColocationWidget = RouteLens;

/** @deprecated Use `RouteLens` */
export const ColocationDevTools = RouteLens;

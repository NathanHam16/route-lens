'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { usePathname } from 'next/navigation';
import { ColocationPanelHeader } from './ColocationPanelHeader';
import { ColocationWidgetPortal } from './ColocationWidgetPortal';
import { DraggablePanel } from './DraggablePanel';
import { LocWidgetButton } from './LocWidgetButton';
import { countDownstreamSmells, countSmells, FileTreePanel } from './FileTreePanel';
import { InspectBadge } from './InspectBadge';
import type { AuditBucket, AuditRow } from '../core/classify.js';
import {
  buildImportIndex,
  graphChildren,
  graphParents,
  importSubtree,
  pickGraphNeighbor,
} from '../core/importGraph.js';
import { buildGraphDepthIndex } from '../core/auditMetrics.js';
import { loadPanelZoom, savePanelZoom, stepPanelZoom } from './panelPrefs';
import {
  applySettingsPreset,
  loadPanelSettings,
  savePanelSettings,
  type PanelSettings,
  type SettingsPreset,
} from './panelSettings';
import { detectActivePreset, SettingsPanel } from './SettingsPanel';
import {
  clearPageFileHighlights,
  clearPageFileMountCache,
  mountedAuditFiles,
  mountRectsForFile,
  revealPageFileOnScreen,
  warmPageFileMountCache,
} from './highlightPageFile';
import type { PageMountRect } from './highlightPageFile';
import { PageHoverOverlay } from './PageHoverOverlay';
import { resolveInspectTarget } from './resolveInspect';
import { usePageAudit, type PageAuditResult } from './usePageAudit';

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

function ColocationDevToolsPanel({ apiPath }: RouteLensProps) {
  const pathname = usePathname();
  const { loading, error, data } = usePageAudit(pathname, { apiPath });
  const rows = useMemo(() => flattenRows(data), [data]);
  const edges = data?.edges ?? [];

  const [open, setOpen] = useState(false);
  const [inspectMode, setInspectMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const [focusFile, setFocusFile] = useState<string | undefined>();
  const [settings, setSettings] = useState<PanelSettings>(() => loadPanelSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<SettingsPreset | null>(() =>
    detectActivePreset(loadPanelSettings()),
  );
  const [mountedFiles, setMountedFiles] = useState<Set<string>>(() => new Set());
  const [fontPx, setFontPx] = useState(() => loadPanelZoom());
  const [hover, setHover] = useState<HoverState>(INITIAL_HOVER);
  const [hoveredTreeFile, setHoveredTreeFile] = useState<string | null>(null);
  const [highlightedEl, setHighlightedEl] = useState<HTMLElement | null>(null);
  const [pageMatchCount, setPageMatchCount] = useState<number | null>(null);
  const [pageMatchViaShell, setPageMatchViaShell] = useState(false);
  const pageHighlightsRef = useRef<HTMLElement[]>([]);
  const panelFocusRef = useRef<HTMLDivElement>(null);
  const [hoverRects, setHoverRects] = useState<PageMountRect[]>([]);

  const focusPanel = useCallback(() => {
    panelFocusRef.current?.focus({ preventScroll: true });
  }, []);

  const { importsOf, importedBy } = useMemo(() => buildImportIndex(edges), [edges]);
  const [parentStep, setParentStep] = useState(0);
  const [childStep, setChildStep] = useState(0);

  const clearPageHighlights = useCallback(() => {
    clearPageFileHighlights(pageHighlightsRef.current);
    pageHighlightsRef.current = [];
    setPageMatchCount(null);
  }, []);

  const highlightFileOnPage = useCallback(
    (file: string) => {
      clearPageHighlights();
      setPageMatchCount(null);
      setPageMatchViaShell(false);

      const run = () => {
        const { elements, viaEntryShell } = revealPageFileOnScreen(
          file,
          rows,
          data?.routeRoot,
          edges,
          data?.entry,
        );
        pageHighlightsRef.current = elements;
        setPageMatchCount(elements.length);
        setPageMatchViaShell(viaEntryShell);
      };

      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(run);
      } else {
        run();
      }
    },
    [clearPageHighlights, data?.entry, data?.routeRoot, edges, rows],
  );

  const focusFiles = useMemo(() => {
    if (!focusFile) return null;
    return importSubtree(focusFile, importsOf);
  }, [focusFile, importsOf]);

  const displayRows = useMemo(() => {
    if (!focusFiles) return rows;
    return rows.filter((row) => focusFiles.has(row.file));
  }, [focusFiles, rows]);

  /** When focused, inspect/name resolution only considers the isolated subtree. */
  const inspectRows = focusFile ? displayRows : rows;

  const graphDepths = useMemo(
    () => buildGraphDepthIndex(data?.entry, edges),
    [data?.entry, edges],
  );

  const updateSettings = useCallback((patch: Partial<PanelSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      savePanelSettings(next);
      setActivePreset(detectActivePreset(next));
      return next;
    });
  }, []);

  const applyPreset = useCallback((preset: SettingsPreset) => {
    const next = applySettingsPreset(preset);
    setSettings(next);
    savePanelSettings(next);
    setActivePreset(preset);
  }, []);
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
    (file: string, resetGraphSteps = true) => {
      if (resetGraphSteps) {
        setParentStep(0);
        setChildStep(0);
      }
      setSelectedFile(file);
      setFocusFile(file);
      highlightFileOnPage(file);
      focusPanel();
    },
    [focusPanel, highlightFileOnPage],
  );

  const navFile = focusFile ?? hoveredTreeFile ?? null;

  const navParent = useMemo(() => {
    if (!navFile) return null;
    return pickGraphNeighbor(graphParents(navFile, importedBy), parentStep);
  }, [importedBy, navFile, parentStep]);

  const navChild = useMemo(() => {
    if (!navFile) return null;
    return pickGraphNeighbor(graphChildren(navFile, importsOf), childStep);
  }, [childStep, importsOf, navFile]);

  const goUp = useCallback(() => {
    if (!navFile) return;
    const step = pickGraphNeighbor(graphParents(navFile, importedBy), parentStep);
    if (step.file) handleSelectFile(step.file, false);
  }, [handleSelectFile, importedBy, navFile, parentStep]);

  const goDown = useCallback(() => {
    if (!navFile) return;
    const step = pickGraphNeighbor(graphChildren(navFile, importsOf), childStep);
    if (step.file) handleSelectFile(step.file, false);
  }, [childStep, handleSelectFile, importsOf, navFile]);

  const cycleParent = useCallback(
    (delta: -1 | 1) => {
      if (!navFile) return;
      const total = graphParents(navFile, importedBy).length;
      if (total <= 1) return;
      setParentStep((current) => (current + delta + total) % total);
    },
    [importedBy, navFile],
  );

  const cycleChild = useCallback(
    (delta: -1 | 1) => {
      if (!navFile) return;
      const total = graphChildren(navFile, importsOf).length;
      if (total <= 1) return;
      setChildStep((current) => (current + delta + total) % total);
    },
    [importsOf, navFile],
  );

  const handleClearFocus = useCallback(() => {
    setFocusFile(undefined);
    setParentStep(0);
    setChildStep(0);
    clearPageHighlights();
    setPageMatchCount(null);
    setPageMatchViaShell(false);
  }, [clearPageHighlights]);

  useEffect(() => {
    if (!rows.length || !edges.length) return;
    warmPageFileMountCache(rows, edges, data?.entry);
    const frame = requestAnimationFrame(() => {
      warmPageFileMountCache(rows, edges, data?.entry);
      setMountedFiles(mountedAuditFiles(data?.entry));
    });
    setMountedFiles(mountedAuditFiles(data?.entry));
    return () => cancelAnimationFrame(frame);
  }, [data?.entry, edges, rows]);

  useEffect(() => {
    if (hoveredTreeFile) {
      setHoverRects(mountRectsForFile(hoveredTreeFile, data?.entry));
      return;
    }
    setHoverRects([]);
  }, [data?.entry, hoveredTreeFile]);

  const updateHoverFromElement = useCallback(
    (element: HTMLElement | null, x: number, y: number) => {
      if (!element || element.closest('[data-route-lens]')) {
        setHover((prev) => (prev.visible ? INITIAL_HOVER : prev));
        setHighlightedEl(null);
        return;
      }

      const target = resolveInspectTarget(element, inspectRows, data?.routeRoot, edges, {
        focusFile,
        mountedFiles,
      });

      const outsideFocus = Boolean(focusFile && !target.file);

      setHover({
        visible: true,
        x: x + 12,
        y: y + 12,
        file: target.file,
        componentName: target.componentName,
        bucket: target.bucket,
      });
      setHighlightedEl(outsideFocus ? null : element);

      if (target.file) setSelectedFile(target.file);
    },
    [data?.routeRoot, edges, focusFile, inspectRows, mountedFiles],
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

  const runGraphKey = useCallback(
    (event: { key: string; shiftKey: boolean; preventDefault: () => void; stopPropagation: () => void }) => {
      if (!focusFile) return;

      const key = event.key;
      if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (key === 'ArrowUp') goUp();
      else if (key === 'ArrowDown') goDown();
      else if (key === 'ArrowLeft') {
        if (event.shiftKey) cycleParent(-1);
        else cycleChild(-1);
      } else if (key === 'ArrowRight') {
        if (event.shiftKey) cycleParent(1);
        else cycleChild(1);
      }
    },
    [cycleChild, cycleParent, focusFile, goDown, goUp],
  );

  const handleGraphKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      runGraphKey(event);
    },
    [runGraphKey],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (
        open &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.toLowerCase() === 'i' &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLInputElement && event.target.type !== 'checkbox')
      ) {
        event.preventDefault();
        setInspectMode((prev) => !prev);
        return;
      }
      if (!open || !focusFile) return;
      if (!(event.target instanceof HTMLElement)) return;
      if (!event.target.closest('[data-route-lens]')) return;
      if (event.target instanceof HTMLTextAreaElement) return;
      if (
        event.target instanceof HTMLInputElement &&
        !['checkbox', 'radio', 'button'].includes(event.target.type)
      ) {
        return;
      }
      runGraphKey(event);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [focusFile, open, runGraphKey]);

  useEffect(() => {
    if (open) focusPanel();
  }, [focusPanel, open]);

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
      if (
        element.closest(
          'button, a, input, textarea, select, [contenteditable="true"], [role="button"]',
        )
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const target = resolveInspectTarget(element, inspectRows, data?.routeRoot, edges, {
        focusFile,
        mountedFiles,
      });
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
  }, [
    data?.routeRoot,
    edges,
    focusFile,
    handleSelectFile,
    inspectMode,
    inspectRows,
    mountedFiles,
    updateHoverFromElement,
  ]);

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
    setHoverRects([]);
    clearPageHighlights();
    clearPageFileMountCache();
  }, [clearPageHighlights, pathname]);

  useEffect(() => () => clearPageHighlights(), [clearPageHighlights]);

  const header = (
    <ColocationPanelHeader
      routeLabel={routeLabel}
      focusFile={focusFile}
      focusRootBucket={focusRootRow?.bucket}
      entryFile={data?.entry}
      counts={counts}
      countsAreDownstream={Boolean(focusFile)}
      fontPx={fontPx}
      pageMatchCount={pageMatchCount}
      pageMatchViaShell={pageMatchViaShell}
      onClearFocus={handleClearFocus}
      onNavigateUp={navFile ? goUp : undefined}
      onNavigateDown={navFile ? goDown : undefined}
      onCycleParentPrev={navFile ? () => cycleParent(-1) : undefined}
      onCycleParentNext={navFile ? () => cycleParent(1) : undefined}
      onCycleChildPrev={navFile ? () => cycleChild(-1) : undefined}
      onCycleChildNext={navFile ? () => cycleChild(1) : undefined}
      navParent={navParent}
      navChild={navChild}
      onZoomDelta={bumpZoom}
      inspectMode={inspectMode}
      onInspectToggle={() => setInspectMode((prev) => !prev)}
      onClose={() => setOpen(false)}
      ready={!loading && !error}
    />
  );

  return (
    <ColocationWidgetPortal>
      <LocWidgetButton open={open} onToggle={() => setOpen((prev) => !prev)} />

      {open ? (
        <DraggablePanel
          header={header}
          fontSizePx={fontPx}
          panelRef={panelFocusRef}
          onPanelKeyDown={handleGraphKeyDown}
        >
          {loading ? <p className="p-1 text-zinc-500">loading…</p> : null}
          {error ? <p className="p-1 text-red-400">{error}</p> : null}
          {!loading && !error ? (
            <>
              <FileTreePanel
                rows={displayRows}
                edges={edges}
                entryFile={data?.entry}
                settings={
                  focusFile
                    ? { ...settings, hideShared: false, smellsOnly: false }
                    : settings
                }
                graphDepths={graphDepths}
                mountedFiles={mountedFiles}
                onSelectFile={handleSelectFile}
                onClearFocus={handleClearFocus}
                onHoverFile={setHoveredTreeFile}
                focusFile={focusFile}
              />
              <SettingsPanel
                open={settingsOpen}
                onToggleOpen={() => setSettingsOpen((prev) => !prev)}
                settings={settings}
                activePreset={activePreset}
                onPreset={applyPreset}
                onChange={updateSettings}
                inspectMode={inspectMode}
                onInspectChange={setInspectMode}
                filterLocked={Boolean(focusFile)}
              />
            </>
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

      <PageHoverOverlay rects={hoverRects} />
    </ColocationWidgetPortal>
  );
}

export default function RouteLens(props: RouteLensProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <ColocationDevToolsPanel {...props} />;
}

/** @deprecated Use `RouteLens` */
export const ColocationDevTools = RouteLens;

/** @deprecated Use `RouteLens` */
export const NextColocationWidget = RouteLens;

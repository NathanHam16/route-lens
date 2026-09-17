'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { importCountsForRow } from '../core/auditMetrics.js';
import { scrollAuditFileToTop } from './scrollAuditFileToTop';

import { buildFileTree, dominantBucket, sortFileTreeBySmells, type FileTreeNode } from '../core/buildFileTree.js';
import type { AuditBucket, AuditRow } from '../core/classify.js';
import {
  buildImportIndex,
  componentImportsOf,
  importersOf,
  type ImportEdge,
} from '../core/importGraph.js';
import type { PanelSettings } from './panelSettings';

export function bucketTextColor(bucket: AuditBucket): string {
  switch (bucket) {
    case 'colocated':
    case 'product':
      return 'text-green-400';
    case 'cross-route':
      return 'text-red-400';
    case 'shared-feature':
    case 'other':
      return 'text-orange-400';
    case 'shared':
      return 'text-zinc-500';
    case 'logic':
      return 'text-zinc-600';
    default:
      return 'text-zinc-300';
  }
}

function folderTextColor(node: FileTreeNode): string {
  const bucket = dominantBucket(node);
  if (!bucket) return 'text-zinc-500';
  if (bucket === 'cross-route') return 'text-red-400/80';
  if (bucket === 'shared-feature' || bucket === 'other') return 'text-orange-400/80';
  if (bucket === 'colocated' || bucket === 'product') return 'text-green-400/70';
  return 'text-zinc-500';
}

function graphTooltip(
  file: string,
  row: AuditRow,
  importers: string[],
  imports: string[],
  entryFile?: string,
): string {
  const lines = [file];
  if (row.note) lines.push(row.note);
  if (row.lineCount != null) lines.push(`${row.lineCount} lines`);
  if (row.useClient) lines.push('use client');
  lines.push(
    importers.length === 0
      ? entryFile && file === entryFile
        ? '← page entry'
        : '← no importers'
      : `← ${importers.map((i) => i.split('/').pop()).join(', ')}`,
  );
  lines.push(imports.length === 0 ? '→ none' : `→ ${imports.map((i) => i.split('/').pop()).join(', ')}`);
  return lines.join('\n');
}

function displayName(row: AuditRow, settings: PanelSettings): string {
  if (settings.showFullPath) return row.file;
  return row.file.split('/').pop() ?? row.file;
}

function RowBadges({
  row,
  settings,
  importCounts,
  graphDepth,
  mounted,
}: {
  row: AuditRow;
  settings: PanelSettings;
  importCounts: { importers: number; imports: number };
  graphDepth?: number;
  mounted: boolean;
}) {
  const showAny =
    settings.showImportCount ||
    settings.showImporterCount ||
    settings.showLineCount ||
    settings.showGraphDepth ||
    settings.showNoDomTag;

  if (!showAny) return null;

  return (
    <span className="ml-auto flex shrink-0 items-center gap-1 tabular-nums text-[10px] text-zinc-600">
      {settings.showNoDomTag && row.file.endsWith('.tsx') && !mounted ? (
        <span className="text-zinc-700">0dom</span>
      ) : null}
      {settings.showGraphDepth && graphDepth != null ? <span>d{graphDepth}</span> : null}
      {settings.showLineCount && row.lineCount != null ? <span>{row.lineCount}L</span> : null}
      {settings.showImporterCount ? <span>←{importCounts.importers}</span> : null}
      {settings.showImportCount ? <span>→{importCounts.imports}</span> : null}
    </span>
  );
}

/** Folder paths that must be open to reveal `file`. */
export function ancestorFolderPaths(filePath: string): string[] {
  const parts = filePath.split('/');
  const paths: string[] = [];
  let acc = '';
  for (let i = 0; i < parts.length - 1; i++) {
    acc = acc ? `${acc}/${parts[i]}` : parts[i]!;
    paths.push(`${acc}/`);
  }
  return paths;
}

export interface FileTreePanelProps {
  rows: AuditRow[];
  edges?: ImportEdge[];
  entryFile?: string;
  settings: PanelSettings;
  graphDepths: Map<string, number>;
  mountedFiles: Set<string>;
  onSelectFile?: (file: string) => void;
  onClearFocus?: () => void;
  onHoverFile?: (file: string | null) => void;
  selectedFile?: string;
  focusFile?: string;
}

function TreeNode({
  node,
  depth,
  collapsed,
  toggle,
  focusFile,
  onSelectFile,
  onClearFocus,
  onHoverFile,
  importedBy,
  importsOf,
  entryFile,
  hoveredFile,
  settings,
  graphDepths,
  mountedFiles,
}: {
  node: FileTreeNode;
  depth: number;
  collapsed: Set<string>;
  toggle: (path: string) => void;
  focusFile?: string;
  onSelectFile?: (file: string) => void;
  onClearFocus?: () => void;
  onHoverFile?: (file: string | null) => void;
  importedBy: Map<string, Set<string>>;
  importsOf: Map<string, Set<string>>;
  entryFile?: string;
  hoveredFile: string | null;
  settings: PanelSettings;
  graphDepths: Map<string, number>;
  mountedFiles: Set<string>;
}) {
  const isFolder = !node.row;
  const isCollapsed = isFolder && collapsed.has(node.path);
  const pad = depth * 0.85 + 0.35;

  if (isFolder) {
    return (
      <>
        <button
          type="button"
          onClick={() => toggle(node.path)}
          className={`flex w-full items-center gap-0.5 py-px pr-0.5 text-left hover:bg-white/5 ${folderTextColor(node)}`}
          style={{ paddingLeft: `${pad}em` }}
        >
          <span className="w-[0.85em] shrink-0 opacity-50">{isCollapsed ? '▸' : '▾'}</span>
          <span className="truncate">{node.name}/</span>
        </button>
        {!isCollapsed
          ? node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                collapsed={collapsed}
                toggle={toggle}
                focusFile={focusFile}
                onSelectFile={onSelectFile}
                onClearFocus={onClearFocus}
                onHoverFile={onHoverFile}
                importedBy={importedBy}
                importsOf={importsOf}
                entryFile={entryFile}
                hoveredFile={hoveredFile}
                settings={settings}
                graphDepths={graphDepths}
                mountedFiles={mountedFiles}
              />
            ))
          : null}
      </>
    );
  }

  const row = node.row!;
  const isFocusRoot = focusFile === row.file;
  const isHovered = hoveredFile === row.file;
  const importers = importersOf(row.file, importedBy);
  const imports = componentImportsOf(row.file, importsOf);
  const importCounts = importCountsForRow(row.file, importedBy, importsOf);
  const label = displayName(row, settings);
  const dimUnmounted = settings.showNoDomTag && row.file.endsWith('.tsx') && !mountedFiles.has(row.file);
  const smellNote =
    settings.showSmellNotes && row.note ? (
      <span className="min-w-0 truncate text-orange-400/80">{row.note}</span>
    ) : row.note ? (
      <span className="ml-auto shrink-0 text-orange-400/70">!</span>
    ) : null;

  if (isFocusRoot) {
    return (
      <div
        data-audit-file={row.file}
        className={`flex items-center gap-0.5 bg-sky-500/25 py-px pr-0.5 ring-1 ring-inset ring-sky-400/70 ${
          dimUnmounted ? 'opacity-60' : ''
        }`}
        style={{ paddingLeft: `${pad + 0.75}em` }}
        onMouseEnter={() => onHoverFile?.(row.file)}
      >
        <button
          type="button"
          title={graphTooltip(row.file, row, importers, imports, entryFile)}
          onClick={() => onSelectFile?.(row.file)}
          className="flex min-w-0 flex-1 items-center gap-1 truncate text-left font-medium text-sky-100 hover:opacity-90"
        >
          <span className="truncate">{label}</span>
          <RowBadges
            row={row}
            settings={settings}
            importCounts={importCounts}
            graphDepth={graphDepths.get(row.file)}
            mounted={mountedFiles.has(row.file)}
          />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClearFocus?.();
          }}
          className="shrink-0 rounded px-0.5 font-bold text-sky-300 hover:bg-sky-900/50 hover:text-white"
          aria-label="Clear focus"
          title="Clear focus"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-audit-file={row.file}
      title={graphTooltip(row.file, row, importers, imports, entryFile)}
      onClick={() => onSelectFile?.(row.file)}
      onMouseEnter={() => onHoverFile?.(row.file)}
      className={`flex w-full items-center gap-1 py-px pr-0.5 text-left hover:bg-white/5 ${
        isHovered ? 'bg-white/[0.06]' : ''
      } ${dimUnmounted ? 'opacity-50' : ''}`}
      style={{ paddingLeft: `${pad + 0.75}em` }}
    >
      <span className={`min-w-0 shrink truncate ${bucketTextColor(row.bucket)}`}>{label}</span>
      {smellNote}
      <RowBadges
        row={row}
        settings={settings}
        importCounts={importCounts}
        graphDepth={graphDepths.get(row.file)}
        mounted={mountedFiles.has(row.file)}
      />
    </button>
  );
}

export function countSmells(rows: AuditRow[]): { ok: number; cross: number; audit: number } {
  const tsx = rows.filter((r) => r.file.endsWith('.tsx'));
  return {
    ok: tsx.filter((r) => r.bucket === 'colocated' || r.bucket === 'product').length,
    cross: tsx.filter((r) => r.bucket === 'cross-route').length,
    audit: tsx.filter((r) => r.bucket === 'shared-feature' || r.bucket === 'other').length,
  };
}

/** Counts for files imported downstream of the focus root (excludes the root itself). */
export function countDownstreamSmells(rows: AuditRow[], focusFile: string | undefined) {
  const downstream = focusFile ? rows.filter((row) => row.file !== focusFile) : rows;
  return countSmells(downstream);
}

export function FileTreePanel({
  rows,
  edges = [],
  entryFile,
  settings,
  graphDepths,
  mountedFiles,
  onSelectFile,
  onClearFocus,
  onHoverFile,
  focusFile,
}: FileTreePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tailPadPx, setTailPadPx] = useState(0);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (settings.smellsOnly && !['cross-route', 'shared-feature', 'other'].includes(row.bucket)) {
        return false;
      }
      if (settings.hideShared && row.bucket === 'shared') return false;
      if (settings.hideShared && row.bucket === 'logic') return false;
      return true;
    });
  }, [rows, settings.hideShared, settings.smellsOnly]);

  const { importedBy, importsOf } = useMemo(() => buildImportIndex(edges), [edges]);
  const tree = useMemo(() => {
    const built = buildFileTree(filtered);
    if (settings.sortSmellsFirst) sortFileTreeBySmells(built);
    return built;
  }, [filtered, settings.sortSmellsFirst]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleHover = (file: string | null) => {
    setHoveredFile(file);
    onHoverFile?.(file);
  };

  useEffect(() => {
    if (!focusFile) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const folder of ancestorFolderPaths(focusFile)) {
        next.delete(folder);
      }
      return next;
    });
  }, [focusFile]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !focusFile) {
      setTailPadPx(0);
      return;
    }
    setTailPadPx(scrollAuditFileToTop(scroller, focusFile));
  }, [collapsed, focusFile, filtered]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !focusFile || tailPadPx === 0) return;
    scrollAuditFileToTop(scroller, focusFile);
  }, [focusFile, tailPadPx]);

  if (filtered.length === 0) {
    return <p className="p-1 text-zinc-500">No files — try settings → smells only off</p>;
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto py-px leading-tight"
      style={tailPadPx > 0 ? { paddingBottom: tailPadPx } : undefined}
      onMouseLeave={() => handleHover(null)}
    >
      <div>
        {tree.children.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={0}
            collapsed={collapsed}
            toggle={toggle}
            focusFile={focusFile}
            onSelectFile={onSelectFile}
            onClearFocus={onClearFocus}
            onHoverFile={handleHover}
            importedBy={importedBy}
            importsOf={importsOf}
            entryFile={entryFile}
            hoveredFile={hoveredFile}
            settings={settings}
            graphDepths={graphDepths}
            mountedFiles={mountedFiles}
          />
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { buildFileTree, dominantBucket, type FileTreeNode } from '../core/buildFileTree.js';
import type { AuditBucket, AuditRow } from '../core/classify.js';
import {
  buildImportIndex,
  formatImporterSummary,
  importersOf,
  type ImportEdge,
} from '../core/importGraph.js';

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

function importerTooltip(file: string, importers: string[], entryFile?: string): string {
  if (importers.length === 0) {
    return entryFile && file === entryFile ? `${file}\npage entry` : `${file}\nno importers`;
  }
  return `${file}\n← ${importers.map((i) => i.split('/').pop()).join(', ')}`;
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
  onSelectFile?: (file: string) => void;
  onClearFocus?: () => void;
  onHoverFile?: (file: string | null) => void;
  selectedFile?: string;
  focusFile?: string;
  hideShared?: boolean;
}

function TreeNode({
  node,
  depth,
  collapsed,
  toggle,
  selectedFile,
  focusFile,
  onSelectFile,
  onClearFocus,
  onHoverFile,
  importedBy,
  entryFile,
  hoveredFile,
}: {
  node: FileTreeNode;
  depth: number;
  collapsed: Set<string>;
  toggle: (path: string) => void;
  selectedFile?: string;
  focusFile?: string;
  onSelectFile?: (file: string) => void;
  onClearFocus?: () => void;
  onHoverFile?: (file: string | null) => void;
  importedBy: Map<string, Set<string>>;
  entryFile?: string;
  hoveredFile: string | null;
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
                selectedFile={selectedFile}
                focusFile={focusFile}
                onSelectFile={onSelectFile}
                onClearFocus={onClearFocus}
                onHoverFile={onHoverFile}
                importedBy={importedBy}
                entryFile={entryFile}
                hoveredFile={hoveredFile}
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
  const importerLabel = formatImporterSummary(row.file, importers, entryFile, 2);

  if (isFocusRoot) {
    return (
      <div
        data-audit-file={row.file}
        className="flex items-center gap-0.5 bg-sky-500/25 py-px pr-0.5 ring-1 ring-inset ring-sky-400/70"
        style={{ paddingLeft: `${pad + 0.75}em` }}
        onMouseEnter={() => onHoverFile?.(row.file)}
      >
        <button
          type="button"
          title={importerTooltip(row.file, importers, entryFile)}
          onClick={() => onSelectFile?.(row.file)}
          className="min-w-0 flex-1 truncate text-left font-medium text-sky-100 hover:opacity-90"
        >
          {node.name}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClearFocus?.();
          }}
          className="shrink-0 rounded px-1 text-sky-300 hover:bg-sky-900/50 hover:text-white"
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
      title={importerTooltip(row.file, importers, entryFile)}
      onClick={() => onSelectFile?.(row.file)}
      onMouseEnter={() => onHoverFile?.(row.file)}
      className={`flex w-full items-center gap-1 py-px pr-0.5 text-left hover:bg-white/5 ${
        isHovered ? 'bg-white/[0.06]' : ''
      }`}
      style={{ paddingLeft: `${pad + 0.75}em` }}
    >
      <span className={`min-w-0 shrink truncate ${bucketTextColor(row.bucket)}`}>{node.name}</span>
      {isHovered ? (
        <span className="min-w-0 truncate text-zinc-600">← {importerLabel}</span>
      ) : null}
      {row.note ? <span className="ml-auto shrink-0 text-orange-400/70">!</span> : null}
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
  onSelectFile,
  onClearFocus,
  onHoverFile,
  selectedFile,
  focusFile,
  hideShared = true,
}: FileTreePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (hideShared && row.bucket === 'shared') return false;
      if (hideShared && row.bucket === 'logic') return false;
      return true;
    });
  }, [hideShared, rows]);

  const { importedBy } = useMemo(() => buildImportIndex(edges), [edges]);
  const tree = useMemo(() => buildFileTree(filtered), [filtered]);
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

  useEffect(() => {
    if (!focusFile || !scrollRef.current) return;
    const frame = requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector(
        `[data-audit-file="${CSS.escape(focusFile)}"]`,
      );
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusFile, filtered, collapsed]);

  if (filtered.length === 0) {
    return <p className="p-1 text-zinc-500">No files</p>;
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto py-px leading-tight"
      onMouseLeave={() => handleHover(null)}
    >
      {tree.children.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={0}
          collapsed={collapsed}
          toggle={toggle}
          selectedFile={selectedFile}
          focusFile={focusFile}
          onSelectFile={onSelectFile}
          onClearFocus={onClearFocus}
          onHoverFile={handleHover}
          importedBy={importedBy}
          entryFile={entryFile}
          hoveredFile={hoveredFile}
        />
      ))}
    </div>
  );
}

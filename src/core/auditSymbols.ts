import path from 'node:path';

import type { AuditRow } from './classify.js';

/** React display names a fiber may use for this module (static scan). */
export function extractSymbols(absPath: string, text: string): string[] {
  const symbols = new Set<string>();
  const base = path.basename(absPath).replace(/\.(tsx|ts)$/, '');
  symbols.add(base);

  const add = (name: string | undefined) => {
    if (
      name &&
      name !== 'function' &&
      name !== 'memo' &&
      name !== 'forwardRef' &&
      !name.startsWith('_')
    ) {
      symbols.add(name);
    }
  };

  for (const match of text.matchAll(/export\s+default\s+function\s+(\w+)/g)) add(match[1]);
  for (const match of text.matchAll(/export\s+default\s+(\w+)\s*;/g)) add(match[1]);
  for (const match of text.matchAll(/export\s+default\s+memo\s*\(\s*(?:function\s+)?(\w+)/g)) {
    add(match[1]);
  }
  for (const match of text.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) add(match[1]);
  for (const match of text.matchAll(/export\s+const\s+(\w+)/g)) add(match[1]);

  return [...symbols].sort();
}

/** All React display names that may refer to this audit row. */
export function symbolSetForRow(row: AuditRow): Set<string> {
  const symbols = new Set<string>([row.component]);
  for (const symbol of row.symbols ?? []) {
    symbols.add(symbol);
  }
  return symbols;
}

export function rowMatchesComponentName(row: AuditRow, componentName: string): boolean {
  if (row.component === componentName) return true;
  if (row.file.endsWith(`/${componentName}.tsx`) || row.file.endsWith(`/${componentName}.ts`)) {
    return true;
  }
  return row.symbols?.includes(componentName) ?? false;
}

export function rowsForComponentName(componentName: string, rows: AuditRow[]): AuditRow[] {
  return rows.filter((row) => rowMatchesComponentName(row, componentName));
}

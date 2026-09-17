'use client';

import { useEffect, useState } from 'react';

import type { AuditBucket, AuditRow } from '../core/classify.js';
import type { ImportEdge } from '../core/importGraph.js';

export type PageAuditCounts = Partial<Record<AuditBucket, number>>;

export type PageAuditByBucket = Partial<Record<AuditBucket, AuditRow[]>>;

export interface PageAuditResult {
  entry: string;
  routeRoot: string;
  counts: PageAuditCounts;
  suspects: AuditRow[];
  edges: ImportEdge[];
  all: PageAuditByBucket;
}

export interface UsePageAuditState {
  loading: boolean;
  error: string | null;
  data: PageAuditResult | null;
}

export type UsePageAuditOptions = {
  apiPath?: string;
};

export function usePageAudit(
  pathname: string | null,
  options: UsePageAuditOptions = {},
): UsePageAuditState {
  const apiPath = options.apiPath ?? '/api/dev/route-lens';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PageAuditResult | null>(null);

  useEffect(() => {
    if (!pathname) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }

    const path: string = pathname;
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${apiPath}?pathname=${encodeURIComponent(path)}`,
          { signal: controller.signal },
        );
        const body = (await res.json()) as PageAuditResult | { error?: string };

        if (cancelled) return;

        if (!res.ok) {
          const message =
            typeof body === 'object' && body !== null && 'error' in body
              ? String(body.error)
              : `Colocation audit failed (${res.status})`;
          setError(message);
          setData(null);
          return;
        }

        setData(body as PageAuditResult);
        setError(null);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiPath, pathname]);

  return { loading, error, data };
}

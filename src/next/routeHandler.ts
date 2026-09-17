import { NextRequest, NextResponse } from 'next/server';

import { auditPage } from '../core/audit.js';
import type { ColocationConfig } from '../core/config.js';
import { resolveConfig } from '../core/config.js';
import type { AuditRow } from '../core/classify.js';
import { pathnameToRoute } from './pathnameToRoute.js';

const BUCKET_ORDER = [
  'colocated',
  'product',
  'shared',
  'shared-feature',
  'cross-route',
  'other',
  'logic',
] as const;

function groupByBucket(rows: AuditRow[]): Record<string, AuditRow[]> {
  const grouped: Record<string, AuditRow[]> = {};
  for (const row of rows) {
    if (!grouped[row.bucket]) grouped[row.bucket] = [];
    grouped[row.bucket]!.push(row);
  }
  for (const bucket of BUCKET_ORDER) {
    grouped[bucket]?.sort((a, b) => a.file.localeCompare(b.file));
  }
  return grouped;
}

export type CreateColocationRouteOptions = ColocationConfig;

/**
 * Drop into `app/api/dev/route-lens/route.ts`:
 *
 * ```ts
 * import { createRouteLensHandler } from '@nathanham16/route-lens/next';
 * export const GET = createRouteLensHandler();
 * ```
 */
export function createRouteLensHandler(options: CreateColocationRouteOptions = {}) {
  return async function GET(req: NextRequest) {
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse(null, { status: 404 });
    }

    const routeParam = req.nextUrl.searchParams.get('route');
    const pathnameParam = req.nextUrl.searchParams.get('pathname');

    if (!routeParam && !pathnameParam) {
      return NextResponse.json(
        { error: 'Provide ?route=submissions/[id] or ?pathname=/submissions/abc' },
        { status: 400 },
      );
    }

    const config = resolveConfig(options);

    let routeArg: string;
    try {
      routeArg = routeParam ?? pathnameToRoute(pathnameParam!, config);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    try {
      const result = auditPage(routeArg, options);
      return NextResponse.json({
        entry: result.entry,
        routeRoot: result.routeRoot,
        counts: result.counts,
        suspects: result.suspects,
        edges: result.edges,
        all: groupByBucket(result.all),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

/** @deprecated Use `createRouteLensHandler` */
export const createColocationRouteHandler = createRouteLensHandler;

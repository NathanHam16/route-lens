/**
 * Minimal Next.js App Router wiring for route-lens.
 *
 * Copy the two blocks below into your app. Not runnable on its own.
 */

// ── 1. API route ─────────────────────────────────────────────────────────────
// File: app/api/dev/route-lens/route.ts

// import { createRouteLensHandler } from '@nathanham16/route-lens/next';
//
// export const GET = createRouteLensHandler();
//
// // Returns 404 outside development. Accepts:
// //   GET /api/dev/route-lens?pathname=/submissions/abc
// //   GET /api/dev/route-lens?route=submissions/[id]

// ── 2. Root providers ────────────────────────────────────────────────────────
// File: app/providers.tsx  (or wherever you mount client providers)

// 'use client';
//
// import { RouteLens } from '@nathanham16/route-lens/react';
//
// export function Providers({ children }: { children: React.ReactNode }) {
//   return (
//     <>
//       {process.env.NODE_ENV === 'development' && <RouteLens />}
//       {children}
//     </>
//   );
// }
//
// // Optional: custom API path if your route lives elsewhere
// // <RouteLens apiPath="/api/dev/route-lens" />

// ── Usage ────────────────────────────────────────────────────────────────────
// Run `npm run dev`, open any page, click **loc** (bottom-left) or Alt+Shift+C.

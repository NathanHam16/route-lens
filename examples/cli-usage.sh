#!/usr/bin/env bash
# route-lens CLI examples (repo-only docs — not executed here).
#
# Run from your Next.js project root (where src/app/... lives).
# See ../README.md for install and bucket semantics.

# Audit a route by App Router segment (resolves src/app/<route>/page.tsx)
npx @nathanham16/route-lens submissions/[id]

# Same audit, machine-readable JSON (includes counts, suspects, edges)
npx @nathanham16/route-lens submissions/[id] --json

# Only rows that look like colocation smells (cross-route, shared-feature, other)
npx @nathanham16/route-lens submissions/[id] --suspects-only

# Audit a specific page file instead of a route folder
npx @nathanham16/route-lens app/submissions/[id]/page.tsx

# Pipe JSON into jq for quick counts
npx @nathanham16/route-lens submissions/[id] --json | jq '.counts'

# If installed as a devDependency, the local bin works the same way:
# npx route-lens classes/[ClassId]/activities/[ActivityId] --suspects-only

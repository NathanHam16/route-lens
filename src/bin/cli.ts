import { auditPage } from '../core/audit.js';

function usage(): never {
  console.error(`Usage: route-lens <route-or-page> [--suspects-only] [--json]

Examples:
  route-lens submissions/[id]
  route-lens app/foo/page.tsx --json`);
  process.exit(1);
}

function main() {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const positional = argv.filter((a) => !a.startsWith('--'));
  if (positional.length === 0) usage();

  const entryArg = positional[0]!;
  const suspectsOnly = flags.has('--suspects-only');
  const json = flags.has('--json');

  const result = auditPage(entryArg);
  const show = suspectsOnly ? result.suspects : result.all;

  if (json) {
    console.log(JSON.stringify({ ...result, all: show }, null, 2));
    return;
  }

  console.log(`Colocation audit: ${result.entry}`);
  console.log(`Route root: ${result.routeRoot}/`);
  console.log(
    `${result.tsxComponents} components | ok ${(result.counts.colocated ?? 0) + (result.counts.product ?? 0)} | cross ${result.counts['cross-route'] ?? 0} | audit ${(result.counts['shared-feature'] ?? 0) + (result.counts.other ?? 0)}`,
  );
  console.log('');

  const order = ['colocated', 'product', 'shared', 'shared-feature', 'cross-route', 'other'];
  for (const bucket of order) {
    const group = show.filter((r) => r.bucket === bucket);
    if (group.length === 0) continue;
    console.log(`── ${bucket} (${group.length}) ──`);
    for (const row of group) {
      console.log(`  ${row.file}${row.note ? `  ← ${row.note}` : ''}`);
    }
    console.log('');
  }
}

try {
  main();
} catch (err) {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
}

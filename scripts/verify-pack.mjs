#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageName = '@nathanham16/route-lens';

let tempDir = null;
let tarballPath = null;

function cleanup() {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
  if (tarballPath && existsSync(tarballPath)) {
    rmSync(tarballPath, { force: true });
    tarballPath = null;
  }
}

function fail(message) {
  console.error(`verify-pack: FAIL — ${message}`);
  cleanup();
  process.exit(1);
}

try {
  console.log('verify-pack: running npm pack…');
  const packOutput = execSync('npm pack --silent', {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  const tarballName = packOutput.split('\n').at(-1)?.trim();
  if (!tarballName) {
    fail('npm pack did not print a tarball name');
  }

  tarballPath = join(repoRoot, tarballName);
  if (!existsSync(tarballPath)) {
    fail(`tarball not found: ${tarballPath}`);
  }
  console.log(`verify-pack: packed ${tarballName}`);

  tempDir = mkdtempSync(join(tmpdir(), 'route-lens-verify-'));
  writeFileSync(
    join(tempDir, 'package.json'),
    JSON.stringify({ name: 'route-lens-verify', private: true, type: 'module' }, null, 2),
  );

  console.log('verify-pack: installing tarball with peer deps…');
  execSync(`npm install "${tarballPath}" react react-dom next --silent`, {
    cwd: tempDir,
    stdio: 'inherit',
  });

  const installedRoot = join(tempDir, 'node_modules', packageName);
  const cliPath = join(installedRoot, 'dist', 'bin', 'cli.js');
  if (!existsSync(cliPath)) {
    fail(`missing ${cliPath}`);
  }
  console.log('verify-pack: dist/bin/cli.js exists');

  const importSpecs = [
    '@nathanham16/route-lens',
    '@nathanham16/route-lens/react',
    '@nathanham16/route-lens/next',
  ];
  writeFileSync(
    join(tempDir, 'verify-imports.mjs'),
    `import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const specs = ${JSON.stringify(importSpecs)};

for (const spec of specs) {
  const resolved = fileURLToPath(import.meta.resolve(spec));
  if (!existsSync(resolved)) {
    console.error(\`missing resolved file for \${spec}: \${resolved}\`);
    process.exit(1);
  }
  console.log(\`verify-pack: \${spec} -> \${resolved}\`);
}
`,
  );
  execSync('node verify-imports.mjs', { cwd: tempDir, stdio: 'inherit' });

  console.log('verify-pack: SUCCESS');
  cleanup();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
}

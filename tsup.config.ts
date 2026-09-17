import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'react/index': 'src/react/index.tsx',
      'next/index': 'src/next/index.ts',
    },
    format: ['esm'],
    dts: true,
    clean: true,
    external: ['react', 'react-dom', 'next', 'react-dev-inspector'],
  },
  {
    entry: { 'bin/cli': 'src/bin/cli.ts' },
    format: ['esm'],
    clean: false,
    external: ['react', 'react-dom', 'next', 'react-dev-inspector'],
    banner: { js: '#!/usr/bin/env node' },
  },
]);

import { defineConfig } from 'tsup';

/** Keep `import './styles.css'` in the bundle — CSS is built separately into dist/. */
function externalCssPlugin() {
  return {
    name: 'external-css',
    setup(build: import('esbuild').PluginBuild) {
      build.onResolve({ filter: /\.css$/ }, (args) => ({
        path: args.path,
        external: true,
      }));
    },
  };
}

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
    external: ['react', 'react-dom', 'next', 'react-dev-inspector', 'lucide-react'],
    esbuildPlugins: [externalCssPlugin()],
  },
  {
    entry: { 'bin/cli': 'src/bin/cli.ts' },
    format: ['esm'],
    clean: false,
    external: ['react', 'react-dom', 'next', 'react-dev-inspector', 'lucide-react'],
    banner: { js: '#!/usr/bin/env node' },
  },
]);

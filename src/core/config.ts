import type { AuditBucket } from './classify.js';

/** Default shared paths for any Next app — extend in colocation.config.ts */
export const DEFAULT_OK_PREFIXES = [
  'app/_components/',
  'app/providers.tsx',
  'components/ui/',
  'components/shared/',
  'components/copilot/',
  'features/',
  'lib/',
] as const;

export type ColocationConfig = {
  /** Project root (where package.json lives). Default: process.cwd() */
  rootDir?: string;
  /** Source root relative to rootDir. Default: `src` */
  srcDir?: string;
  /** Path alias prefix. Default: `@/` → srcDir */
  alias?: string;
  /** Paths always treated as shared (hidden by default in tree). */
  okPrefixes?: readonly string[];
  /**
   * When true: `app/foo/[id]` also allows `app/foo/_product/` as product (green).
   * Opt-in — not all apps use `_product` siblings.
   */
  productSibling?: boolean;
};

export type ResolvedColocationConfig = {
  rootDir: string;
  srcDir: string;
  srcAbs: string;
  alias: string;
  okPrefixes: readonly string[];
  productSibling: boolean;
};

export function resolveConfig(config: ColocationConfig = {}): ResolvedColocationConfig {
  const rootDir = config.rootDir ?? process.cwd();
  const srcDir = config.srcDir ?? 'src';
  return {
    rootDir,
    srcDir,
    srcAbs: `${rootDir}/${srcDir}`.replace(/\/+/g, '/'),
    alias: config.alias ?? '@/',
    okPrefixes: config.okPrefixes
      ? [...new Set([...DEFAULT_OK_PREFIXES, ...config.okPrefixes])]
      : DEFAULT_OK_PREFIXES,
    productSibling: config.productSibling ?? true,
  };
}

export type Classifier = {
  classify: (rel: string, routeRoot: string) => AuditBucket;
  smellNote: (rel: string, bucket: AuditBucket, routeRoot: string) => string;
};

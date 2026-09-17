export { auditPage, type PageAuditResult } from './core/audit.js';
export {
  type AuditBucket,
  type AuditRow,
  routeRootFromEntry,
  featureSiblingPrefix,
  createClassifier,
  classify,
  smellNote,
} from './core/classify.js';
export {
  type ColocationConfig,
  type ResolvedColocationConfig,
  DEFAULT_OK_PREFIXES,
  resolveConfig,
} from './core/config.js';
export {
  type ImportEdge,
  buildImportIndex,
  importSubtree,
  importersOf,
  formatImporterSummary,
  fileBasename,
} from './core/importGraph.js';
export { buildFileTree, dominantBucket, type FileTreeNode } from './core/buildFileTree.js';

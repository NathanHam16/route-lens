# Contributing to route-lens

Thank you for your interest in contributing to `@nathanham16/route-lens`. This project is released under the [MIT License](LICENSE).

## Getting started

```bash
git clone https://github.com/NathanHam16/route-lens.git
cd route-lens
npm ci
npm run build
```

Requirements: Node.js 22+ and npm 10+.

## Development

| Command | Purpose |
| --- | --- |
| `npm run build` | Compile TypeScript to `dist/` via tsup |
| `npm run dev` | Watch mode for local development |
| `npm run typecheck` | TypeScript check without emit |
| `npm test` | Vitest unit tests (core classify, import graph, file tree) |
| `npm run verify-pack` | Pack tarball and smoke-install exports |

Before opening a PR, run `npm run typecheck`, `npm test`, `npm run build`, and `npm run verify-pack`.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep changes focused. One logical change per PR.
3. Run `npm run build` locally.
4. Update [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]` for user-visible changes.
5. Open a PR against `main` with a clear description of what changed and why.

We review PRs for correctness, API stability, and fit with the project's scope (dev-only Next.js App Router colocation tooling).

## Code style

- **TypeScript, ESM only.** Source lives in `src/`; published output is `dist/`. Use `.js` extensions in relative imports (Node16/bundler resolution).
- **Strict typing.** `strict` and `noUncheckedIndexedAccess` are enabled. Avoid `any` and unsafe casts.
- **Minimal scope.** Prefer the smallest change that solves the problem. Do not refactor unrelated code in the same PR.
- **Public API.** Entry points are `@nathanham16/route-lens`, `@nathanham16/route-lens/react`, and `@nathanham16/route-lens/next`. Breaking changes require a major version bump and changelog entry.
- **Dev-only by design.** Features should remain safe to tree-shake or gate behind `NODE_ENV === 'development'` in consuming apps.

## Reporting issues

Use [GitHub Issues](https://github.com/NathanHam16/route-lens/issues) for bugs and feature requests. For security concerns, see [SECURITY.md](SECURITY.md).

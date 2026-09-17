# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-17

### Added

- Initial release of `@nathanham16/route-lens` as a scoped npm package (MIT license).
- **`RouteLens` widget** (`@nathanham16/route-lens/react`): dev-only overlay showing the current page's import tree, colored by colocation (green / red / orange). Draggable panel, inspect mode, keyboard shortcut (`Alt+Shift+C`).
- **`createRouteLensHandler`** (`@nathanham16/route-lens/next`): drop-in Next.js App Router `GET` handler for a dev API route that returns page-scoped audit data. Configurable `okPrefixes` and `productSibling` support.
- **CLI** (`route-lens` / `npx @nathanham16/route-lens`): audit a route or page from the terminal with `--json` and `--suspects-only` flags.
- **Core audit API** (`@nathanham16/route-lens`): `auditPage`, import graph utilities, and colocation classification for Next.js App Router layouts.

[Unreleased]: https://github.com/NathanHam16/route-lens/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/NathanHam16/route-lens/releases/tag/v0.1.0

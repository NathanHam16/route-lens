# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.4] - 2026-09-18

### Fixed

- **Focus isolation is strict:** with a file focused, inspect hover/click only resolves components in that file’s import subtree. Hovering elsewhere shows an amber **outside focus** badge instead of unrelated files like sidebar `RubricProse`.
- Inspect name resolution uses the filtered tree rows while focused.

## [0.2.3] - 2026-09-18

### Changed

- **Inspect toggle** in the panel header (plus `I` shortcut) — no longer buried in settings.
- **Smell counts** labeled `ok / cross / audit` instead of bare numbers.
- **Tree metadata** (lines, import counts) uses higher-contrast zinc-300 text.

### Fixed

- **Inspect resolution** respects tree focus: hovering inside a focused component prefers that file (or its container) over deeper leaf imports like `RubricProse` embedded in the card chrome.
- Removed confusing auto-preview boxes for the first child import when a file is focused.

## [0.2.2] - 2026-09-18

### Fixed

- **`resolveEntry`**: only accept `src/app/**/page.tsx` paths; reject `..` and arbitrary `.ts` files (closes path traversal via `?route=`).
- **`createRouteLensHandler`**: generic 500 on audit failure so server paths are not leaked in responses.
- **Default `okPrefixes`**: include `features/`; user `okPrefixes` merge with defaults instead of replacing them.
- **Inspect mode**: skip clicks on buttons, links, and form controls so the overlay does not swallow page interaction.

## [0.2.1] - 2026-09-17

### Fixed

- Ship bundled Tailwind CSS (`dist/react/styles.css`) so host apps that do not scan `node_modules` still get the dark panel theme and bucket colors.
- Solid panel background and higher-contrast folder labels for readability.

## [0.1.0] - 2026-09-17

### Added

- Initial release of `@nathanham16/route-lens` as a scoped npm package (MIT license).
- **`RouteLens` widget** (`@nathanham16/route-lens/react`): dev-only overlay showing the current page's import tree, colored by colocation (green / red / orange). Draggable panel, inspect mode, keyboard shortcut (`Alt+Shift+C`).
- **`createRouteLensHandler`** (`@nathanham16/route-lens/next`): drop-in Next.js App Router `GET` handler for a dev API route that returns page-scoped audit data. Configurable `okPrefixes` and `productSibling` support.
- **CLI** (`route-lens` / `npx @nathanham16/route-lens`): audit a route or page from the terminal with `--json` and `--suspects-only` flags.
- **Core audit API** (`@nathanham16/route-lens`): `auditPage`, import graph utilities, and colocation classification for Next.js App Router layouts.

[Unreleased]: https://github.com/NathanHam16/route-lens/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/NathanHam16/route-lens/releases/tag/v0.1.0

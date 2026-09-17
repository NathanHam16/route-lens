# Publishing @nathanham16/route-lens

This package publishes to the public npm registry. CI uses [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) via `.github/workflows/release.yml` so no long-lived npm token lives in GitHub Secrets.

## First publish (one-time, requires OTP)

The package must exist on npm **before** Trusted Publishing works from CI. Run this once from your machine:

```bash
npm publish --access public --otp=YOUR_6_DIGIT_CODE
```

After that, configure Trusted Publishing (below) and use the Release workflow for future versions.

We tried CI publish without a prior manual release — OIDC provenance succeeded but npm returned `404` (scoped package not yet created).

## Prerequisites

### 1. Enable 2FA on npm

npm requires two-factor authentication for maintainers who publish packages.

1. Sign in at [npmjs.com](https://www.npmjs.com/).
2. Open **Account** → **Security**.
3. Enable **Two-Factor Authentication** (authenticator app recommended).
4. Confirm you can sign in with your second factor before publishing.

Keep recovery codes somewhere safe. You will need 2FA (or an OTP) for manual publishes and for some account changes.

### 2. Configure Trusted Publishing

Link this GitHub repository to the npm package so GitHub Actions can publish without `NPM_TOKEN`.

1. Open [@nathanham16/route-lens](https://www.npmjs.com/package/@nathanham16/route-lens) on npm (you must be a package maintainer).
2. Go to **Settings** → **Trusted Publisher** → **GitHub Actions**.
3. Add a publisher with:
   - **Organization or user:** `NathanHam16`
   - **Repository:** `route-lens`
   - **Workflow filename:** `release.yml`
   - **Environment:** leave blank unless you later add a GitHub Environment gate to the workflow
4. Save.

The workflow requests `id-token: write` and runs `npm publish --access public --provenance`. npm verifies the OIDC token against this trusted publisher configuration.

## Automated publish (recommended)

### Option A — GitHub Release

1. Bump `version` in `package.json` and commit (follow semver; see below).
2. Tag the commit: `git tag v0.1.1` (tag should match the package version, with an optional `v` prefix stripped by npm).
3. Push the tag: `git push origin v0.1.1`.
4. Create a **GitHub Release** from that tag and publish it.

Publishing the release triggers `.github/workflows/release.yml`, which builds, verifies the tarball with `npm pack --dry-run`, and publishes with provenance.

### Option B — Manual workflow dispatch

1. Go to **Actions** → **Release** → **Run workflow**.
2. Optionally enter a **version** (e.g. `0.1.1`) to set the version in `package.json` for that run only (no git tag is created).
3. Run the workflow.

Prefer GitHub Releases for versioned, tagged releases. Use dispatch for ad-hoc publishes only when you understand the version in git may lag the published tarball.

## Manual publish (local, with OTP)

Use this when debugging publish issues or if CI is unavailable. Requires npm login and 2FA.

```bash
npm ci
npm run build
npm test          # optional until a test script exists
npm pack --dry-run
npm publish --access public --provenance --otp=123456
```

Replace `123456` with the one-time password from your authenticator app. npm prompts for OTP interactively if you omit `--otp`.

Do **not** store an npm automation token in the repo. Trusted Publishing is the supported path for CI.

## Semver policy

Follow [Semantic Versioning 2.0.0](https://semver.org/):

| Change | Bump | Example |
| --- | --- | --- |
| Breaking API or behavior | **MAJOR** | `1.0.0` → `2.0.0` |
| New backward-compatible feature | **MINOR** | `0.1.0` → `0.2.0` |
| Backward-compatible bug fix | **PATCH** | `0.1.0` → `0.1.1` |

While `0.x.y`, treat **MINOR** bumps as potentially breaking and **PATCH** as compatible fixes, per semver pre-1.0 guidance.

Before each release:

1. Update `version` in `package.json` (and `package-lock.json` via `npm install` if you changed deps).
2. Update `CHANGELOG.md` or release notes if you maintain one.
3. Ensure `dist/` is built (`npm run build`); the published tarball includes only `files` from `package.json` (`dist`, `README.md`, `LICENSE`).

Pre-release tags (optional): `1.0.0-beta.1`, `1.0.0-rc.1` — publish with `npm publish --tag beta` locally or extend the workflow if you need dist-tags in CI.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `403 Forbidden` / trusted publish error | Trusted Publisher not configured, wrong repo/workflow name, or npm account is not a maintainer |
| Version already exists | Bump semver in `package.json` before releasing |
| Provenance failed | Run on `ubuntu-latest` with `--provenance`; ensure `id-token: write` permission |
| `npm test` fails in CI | Expected until a test script exists; the workflow uses `continue-on-error` |

For npm Trusted Publishing docs: [docs.npmjs.com/trusted-publishers](https://docs.npmjs.com/trusted-publishers).

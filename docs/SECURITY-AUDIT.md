# Security Audit — Pre-Public Release

**Date:** 2026-09-17  
**Repository:** [NathanHam16/route-lens](https://github.com/NathanHam16/route-lens)  
**Branch audited:** `main` (10 commits, `git rev-list --all --count`)  
**Auditor:** Automated pre-release scan (Cursor agent)

---

## Commands run

### 1. Git history — primary secret patterns

```bash
cd /Users/nathanwang/Code/route-lens

git log --all -p | rg -i -n \
  'API_KEY|SECRET|password=|sk-[a-zA-Z0-9]{10,}|npm_[a-zA-Z0-9]{10,}|\.env|PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}'
```

Follow-up (false-positive filter — excludes `process.env`, npm package names, license boilerplate):

```bash
git log --all -p | rg -i \
  'API_KEY|SECRET|password=|sk-[a-zA-Z0-9]{10,}|npm_[a-zA-Z0-9]{10,}|PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}' \
  | rg -v 'process\.env|js-tokens|human_author|Co-authored|AUTHORS OR COPYRIGHT|schema_version'
```

### 2. Git history — extended patterns (internal URLs, tokens, keys)

```bash
git log --all -p | rg -i -n \
  'eyJ[a-zA-Z0-9_-]{20,}|supabase\.co|edexia\.ai|edexia|service_role|anon_key|SUPABASE|DATABASE_URL|postgres://|mongodb\+srv://|Bearer [a-zA-Z0-9._-]{20,}|xox[baprs]-|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
```

### 3. Git history — sensitive filenames

```bash
git log --all --name-only --pretty=format: | sort -u \
  | rg -i '\.env|credential|secret|\.pem|\.key|id_rsa|\.p12|\.pfx|\.keystore'
```

### 4. Current tree — secret patterns (excluding `node_modules/`)

```bash
rg -i -n \
  'API_KEY|SECRET|password=|sk-[a-zA-Z0-9]{10,}|npm_[a-zA-Z0-9]{10,}|\.env|PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{20,}|supabase\.co|edexia\.ai|service_role|SUPABASE|DATABASE_URL|postgres://|Bearer [a-zA-Z0-9._-]{20,}|xox[baprs]-|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' \
  --glob '!.git' --glob '!node_modules'
```

### 5. Current tree — `.env` and credential files

```bash
find . -name '.env*' -o -name 'credentials*' -o -name '*.pem' -o -name '*.key' -o -name 'id_rsa*' \
  | grep -v node_modules | grep -v '.git/'

git ls-files | rg -i '\.env|credential|\.pem|\.key|secret'
```

### 6. Current tree — internal / org references

```bash
rg -i -n 'edexia|supabase|localhost:[0-9]+|127\.0\.0\.1|internal|staging|prod' \
  --glob '!.git' --glob '!node_modules' --glob '!package-lock.json' --glob '!dist'
```

### 7. Untracked pre-release files (worktree at audit time)

Scanned `.github/`, `docs/`, `examples/`, `scripts/`, `test/`, `SECURITY.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, and `vitest.config.ts` with the same secret patterns as command 4.

---

## Findings

### Secrets

**No secrets found in git history.**

| Category | Result |
| --- | --- |
| API keys (`API_KEY`, `sk-`, `AKIA`, `ghp_`, `gho_`, `npm_`) | None |
| Passwords / private keys | None |
| JWT / bearer tokens | None |
| Database connection strings | None |
| Supabase keys or URLs | None |
| Slack / Google / AWS tokens | None |
| `.env` files (tracked or in working tree) | None |
| Credential / PEM / key files | None |

**Notes on benign matches:**

- `process.env.NODE_ENV` appears in source and history (dev-only guard). This matched the `.env` substring in the primary pattern but is not a credential leak.
- `LICENSE` contains `Copyright (c) 2026 Edexia` — intentional public copyright attribution, not a secret.
- `docs/PUBLISHING.md` mentions "GitHub Secrets" in prose when describing OIDC-based publishing (no token values).

### Internal URLs and organizational references

| Item | Severity | Detail |
| --- | --- | --- |
| `edexia-ai` GitHub org URL in git history | **Info** | Initial commit (`893e43d`) set `package.json` repository URL to `https://github.com/edexia-ai/next-colocation-widget`. Corrected to `NathanHam16/*` in commit `d57fe92`. The old URL remains in immutable git history — it is a public GitHub org name, not a credential. |
| `Edexia` copyright in `LICENSE` | **Info** | Public legal attribution. Appropriate for a package extracted from Edexia tooling. |
| Example route paths (`app/submissions/_product/`) | **Info** | Generic Next.js colocation examples in tests and docs. No hostnames, API endpoints, or environment-specific paths. |
| Maintainer email in commit metadata | **Info** | `Nathan Wang <nathan123wang@gmail.com>` in standard git author fields. Normal for open-source repos. |

No `edexia.ai` hostnames, Supabase project refs, staging/prod URLs, or localhost service endpoints were found in source or history.

### CI / publishing configuration (untracked at audit time)

`.github/workflows/release.yml` uses npm **Trusted Publishing (OIDC)** with `id-token: write` and `npm publish --provenance`. No `NPM_TOKEN` or other secrets are embedded in workflow files. This is the correct pattern for public npm releases.

---

## Recommendation

**Clear to publish** from a secrets perspective.

Optional hardening before or immediately after first public release:

1. **Add `.env` to `.gitignore`** — currently only `node_modules/`, `dist/`, `*.tsbuildinfo`, and `.DS_Store` are ignored. Adding `.env` and `.env.*` prevents accidental future commits of local env files.
2. **No history rewrite needed** — the `edexia-ai` GitHub URL in early commits is organizational provenance, not a secret. Rewriting history (`git filter-repo`) would add risk with no security benefit.
3. **Confirm npm Trusted Publishing** — ensure the trusted publisher entry for `NathanHam16/route-lens` / `release.yml` is live on npmjs.com before triggering the first release workflow (see `docs/PUBLISHING.md`).
4. **Keep dev-only guards** — source already gates the widget and API handler on `process.env.NODE_ENV !== 'development'`. Do not remove these before public release.

---

## Summary

| Check | Status |
| --- | --- |
| Git history secret scan | **Clean** |
| Working tree secret scan | **Clean** |
| `.env` / credential files | **None found** |
| Internal / sensitive URLs | **None found** (historical public GitHub org URL only) |

**No secrets found in git history.**

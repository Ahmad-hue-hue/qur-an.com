# GitHub Actions — Tajweed Platform

Repository: [Ahmad-hue-hue/qur-an.com](https://github.com/Ahmad-hue-hue/qur-an.com)  
Runs: [Actions tab](https://github.com/Ahmad-hue-hue/qur-an.com/actions)

## Overview

CI runs on every **push** and **pull request** to `main`. It validates the Next.js frontend before changes merge or deploy.

| Job | Runner | Purpose |
|-----|--------|---------|
| `frontend` | `ubuntu-latest` | Install deps → ESLint → **tests** → production build |

**Deploy is separate:** Vercel auto-deploys `frontend/` on push to `main` after CI passes (or in parallel). Database changes are applied manually via Supabase migrations.

## Workflow file

`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v6
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run test
      - run: bun run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
```

## Why placeholder Supabase env vars?

`next build` reads `NEXT_PUBLIC_*` at build time. CI does not need a real Supabase project — placeholders satisfy `isSupabaseConfigured()` checks so the build compiles without secrets.

Production values live in **Vercel** project settings, not GitHub Actions.

## Local parity

Run the same checks before pushing:

```bash
cd frontend
bun install
bun run lint
bun run test
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key \
bun run build
```

## Debugging failed runs

```bash
# List recent runs
gh run list --limit 10

# View a specific run
gh run view <run-id>

# Stream logs for a failed job
gh run view <run-id> --log-failed
```

Common failures:

| Error | Fix |
|-------|-----|
| ESLint / TypeScript errors | `cd frontend && bun run lint` locally |
| `next build` type errors | `bun run build` with placeholder env vars |
| Lockfile drift | Run `bun install` and commit `bun.lock` |
| `checkout@v4` Node deprecation | Use `actions/checkout@v6` (already on v6) |

## Secrets

This workflow uses **no GitHub secrets**. Optional secrets for future jobs:

| Secret | Use |
|--------|-----|
| `CURSOR_API_KEY` | Run Cursor Agent in CI ([docs](https://cursor.com/docs/cli/github-actions)) |
| `SUPABASE_ACCESS_TOKEN` | Automated migration checks (not configured yet) |

## MCP / agent workflow

When using Cursor agents on this repo:

1. **GitHub** — push, check `gh run list`, open PRs
2. **Supabase** — `apply_migration` after SQL changes
3. **Vercel** — confirm env vars and deployment after frontend push

See `.cursor/rules/mcp-workflow.mdc`.

## Extending CI (ideas)

Not implemented yet; add when needed:

- **Supabase migration lint** — verify new files in `supabase/migrations/` are applied on the linked project
- **Edge function deploy** — `supabase functions deploy` on `main`
- **Cursor docs agent** — auto-update docs on PRs ([cookbook](https://cursor.com/docs/cli/github-actions))

## Related links

- [GitHub Actions docs](https://docs.github.com/en/actions)
- [setup-bun action](https://github.com/oven-sh/setup-bun)
- [Cursor CLI in GitHub Actions](https://cursor.com/docs/cli/github-actions)
- [Vercel production](https://qur-an-com.vercel.app)

# GitHub Actions docs

Read and follow `.github/ACTIONS.md` in this repository.

When the user asks about CI, workflows, or GitHub Actions:

1. Read `.github/workflows/ci.yml` and `.github/ACTIONS.md`
2. Check recent runs with `gh run list --limit 5` and `gh run view <id> --log-failed` if debugging
3. Match local commands: `cd frontend && bun run lint && bun run build` with placeholder Supabase env vars
4. Remind: deploy is Vercel (frontend), migrations are Supabase MCP — not part of the current CI job

Do not add GitHub secrets unless the user explicitly requests Cursor Agent or Supabase automation in CI.

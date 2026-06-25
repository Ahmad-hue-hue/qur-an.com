# TDD (test-driven development)

Follow red → green → refactor for this project.

## Stack

- **Runner:** Bun built-in test (`bun:test`) — no Jest/Vitest
- **Location:** `frontend/lib/**/*.test.ts` next to the module under test
- **CI:** `bun run test` in `.github/workflows/ci.yml`

## Workflow

1. **Red** — Write a failing test for the smallest behavior slice
2. **Green** — Implement the minimum code to pass
3. **Refactor** — Clean up without changing behavior; keep tests green

## What to test

| Good | Skip |
|------|------|
| Pure functions in `lib/` | Supabase RPC / RLS (use SQL migrations + manual checks) |
| Formatters, validators, grading logic | Full page components unless logic is extracted |
| `registration-number.ts`, `utils.ts`, `exercise-grading.ts` | Trivial one-liners with no branches |

## Commands

```bash
cd frontend
bun test              # run all tests
bun test --watch      # watch mode while developing
bun test lib/registration-number.test.ts  # single file
```

## Before finishing a feature

1. Add or update tests for new pure logic
2. Run `bun test && bun run lint && bun run build`
3. Push — CI runs the same test step

## Extract before testing UI

If logic lives in a React component, move it to `lib/*.ts` first, then test the extracted function.

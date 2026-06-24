# Tajweed Platform — Frontend

Next.js app for students and admins. Data is served by **Supabase** (no separate Django server).

## Setup

1. Complete [../supabase/README.md](../supabase/README.md) (project, migrations, admin user).
2. Install and run:

```bash
bun install
cp .env.example .env.local
bun dev
```

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Routes

| Path | Description |
|---|---|
| `/login` | Student login (email + password) |
| `/register` | Student registration |
| `/dashboard` | Student home |
| `/admin` | Admin dashboard |

## Scripts

```bash
bun dev      # development server
bun run lint
bun run build
```

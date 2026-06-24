# Tajweed Academy

Islamic Tajweed Learning & Assessment Platform.

Students learn through structured Marḥalah courses, complete topics, and take exercises and exams. Admins manage students, lessons, and assessments from a built-in admin panel.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind v4, Shadcn UI, Hugeicons, TanStack Query |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Runtime | Bun (frontend) |
| CI | GitHub Actions (frontend lint/build) |

## Quick Start

### 1. Supabase

Follow [supabase/README.md](supabase/README.md) to:

1. Create a Supabase project
2. Apply SQL migrations from `supabase/migrations/`
3. Deploy edge functions (`create-student`, `delete-student`)
4. Promote your first admin user in SQL

### 2. Frontend

```bash
cd frontend
bun install
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key
bun dev
```

App: `http://localhost:3000`

### Environment

`frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Portals

| Role | URL | Access |
|---|---|---|
| Student login | `/login` | Email + password |
| Student signup | `/register` | Email, password, name, phone |
| Student app | `/dashboard` | Dashboard, topics, exercises, profile |
| Admin login | `/admin/login` | Admin email + password |
| Admin panel | `/admin` | Content, students, assessments |

## First-time setup

1. Register at `/register` or create a user in Supabase Auth
2. Promote to admin in SQL:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

3. Sign in at `/admin/login`
4. Add lessons, exercises, and students from the admin panel

Migrations seed the 4 Marḥalah stages automatically.

## Project structure

```
frontend/          Next.js app (student + admin UI)
supabase/
  migrations/      Postgres schema, RLS, RPC functions
  functions/       Edge functions (create/delete student)
```

## Development

```bash
cd frontend && bun run lint && bun run build
```

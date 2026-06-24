# Supabase setup for Tajweed Platform

**Linked project:** `pwurwwbwlfguptuovlav` (Tajweed Platform, eu-west-1)

## 1. Create a Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Copy **Project URL** and **anon key** from Settings → API

## 2. Configure the frontend

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Apply database migrations

### Option A — Supabase Dashboard

1. Open SQL Editor in your Supabase project
2. Run each file in `supabase/migrations/` in order (000001 → 000006)

### Option B — Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 4. Deploy Edge Functions (admin student management)

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase functions deploy create-student
supabase functions deploy delete-student
```

## 5. Create the first admin user

1. Sign up a user via `/register` (or Supabase Auth dashboard)
2. In SQL Editor, promote them to admin:

```sql
update public.profiles
set role = 'admin'
where email = 'your-admin@email.com';
```

## 6. Run the frontend

```bash
cd frontend
bun install
bun run dev
```

- Student app: [http://localhost:3000](http://localhost:3000)
- Sign in (students & admins): [http://localhost:3000/login](http://localhost:3000/login)

## 7. Deploy on Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add **Environment Variables** (Production + Preview):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pwurwwbwlfguptuovlav.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key from Supabase → Settings → API |

4. Redeploy after saving env vars

**Live app:** https://qur-an-com.vercel.app

If env vars are missing, the app shows a configuration error instead of a blank page.

For a custom domain (`qur-an.com`), add it in Vercel → Domains and point DNS to Vercel.

## Storage buckets

Migrations create public buckets:

- `lesson-audio` — MP3 lesson files
- `lesson-pdfs` — PDF lesson files

Only admins can upload; all authenticated users can read published lesson URLs.

## Postgres best practices

Migration `20250614000006_indexes_and_rls_performance.sql` applies [Supabase Postgres best practices](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations):

- Indexes on all foreign key columns (faster joins and cascades)
- Partial index on published topics by marhalah
- RLS policies use `(select auth.uid())` and `(select public.is_admin())` for per-statement caching

Migration `20250614000007_security_hardening.sql` locks down RPC execute permissions (revokes anon access) and removes storage listing policies on public buckets.

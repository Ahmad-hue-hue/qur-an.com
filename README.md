# Tajweed Academy

Islamic Tajweed Learning & Assessment Platform.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4, Shadcn UI, Hugeicons, TanStack Query
- **Backend:** Django + DRF (planned), PostgreSQL, JWT

## Getting Started

### Frontend (Bun)

```bash
cd frontend
bun install
cp .env.example .env.local   # optional — mock mode works out of the box
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Backend API base URL |
| `NEXT_PUBLIC_USE_MOCK` | `true` | Use mock data when backend is unavailable |

## Routes

| Path | Description |
|---|---|
| `/dashboard` | Student dashboard |
| `/marhalah/[id]` | Marḥalah topics |
| `/topics/[id]` | Topic detail |
| `/assessments` | Exercises & exams |
| `/exercises/[id]` | Exercise attempt |
| `/profile` | Student profile |
| `/admin` | Admin dashboard |

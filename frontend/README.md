# Tajweed Academy Frontend

Next.js app for the Tajweed Learning & Assessment Platform.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS v4
- Shadcn UI + Hugeicons
- TanStack Query

## Setup

```bash
cd frontend
bun install
cp .env.example .env.local
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

Make sure the Django backend is running on port 8000.

## Environment

`.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_USE_MOCK=false
```

## Routes

### Student

| Route | Description |
|---|---|
| `/login` | Student login (name + phone) |
| `/register` | Student self-registration |
| `/dashboard` | Student home |
| `/marhalah/[id]` | Marḥalah topics |
| `/topics/[id]` | Lesson detail |
| `/assessments` | Exercises and exams |
| `/exercises/[id]` | Take an exercise |
| `/profile` | Student profile |

### Admin

| Route | Description |
|---|---|
| `/admin` | Admin dashboard (open in local dev) |
| `/admin/students` | Student management |
| `/admin/students/new` | Register a student |
| `/admin/students/[id]` | Edit, suspend, promote, delete student |
| `/admin/topics` | Manage lessons by Marḥalah |
| `/admin/lessons/new` | Add a new lesson |
| `/admin/lessons/[id]` | Edit a lesson |
| `/admin/exercises` | Exercise management |
| `/admin/exams` | Exam management |

## Scripts

```bash
bun dev      # Development server
bun run build   # Production build
bun run lint    # ESLint
bun start    # Start production server
```

## Project Layout

```
frontend/
├── app/
│   ├── (student)/     # Authenticated student pages
│   ├── (admin)/       # Admin panel
│   └── (auth)/        # Login and register
├── components/
│   ├── auth/          # Login UI, guards
│   ├── layout/        # App shell, nav
│   └── shared/        # Shared dialogs, etc.
├── hooks/             # Auth hooks
└── lib/
    ├── api/           # API client and endpoints
    └── auth/          # JWT token helpers
```

## Demo Login

After backend seed data:

- **Student:** Ahmad Hassan / 966501234567 at `/login`
- **Admin panel:** go directly to `/admin` (no login needed in local dev)

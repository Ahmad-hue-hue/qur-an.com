# Tajweed Academy

Islamic Tajweed Learning & Assessment Platform.

Students learn through structured Marḥalah courses, complete topics, and take exercises and exams. Admins manage students, lessons, and assessments from a built-in admin panel.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind v4, Shadcn UI, Hugeicons, TanStack Query |
| Backend | Django 6, DRF, JWT, PostgreSQL (SQLite for local dev) |
| Runtime | Bun (frontend), uv (backend) |
| CI | GitHub Actions (backend tests + frontend lint/build) |

## Quick Start

Both servers must be running for the app to work.

### Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run python manage.py migrate
uv run python manage.py seed_data
uv run python manage.py runserver
```

API: `http://localhost:8000/api/`

### Frontend

```bash
cd frontend
bun install
cp .env.example .env.local
bun dev
```

App: `http://localhost:3000`

### Environment

`frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_USE_MOCK=false
```

## Portals

| Role | URL | Access |
|---|---|---|
| Student login | `/login` | Full name + phone (no password) |
| Student signup | `/register` | Self-registration with name + phone |
| Student app | `/dashboard` | Dashboard, topics, exercises, profile |
| Admin panel | `/admin` | Open in local dev (no login required when `DEBUG=True`) |

`/admin/login` redirects to `/admin`.

## Demo Data (after `seed_data`)

| Role | Credentials |
|---|---|
| Student | **Ahmad Hassan** / **966501234567** |
| Admin (optional) | **admin@tajweed.academy** / **admin12345** |

New students can also sign up at `/register` with any name and phone number.

## Student Features

- Dashboard with progress and current Marḥalah
- Topic lessons with Arabic text, audio, and PDF
- Exercises (MCQ) and exams with scheduled windows
- Profile and assessment history
- Registration number assigned on first exercise attempt (or by admin)

## Admin Features

Open **http://localhost:3000/admin** in local development.

| Section | What you can do |
|---|---|
| **Dashboard** | View stats and quick actions |
| **Students** | List, search, register, edit, suspend, promote, assign registration number manually, delete |
| **Content** | Add/edit/delete lessons with audio and PDF uploads |
| **Assessments** | Create and delete exercises and exams |

Destructive actions (delete student, lesson, exercise, exam) require confirmation.

## Business Rules

- 4 Marḥalah stages with score-based unlock thresholds
- Weighted final scores (exercises, exam, halaqah, tadreeb)
- Students sign in with full name + phone only
- Admin API is open when Django `DEBUG=True` (local development)

## CI/CD

GitHub Actions runs on every push/PR to `main`:

- **Backend:** Django checks, migrations, tests
- **Frontend:** ESLint, production build

Workflow file: `.github/workflows/ci.yml`

## Project Structure

```
tajweed-platform/
├── .github/workflows/   # CI pipeline
├── frontend/            # Next.js app
│   ├── app/
│   │   ├── (student)/   # Student routes
│   │   ├── (admin)/     # Admin panel
│   │   └── (auth)/      # Login & register
│   └── lib/api/         # API client
└── backend/             # Django REST API
    ├── accounts/        # Users, auth, admin students
    ├── courses/         # Marḥalah, topics, completions
    └── assessments/     # Exercises, exams, scores
```

## Repository

https://github.com/Ahmad-hue-hue/qur-an.com

See also:

- [backend/README.md](./backend/README.md) — API reference
- [frontend/README.md](./frontend/README.md) — frontend development

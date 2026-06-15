# Tajweed Academy

Islamic Tajweed Learning & Assessment Platform.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind v4, Shadcn UI, Hugeicons, TanStack Query |
| Backend | Django 6, DRF, JWT, PostgreSQL (SQLite for local dev) |
| Runtime | Bun (frontend), uv (backend) |

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run python manage.py migrate
uv run python manage.py seed_data
uv run python manage.py runserver
```

### Frontend

```bash
cd frontend
bun install
cp .env.example .env.local
# Set NEXT_PUBLIC_USE_MOCK=false to use real API
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

## Default Accounts

| Role | Login | Demo |
|---|---|---|
| Student | Full name + phone | Ahmad Hassan / `966501234567` |
| Admin | Email + password | admin@tajweed.academy / admin12345 |

## Features

- 4 Marḥalah stages with unlock thresholds
- Topic lessons with Arabic text, audio, PDF
- Exercises (MCQ + written) with date windows
- Exams with duration and scheduling
- Manual Halaqah & Tadreeb scores
- Weighted final score calculation
- Registration number assigned on first exercise attempt
- Student dashboard, assessments, profile
- Admin panel for students, topics, lessons

## Project Structure

```
tajweed-platform/
├── frontend/     # Next.js app
└── backend/      # Django REST API
```

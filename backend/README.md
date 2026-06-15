# Tajweed Academy Backend

Django REST API for the Tajweed Learning & Assessment Platform.

## Stack

- Django 6 + DRF
- JWT (SimpleJWT)
- PostgreSQL (SQLite fallback for local dev)
- Media storage for MP3/PDF uploads

## Setup (uv)

```bash
cd backend
cp .env.example .env
uv sync
uv run python manage.py migrate
uv run python manage.py seed_data
uv run python manage.py runserver
```

API runs at `http://localhost:8000/api/`

## Default accounts (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@tajweed.academy | admin12345 |
| Student | ahmad@example.com | student123 |

## PostgreSQL

Set in `.env`:

```
DB_NAME=tajweed_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

Leave `DB_NAME` empty to use SQLite.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Student registration |
| POST | `/api/auth/login/` | JWT login |
| GET | `/api/student/dashboard/` | Student dashboard |
| GET | `/api/student/profile/` | Student profile |
| GET | `/api/student/marhalahs/` | Marḥalah list |
| GET | `/api/student/marhalahs/{id}/topics/` | Topics |
| GET | `/api/student/topics/{id}/` | Topic detail |
| POST | `/api/student/topics/{id}/complete/` | Mark complete |
| GET | `/api/student/exercises/` | Exercises |
| POST | `/api/student/exercises/{id}/submit/` | Submit exercise |
| GET | `/api/admin/stats/` | Admin stats |
| GET | `/api/admin/students/` | Student list |
| GET | `/api/admin/topics/` | Topic management |

## Connect Frontend

In `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_USE_MOCK=false
```

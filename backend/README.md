# Tajweed Academy Backend

Django REST API for the Tajweed Learning & Assessment Platform.

## Stack

- Django 6 + Django REST Framework
- JWT (SimpleJWT)
- PostgreSQL (SQLite fallback when `DB_NAME` is empty)
- Media storage for MP3/PDF lesson uploads
- CORS enabled for `localhost:3000` and `127.0.0.1:3000`

## Setup

```bash
cd backend
cp .env.example .env
uv sync
uv run python manage.py migrate
uv run python manage.py seed_data
uv run python manage.py runserver
```

API base URL: `http://localhost:8000/api/`

Django admin (optional): `http://localhost:8000/admin/`

## Auth

| Role | Endpoint | Body |
|---|---|---|
| Student register | `POST /api/auth/student/register/` | `{ "name", "phone" }` |
| Student login | `POST /api/auth/student/login/` | `{ "name", "phone" }` |
| Admin login | `POST /api/auth/admin/login/` | `{ "email", "password" }` |
| Token refresh | `POST /api/auth/refresh/` | `{ "refresh" }` |

Students authenticate with **full name + phone** (no password). Admins use **email + password**.

When `DEBUG=True`, admin endpoints allow unauthenticated access for local development.

## Seed Data

```bash
uv run python manage.py seed_data
```

Creates demo admin, student, Marḥalahs, topics, exercises, and exams.

| Role | Login |
|---|---|
| Student | Ahmad Hassan / 966501234567 |
| Admin | admin@tajweed.academy / admin12345 |

## PostgreSQL

Set in `.env`:

```
DB_NAME=tajweed_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

Leave `DB_NAME` empty to use SQLite (`backend/db.sqlite3`).

## API Endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/student/register/` | Student self-registration |
| POST | `/api/auth/student/login/` | Student login (name + phone) |
| POST | `/api/auth/admin/login/` | Admin login (email + password) |
| POST | `/api/auth/refresh/` | Refresh JWT access token |

### Student

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/student/dashboard/` | Dashboard data |
| GET | `/api/student/profile/` | Student profile |
| GET | `/api/student/marhalahs/` | Marḥalah list with progress |
| GET | `/api/student/marhalahs/{id}/topics/` | Topics for a Marḥalah |
| GET | `/api/student/topics/{id}/` | Topic detail |
| POST | `/api/student/topics/{id}/complete/` | Mark topic complete |
| GET | `/api/student/exercises/` | Exercises for current Marḥalah |
| GET | `/api/student/exercises/{id}/` | Exercise detail |
| GET | `/api/student/exercises/{id}/questions/` | Exercise questions |
| POST | `/api/student/exercises/{id}/submit/` | Submit exercise answers |
| GET | `/api/student/exams/` | Exams for current Marḥalah |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats/` | Dashboard statistics |
| GET/POST | `/api/admin/students/` | List / create students |
| GET/PATCH/DELETE | `/api/admin/students/{id}/` | View / update / delete student |
| POST | `/api/admin/students/{id}/assign-registration/` | Auto-assign registration number |
| GET/POST | `/api/admin/topics/` | List / create topics (lessons) |
| GET/PATCH/DELETE | `/api/admin/topics/{id}/` | View / update / delete topic |
| GET/POST | `/api/admin/exercises/` | List / create exercises |
| GET/PATCH/DELETE | `/api/admin/exercises/{id}/` | View / update / delete exercise |
| GET/POST | `/api/admin/exercises/{id}/questions/` | List / add exercise questions |
| GET/POST | `/api/admin/exams/` | List / create exams |
| GET/PATCH/DELETE | `/api/admin/exams/{id}/` | View / update / delete exam |
| GET/POST | `/api/admin/exams/{id}/questions/` | List / add exam questions |

Topic create/update accepts `multipart/form-data` for audio and PDF uploads.

## Tests

```bash
uv run python manage.py test accounts assessments
```

## Connect Frontend

In `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_USE_MOCK=false
```

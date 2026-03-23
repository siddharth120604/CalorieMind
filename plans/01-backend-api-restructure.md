# Plan 01: Backend API Restructure

**Status:** Completed
**Date:** 2026-03-22

## Goal

Convert the monolithic Flask app (server-rendered Jinja2 templates) into a REST API backend that returns JSON only, ready for a separate frontend SPA.

## Previous Architecture

```
CalorieMind/
├── app.py              # Flask app + db init (single file)
├── models.py           # All 5 models in one file
├── routes.py           # 963 lines — all routes in single Blueprint
├── ai_service.py       # Groq LLM integration
├── utils.py            # Summary helpers
├── main.py             # Entry point
├── templates/          # 9 Jinja2 HTML templates
├── static/             # CSS, JS assets
├── Dockerfile
├── docker-compose.yml
└── scripts/
```

**Problems:**
- All routes in one 963-line file
- Session-based auth (cookies) — not suitable for SPA/mobile
- Routes mixed HTTP concerns with business logic
- No API versioning
- No CORS support
- Tightly coupled to server-rendered templates

## New Architecture

```
backend/
├── app.py              # App factory with CORS, blueprints, error handlers
├── main.py             # Entry point (gunicorn target: backend.main:app)
├── config.py           # Centralized config (DB, JWT, admin email)
├── extensions.py       # Shared SQLAlchemy db instance
├── models/             # Split into individual files
│   ├── __init__.py     # Re-exports all models
│   ├── user.py         # User model + to_dict() + BMR calculation + daily_calorie_target
│   ├── meal.py         # Meal model + to_dict()
│   ├── activity.py     # Activity model + to_dict()
│   ├── daily_report.py # DailyReport model + to_dict()
│   └── notification.py # Notification model + to_dict()
├── api/                # 7 Flask Blueprints
│   ├── __init__.py     # Exports all blueprints
│   ├── auth.py         # /api/v1/auth/*
│   ├── profile.py      # /api/v1/profile
│   ├── meals.py        # /api/v1/meals/*
│   ├── activities.py   # /api/v1/activities/*
│   ├── reports.py      # /api/v1/reports/*
│   ├── admin.py        # /api/v1/admin/*
│   └── notifications.py # /api/v1/notifications/*
├── services/           # Business logic (decoupled from HTTP)
│   ├── ai_service.py   # Groq LLM (parse meals, activities, generate reports)
│   ├── auth_service.py # JWT token creation/verification (PyJWT)
│   ├── meal_service.py # Meal CRUD + AI parsing
│   ├── activity_service.py # Activity CRUD + AI parsing
│   ├── report_service.py   # Report generation + CRUD
│   └── summary_service.py  # Daily/weekly/monthly aggregation
├── middleware/
│   └── auth.py         # jwt_required, admin_required decorators
└── utils/
    └── timezone.py     # IST/UTC day boundary helpers
```

## API Endpoints

### Auth (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | None | Register new user |
| POST | `/login` | None | Login, get JWT tokens |
| POST | `/refresh` | Refresh token | Get new access token |
| POST | `/logout` | Access token | Client-side logout |

### Profile (`/api/v1/profile`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | jwt_required | Get current user profile |
| PUT | `/` | jwt_required | Update profile |

### Meals (`/api/v1/meals`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | jwt_required | List today's meals (?date=YYYY-MM-DD) |
| POST | `/` | jwt_required | Add meal (AI-parsed) |
| GET | `/<id>` | jwt_required | Get single meal |
| DELETE | `/<id>` | jwt_required | Delete meal |
| POST | `/<id>/repeat` | jwt_required | Duplicate meal |

### Activities (`/api/v1/activities`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | jwt_required | List today's activities (?date=YYYY-MM-DD) |
| POST | `/` | jwt_required | Add activity (AI-parsed) |
| GET | `/<id>` | jwt_required | Get single activity |
| DELETE | `/<id>` | jwt_required | Delete activity |

### Reports (`/api/v1/reports`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/daily` | jwt_required | Daily summary (?date=) |
| GET | `/daily/view` | jwt_required | Full daily view (summary + meals + activities + report) |
| POST | `/daily/generate` | jwt_required | Generate AI daily report |
| GET | `/weekly` | jwt_required | Weekly chart data (?end_date=) |
| GET | `/monthly` | jwt_required | Monthly chart data (?year=&month=) |
| GET | `/` | jwt_required | List all saved reports |
| GET | `/<id>` | jwt_required | Single report with meals/activities |

### Admin (`/api/v1/admin`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pending` | admin_required | List pending users |
| POST | `/approve/<user_id>` | admin_required | Approve user |
| POST | `/reject/<user_id>` | admin_required | Reject (delete) user |
| POST | `/promote/<user_id>` | admin_required | Promote to admin |
| GET | `/users` | admin_required | List all users |

### Notifications (`/api/v1/notifications`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | jwt_required | List notifications (?unread_only=true) |
| POST | `/<id>/read` | jwt_required | Mark as read |

## Key Design Decisions

1. **PyJWT over flask-jwt-extended** — Less magic, ~60 lines of code, full control over token lifecycle.
2. **No token blocklist (v1)** — Logout is client-side. Access tokens expire in 1 hour. Redis blocklist can be added later.
3. **`/api/v1/` prefix** — API versioning from day one.
4. **Services layer** — Business logic decoupled from HTTP. Routes are thin: validate input, call service, format response.
5. **Zero DB schema changes** — Same tables, same columns. Full backward compatibility with existing data.
6. **IST timezone handling preserved** — Centralized in `utils/timezone.py`.

## Standard Error Response

```json
{
    "error": "Human-readable message",
    "code": "MACHINE_READABLE_CODE"
}
```

Error codes: `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS` (401), `AUTH_REQUIRED` (401), `TOKEN_EXPIRED` (401), `ACCOUNT_PENDING` (403), `FORBIDDEN` (403), `NOT_FOUND` (404), `EMAIL_EXISTS` (409), `AI_ERROR` (500), `INTERNAL_ERROR` (500).

## JWT Token Structure

**Access Token** (1 hour):
```json
{"sub": user_id, "email": "...", "role": "...", "type": "access", "iat": ..., "exp": ...}
```

**Refresh Token** (30 days):
```json
{"sub": user_id, "type": "refresh", "iat": ..., "exp": ...}
```

## Infrastructure Changes

| File | Change |
|------|--------|
| `requirements.txt` | Added `PyJWT>=2.9.0`, `flask-cors>=5.0.0` |
| `Dockerfile` | CMD → `python3 -m backend.main` |
| `docker-compose.yml` | gunicorn target → `backend.main:app` |
| `scripts/init_and_migrate.sh` | Import path updated for fresh schema creation |
| `pyproject.toml` | Name → `caloriemind`, version → `0.2.0`, added new deps |
| `.env` | New optional var: `JWT_SECRET_KEY` (falls back to `SESSION_SECRET`) |

## Files Removed

- `app.py`, `routes.py`, `models.py`, `utils.py`, `ai_service.py`, `main.py` (root level)
- `templates/` (9 Jinja2 HTML files)
- `static/` (CSS, JS assets)

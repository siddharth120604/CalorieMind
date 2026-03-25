# Plan 02: Frontend SPA (React)

**Status:** Completed
**Date:** 2026-03-22

## Goal

Build a React SPA frontend that consumes the `/api/v1/*` backend API, replacing the old server-rendered Jinja2 templates.

## Decisions Made

- [x] **Build tool**: Vite
- [x] **Language**: TypeScript
- [x] **CSS framework**: Tailwind CSS v4 (dark theme)
- [x] **State management**: Redux Toolkit
- [x] **Routing**: React Router v6
- [x] **HTTP client**: Axios (with JWT interceptors + auto-refresh)
- [x] **Charts**: Chart.js via react-chartjs-2

## Final Structure

```
frontend/
├── public/
├── src/
│   ├── api/                    # API client layer
│   │   ├── client.ts           # Axios instance with JWT auth + refresh interceptor
│   │   ├── auth.ts             # login, register, refresh, logout
│   │   ├── profile.ts          # GET/PUT profile
│   │   ├── meals.ts            # CRUD meals
│   │   ├── activities.ts       # CRUD activities
│   │   ├── reports.ts          # Daily/weekly/monthly reports
│   │   ├── admin.ts            # Admin user management
│   │   └── notifications.ts    # Notification management
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── AppLayout.tsx   # Main shell (Navbar + Sidebar + Outlet)
│   │   │   ├── Navbar.tsx      # Top nav with user info + logout
│   │   │   ├── Sidebar.tsx     # Desktop side navigation
│   │   │   ├── MobileNav.tsx   # Bottom tab bar for mobile
│   │   │   └── ProtectedRoute.tsx # Auth guard wrapper
│   │   ├── Charts/
│   │   │   ├── WeeklyChart.tsx # Line chart (consumed/burned/net)
│   │   │   └── MacroChart.tsx  # Doughnut chart (protein/carbs/fats)
│   │   └── Common/
│   │       ├── Alert.tsx       # Success/error/info alert
│   │       └── LoadingSpinner.tsx
│   ├── pages/
│   │   ├── Login.tsx           # Login form
│   │   ├── Register.tsx        # Registration form
│   │   ├── Dashboard.tsx       # KPIs, charts, progress bar, daily report
│   │   ├── Meals.tsx           # Meal list + add/delete/repeat
│   │   ├── Activities.tsx      # Activity list + add/delete
│   │   ├── Profile.tsx         # Profile setup/edit form
│   │   ├── Reports.tsx         # Saved reports list
│   │   ├── ReportDetail.tsx    # Single report + day's meals/activities
│   │   └── Admin.tsx           # Pending users, all users, notifications (tabbed)
│   ├── store/
│   │   ├── index.ts            # Redux store configuration
│   │   └── authSlice.ts        # Auth state (user, tokens, login/register/fetchProfile thunks)
│   ├── hooks/
│   │   └── useAppDispatch.ts   # Typed dispatch + selector hooks
│   ├── utils/
│   │   └── types.ts            # TypeScript interfaces (User, Meal, Activity, etc.)
│   ├── App.tsx                 # Router setup with protected routes
│   ├── main.tsx                # Entry point (Provider + StrictMode)
│   └── index.css               # Tailwind import
├── Dockerfile                  # Multi-stage: node build → nginx serve
├── nginx.conf                  # Reverse proxy /api/ to backend, SPA fallback
├── package.json
├── tsconfig.json
└── vite.config.ts              # Vite config with Tailwind plugin + dev proxy
```

## Pages Built

| Page | Route | Features |
|------|-------|----------|
| Login | `/login` | Email/password form, error handling, redirect on success |
| Register | `/register` | Registration form, pending user flow, password match validation |
| Dashboard | `/dashboard` | 4 KPI cards, progress bar vs daily calorie target, weekly line chart, macro doughnut, AI report |
| Meals | `/meals` | Today's summary stats, add meal (AI-parsed), meal list with repeat/delete |
| Activities | `/activities` | Today's burned/duration stats, add activity (AI-parsed), activity list with delete |
| Profile | `/profile` | Full profile form, BMR + daily calorie target display, auto-redirect after first setup |
| Reports | `/reports` | Chronological list of saved AI reports, click to view detail |
| Report Detail | `/reports/:id` | Full report content, day's summary stats, meals + activities list |
| Admin | `/admin` | 3-tab panel: pending users (approve/reject), all users (promote), notifications |

## Auth Flow

1. Login → API returns `access_token` + `refresh_token` → stored in localStorage
2. Axios interceptor adds `Authorization: Bearer <token>` to every request
3. On 401 response → interceptor tries refresh with `refresh_token`
4. If refresh succeeds → retry original request with new token
5. If refresh fails → clear tokens, redirect to `/login`

## Component Architecture

```
App
├── BrowserRouter
│   ├── /login → Login (public)
│   ├── /register → Register (public)
│   └── ProtectedRoute → AppLayout
│       ├── Navbar (top)
│       ├── Sidebar (left, desktop)
│       ├── <Outlet> → page content
│       └── MobileNav (bottom, mobile)
```

## Docker Integration

- `frontend/Dockerfile`: Multi-stage build (Node 20 → Nginx Alpine)
- `frontend/nginx.conf`: Proxies `/api/` to `web:8080`, SPA fallback for all other routes
- Added `frontend` service to root `docker-compose.yml` on port 3000

## Dev Setup

```bash
cd frontend
npm install
npm run dev    # Starts on http://localhost:3000 with proxy to :8080
```

Vite dev server proxies `/api/*` to `http://localhost:8080` for local development.

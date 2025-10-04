# Hostel Management System

A full-stack Node.js application for managing hostel room allocation, maintenance, notifications, fees, and admin dashboards.

## Features

- Authentication with roles: Student, Warden, SuperAdmin
- Room allocation and active allotment tracking
- Maintenance requests, schedules, and expenses
- Student finance: fees, payments, and printable receipts
- Notifications center with unseen badge and modal
- Admin dashboards: analytics, reports, and security summary (audit-based)

## Tech Stack

- Backend: Node.js + Express, Supabase Postgres (via @supabase/supabase-js)
- Frontend: HTML, CSS, Vanilla JavaScript (served statically by Express)
- Deployment: Render (render.yaml)

Note: Any Python/Flask references in older docs are obsolete. The app is fully Node/Express.

## Project Structure

```
HostelManagement/
├── backend/
│   ├── config/            # supabase client and db helpers
│   ├── middleware/        # auth middleware
│   ├── models/            # data access helpers per table
│   ├── routes/            # Express routes (auth, student, superadmin, etc.)
│   ├── services/          # domain logic (AuthService, SettingsService)
│   └── server.js          # Express server (serves frontend/ and mounts APIs)
├── frontend/
│   ├── static/css/        # styles
│   ├── static/js/         # dashboard logic and helpers
│   ├── admin-dashboard.html
│   ├── student-dashboard.html
│   ├── warden-dashboard.html
│   ├── login.html
│   └── register.html
├── database/
│   ├── schema.sql         # schema reference (context only)
│   └── migrations/        # SQL migrations
├── render.yaml            # Render deployment config (Node service)
├── package.json           # root scripts (installs backend deps, starts server)
└── README.md
```

## Setup

1. Node 18+ required.
2. Install dependencies from repo root:
    - This will install the backend dependencies via the postinstall script in package.json.
3. Create `backend/.env` from `backend/.env.example` and configure:
    - SUPABASE_URL
    - SUPABASE_SERVICE_ROLE_KEY
    - JWT_SECRET
    - (Optional) SUPABASE_DB_URL for direct pg access
4. Start the app:
    - Development: run from repo root: `npm run dev` (proxies to backend dev script)
    - Production: `npm start`

The server runs on PORT (default 3000) and serves the frontend at `/` with APIs under `/api/*`.

## Deployment (Render)

- render.yaml defines a Node web service.
- Environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET) should be set in Render.

## Notes

- The file `database/schema.sql` is for reference and not meant to be executed as-is.
- Legacy Python files (like `requirements.txt`) are not used by this Node app and can be removed.

## License

ISC
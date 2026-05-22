# CrashApp — Public Bug & Outage Tracker

A fullstack platform where developers can report outages and bugs they're experiencing with popular tools, upvote existing reports, and search for known problems.

## Live URLs

- **Frontend:** https://industrious-presence-production-53fa.up.railway.app
- **Backend API:** https://crashapp-production-c2e3.up.railway.app

## Database Schema

### users

| Column     | Type               | Notes                         |
| ---------- | ------------------ | ----------------------------- |
| id         | SERIAL PRIMARY KEY |                               |
| name       | VARCHAR(100)       |                               |
| email      | VARCHAR(255)       | UNIQUE                        |
| password   | TEXT               | nullable (Google OAuth users) |
| google_id  | VARCHAR(255)       | nullable                      |
| avatar_url | TEXT               | nullable                      |
| created_at | TIMESTAMP          | DEFAULT NOW()                 |

### reports

| Column         | Type               | Notes                    |
| -------------- | ------------------ | ------------------------ |
| id             | SERIAL PRIMARY KEY |                          |
| user_id        | INTEGER            | FK → users               |
| tool_name      | VARCHAR(100)       |                          |
| title          | VARCHAR(255)       |                          |
| description    | TEXT               |                          |
| severity       | VARCHAR(20)        | Low/Medium/High/Critical |
| status         | VARCHAR(20)        | Ongoing/Resolved         |
| screenshot_url | TEXT               | nullable                 |
| created_at     | TIMESTAMP          | DEFAULT NOW()            |
| updated_at     | TIMESTAMP          | DEFAULT NOW()            |

### upvotes

| Column    | Type               | Notes                          |
| --------- | ------------------ | ------------------------------ |
| id        | SERIAL PRIMARY KEY |                                |
| report_id | INTEGER            | FK → reports ON DELETE CASCADE |
| user_id   | INTEGER            | FK → users ON DELETE CASCADE   |
| created_at| TIMESTAMP          | DEFAULT NOW()                  |

**Constraint:** `UNIQUE(report_id, user_id)` — one upvote per user per report, enforced at the database level.

## API Endpoints (13 total)

| Method | Path                        | Auth | Description                          |
| ------ | --------------------------- | ---- | ------------------------------------ |
| POST   | /api/auth/register          | No   | Register new user                    |
| POST   | /api/auth/login             | No   | Login, returns JWT                   |
| GET    | /api/auth/google            | No   | Initiate Google OAuth                |
| GET    | /api/auth/google/callback   | No   | Google OAuth callback                |
| GET    | /api/reports                | No   | Get all reports (ordered by upvotes) |
| GET    | /api/reports/search?q=      | No   | Search reports by keyword            |
| GET    | /api/reports/:id            | No   | Get a single report                  |
| POST   | /api/reports                | Yes  | Create a new report                  |
| PUT    | /api/reports/:id            | Yes  | Edit a report (owner only)           |
| DELETE | /api/reports/:id            | Yes  | Delete a report (owner only)         |
| POST   | /api/reports/:id/upvote     | Yes  | Upvote a report                      |
| DELETE | /api/reports/:id/upvote     | Yes  | Remove upvote                        |
| GET    | /api/users/:id              | No   | Get user profile and their reports   |

## Setup Instructions

### Prerequisites

- Node.js v18+
- A PostgreSQL database (Supabase recommended)
- Cloudinary account (for screenshot uploads)
- Google Cloud Console project with OAuth 2.0 credentials

### 1. Clone the repo

```bash
git clone <repo-url>
cd Crashapp
```

### 2. Backend environment variables

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
JWT_SECRET=<long-random-string>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
NODE_ENV=development
```

### 3. Frontend environment variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

### 4. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 5. Create database tables

Run the SQL below against your PostgreSQL database (via Supabase SQL editor or psql):

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT,
  google_id VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tool_name VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low','Medium','High','Critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'Ongoing' CHECK (status IN ('Ongoing','Resolved')),
  screenshot_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE upvotes (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);
```

### 6. Seed the database

```bash
cd backend
node seed.js
```

This creates 5 users, 12 reports across 6 tools (Vercel, GitHub, Supabase, AWS, Cloudinary, npm), and realistic upvote data.

### 7. Run the app

In one terminal:

```bash
cd backend && npm run dev
```

In another terminal:

```bash
cd frontend && npm run dev
```

Frontend runs on http://localhost:5173, backend on http://localhost:5000.

## Known Limitations

- Screenshot upload is supported on report creation only (not on edit).
- Google OAuth requires the callback URL to be registered in Google Cloud Console — see the Authorized Redirect URIs section for the exact URL.
- Rate limiting uses in-memory storage; limits reset on server restart and are not shared across multiple instances.
- Search uses PostgreSQL full-text search (`to_tsvector`); very short queries (1–2 characters) may return no results.

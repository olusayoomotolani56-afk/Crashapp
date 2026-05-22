# CrashReport — Pre-Submission Audit Guide for Claude Code

You are auditing **CrashReport**, a fullstack bug/outage tracker built with Node.js + Express (backend) + React (frontend), PostgreSQL via Supabase, Cloudinary for media, JWT + Google OAuth for auth, and deployed on Railway.

Work through every section below **in order**. For each item, check the actual code/config — do not assume anything is working just because it was built. Flag every issue you find with a severity label: 🔴 **BLOCKING** (will fail grading or crash in production), 🟡 **IMPORTANT** (partial credit loss or UX breakage), 🟢 **POLISH** (minor improvement).

---

## Context You Need to Know

### Deployment URLs
- **Frontend**: `https://industrious-presence-production-53fa.up.railway.app`
- **Backend**: `https://crashapp-production-c2e3.up.railway.app`

### Google OAuth — Already Fixed
The Google OAuth was broken and has been resolved. The fix involved:
- Rotating the leaked Google Client Secret (old one was committed to the public repo)
- Adding the Railway frontend URL to **Authorized JavaScript Origins** in Google Cloud Console
- Adding `https://crashapp-production-c2e3.up.railway.app/api/auth/google/callback` to **Authorized Redirect URIs**
- Updating Railway backend env vars: `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`, `BACKEND_URL`
- Confirming frontend env var `VITE_API_URL = https://crashapp-production-c2e3.up.railway.app`

**Do not re-break this.** When checking auth code, verify the Passport.js callback URL in the backend config matches exactly: `https://crashapp-production-c2e3.up.railway.app/api/auth/google/callback`

---

## SECTION 1 — Repository & Environment Hygiene

### 1.1 .gitignore
- [ ] Confirm `.env` is in `.gitignore` and has NOT been committed at any point in git history
- [ ] Run `git log --all --full-history -- .env` — if it shows commits, flag as 🔴 BLOCKING (the secret was already leaked; confirm the new secret rotation happened per the OAuth fix above)
- [ ] Check that `node_modules/`, `dist/`, `.DS_Store` are ignored

### 1.2 Environment Variables
Confirm all these variables exist and are correctly named in both Railway services:

**Backend (Railway - Crashapp service):**
```
DATABASE_URL          (Supabase connection string)
JWT_SECRET            (strong random string, not "secret" or "mysecret")
GOOGLE_CLIENT_ID      (starts with 124381518980-...)
GOOGLE_CLIENT_SECRET  (the NEW rotated secret, not the leaked one)
FRONTEND_URL          https://industrious-presence-production-53fa.up.railway.app
BACKEND_URL           https://crashapp-production-c2e3.up.railway.app
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
NODE_ENV              production
PORT                  (whatever Railway uses, or let Railway set it)
```

**Frontend (Railway - admin.crashapp service):**
```
VITE_API_URL    https://crashapp-production-c2e3.up.railway.app
```

- [ ] Check the backend code uses `process.env.FRONTEND_URL` (not a hardcoded localhost) for the CORS origin and OAuth callback redirect
- [ ] Check the backend code uses `process.env.BACKEND_URL` (not hardcoded) when constructing the Google OAuth `callbackURL` in Passport config

### 1.3 README.md
The README must include:
- [ ] Project description
- [ ] Database schema diagram (screenshot or draw.io embed/link)
- [ ] All 13 API endpoints listed
- [ ] Setup instructions (env vars, install steps, how to run backend and frontend)
- [ ] How to run the seed file
- [ ] Both live deployment URLs (frontend + backend)
- [ ] Any known limitations

---

## SECTION 2 — Database

### 2.1 Schema Check
Open `seed.js` or `seed.sql` and the migration/init files. Verify these tables exist with correct structure:

**users table** — must have: `id`, `name`, `email`, `password` (nullable for OAuth users), `google_id` (nullable), `created_at`

**reports table** — must have: `id`, `user_id` (FK → users), `tool_name`, `title`, `description`, `severity` (enum: Low/Medium/High/Critical), `status` (enum: Ongoing/Resolved), `screenshot_url` (nullable), `created_at`

**upvotes table** — must have: `id`, `report_id` (FK → reports ON DELETE CASCADE), `user_id` (FK → users ON DELETE CASCADE), `created_at`, and critically:
```sql
UNIQUE (report_id, user_id)
```
- [ ] Confirm the UNIQUE constraint exists — this is worth grading points
- [ ] Confirm ON DELETE CASCADE on both FKs in upvotes

### 2.2 Upvote Count Query
Find where reports are fetched (likely `controllers/reportController.js` or similar). The upvote count must be computed via JOIN/COUNT, NOT from a stored column:

```sql
SELECT reports.*, COUNT(upvotes.id) AS upvote_count, users.name AS author_name
FROM reports
LEFT JOIN upvotes ON reports.id = upvotes.report_id
JOIN users ON reports.user_id = users.id
GROUP BY reports.id, users.name
ORDER BY upvote_count DESC;
```
- [ ] Confirm no `upvote_count` column on the reports table
- [ ] Confirm the ORDER BY is `upvote_count DESC` by default

### 2.3 has_upvoted Boolean
When a logged-in user fetches the feed, the response for each report must include a `has_upvoted` boolean (true if the current user has upvoted that report):
- [ ] Find this logic — it should check `WHERE report_id = $1 AND user_id = $2` in the upvotes table
- [ ] Confirm it returns `false` (not null/undefined) for unauthenticated requests

### 2.4 Seed Data
- [ ] Seed file has **at least 10 reports** across **at least 5 different tools**
- [ ] Mix of severity levels (Low, Medium, High, Critical)
- [ ] Mix of statuses (Ongoing, Resolved)
- [ ] Fictional users with realistic upvote counts
- [ ] README documents how to run the seed (`node seed.js` or `psql < seed.sql`)

---

## SECTION 3 — Authentication

### 3.1 Email/Password Auth
- [ ] Password hashing: `bcrypt.hash()` on registration, `bcrypt.compare()` on login
- [ ] JWT issued on both register and login with `user.id` in the payload
- [ ] JWT_SECRET comes from `process.env.JWT_SECRET` (never hardcoded)
- [ ] JWT expiry set (e.g. `expiresIn: '7d'`)

### 3.2 Auth Middleware
- [ ] `authMiddleware.js` (or equivalent) extracts Bearer token from `Authorization` header
- [ ] Verifies with `jwt.verify()` and attaches decoded user to `req.user`
- [ ] Returns `401` for missing/invalid token, not a 500 crash

### 3.3 Google OAuth (Passport.js)
- [ ] `passport-google-oauth20` strategy configured
- [ ] `callbackURL` is set to `process.env.BACKEND_URL + '/api/auth/google/callback'` — NOT hardcoded
- [ ] On success: find user by `google_id` OR email; if not found, create new user
- [ ] After Google auth: redirects to `process.env.FRONTEND_URL` with JWT as query param (e.g. `?token=...`) OR sets a cookie
- [ ] Frontend reads the token from the URL and stores it in localStorage on the OAuth callback landing

### 3.4 Routes
- [ ] `GET /api/auth/google` — initiates OAuth
- [ ] `GET /api/auth/google/callback` — handles callback (matches the URI registered in Google Cloud Console exactly)
- [ ] `POST /api/auth/register` — public
- [ ] `POST /api/auth/login` — public

---

## SECTION 4 — Reports API

### 4.1 All 13 Endpoints
Verify each endpoint exists and works:

| Method | Path | Auth | Check |
|--------|------|------|-------|
| POST | /api/auth/register | No | ☐ |
| POST | /api/auth/login | No | ☐ |
| GET | /api/auth/google | No | ☐ |
| GET | /api/auth/google/callback | No | ☐ |
| GET | /api/reports | No | ☐ |
| GET | /api/reports/search?q= | No | ☐ |
| GET | /api/reports/:id | No | ☐ |
| POST | /api/reports | Yes | ☐ |
| PUT | /api/reports/:id | Yes (owner only) | ☐ |
| DELETE | /api/reports/:id | Yes (owner only) | ☐ |
| POST | /api/reports/:id/upvote | Yes | ☐ |
| DELETE | /api/reports/:id/upvote | Yes | ☐ |
| GET | /api/users/:id | No | ☐ |

### 4.2 Authorization Logic
- [ ] `PUT /api/reports/:id` — returns `403` if `req.user.id !== report.user_id`
- [ ] `DELETE /api/reports/:id` — same ownership check
- [ ] `POST /api/reports/:id/upvote` — returns `400` if user tries to upvote their own report
- [ ] `POST /api/reports/:id/upvote` — returns `409 Conflict` (with message) when duplicate upvote hits the DB constraint (catch the unique violation error code — Postgres error code `23505`)

### 4.3 HTTP Status Codes
Every endpoint must return appropriate codes. Spot check:
- [ ] Successful creation → `201`
- [ ] Successful fetch → `200`
- [ ] Not found → `404`
- [ ] Unauthorized (no token) → `401`
- [ ] Forbidden (wrong user) → `403`
- [ ] Duplicate upvote → `409`
- [ ] Rate limited → `429`
- [ ] Server error → `500` (with generic message, not stack trace)

### 4.4 Error Response Format
All errors must return JSON: `{ "error": "message here" }` — never raw strings or HTML error pages.

---

## SECTION 5 — Media Upload

- [ ] Multer configured to handle `multipart/form-data`, field name consistent with frontend form
- [ ] Cloudinary upload happens server-side using the Cloudinary Node SDK
- [ ] `screenshot_url` stored in reports table as the Cloudinary URL
- [ ] Reports without screenshot are accepted (screenshot field is optional, not required)
- [ ] Cloudinary credentials come from environment variables, never hardcoded

---

## SECTION 6 — Search & Filtering

Find the search/filter logic (likely in `GET /api/reports` with query params and/or `GET /api/reports/search`):

- [ ] Keyword search (`?q=`) searches across `tool_name`, `title`, AND `description` (use `ILIKE` or `to_tsvector`)
- [ ] Filter by status (`?status=Ongoing` or `?status=Resolved`)
- [ ] Filter by tool name (`?tool=vercel`)
- [ ] Filters can be combined (e.g. `?q=deploy&status=Ongoing`)
- [ ] `?sort=recent` supported (orders by `created_at DESC` instead of upvote count)
- [ ] If no results: returns empty array `[]` with `200`, not a 404

---

## SECTION 7 — Rate Limiting

Check `index.js` or wherever `express-rate-limit` is configured:

| Route | Expected Limit | Check |
|-------|---------------|-------|
| POST /api/auth/register | 10 req/hour/IP | ☐ |
| POST /api/auth/login | 10 req/15min/IP | ☐ |
| POST /api/reports | 10 req/hour/user ID (not just IP) | ☐ |
| POST /api/reports/:id/upvote | 50 req/hour/user ID | ☐ |
| All other routes | 100 req/15min/IP | ☐ |

For authenticated rate-limited routes:
- [ ] `keyGenerator` uses `req.user?.id || req.ip` (not just IP)
- [ ] Error response on 429 is a readable JSON message, not a default HTML page

---

## SECTION 8 — CORS

- [ ] CORS origin includes both `http://localhost:5173` (dev) and `https://industrious-presence-production-53fa.up.railway.app` (production)
- [ ] `credentials: true` is set (needed for cookie-based flows if applicable)
- [ ] The origin list uses `process.env.FRONTEND_URL` for the production URL, not hardcoded

Example correct config:
```js
app.use(cors({
  origin: ['http://localhost:5173', process.env.FRONTEND_URL],
  credentials: true
}));
```

---

## SECTION 9 — React Frontend

### 9.1 Pages & Routing
Confirm all required pages exist and are routed correctly:

| Page | Path | Check |
|------|------|-------|
| Feed | `/` | ☐ |
| Single Report | `/reports/:id` | ☐ |
| Search Results | `/search?q=keyword` | ☐ |
| Sign Up | `/register` | ☐ |
| Log In | `/login` | ☐ |
| File Report | `/reports/new` (auth protected) | ☐ |
| Edit Report | `/reports/:id/edit` (owner only) | ☐ |
| User Profile | `/users/:id` | ☐ |

### 9.2 Auth Flow
- [ ] JWT stored in `localStorage` on login/register
- [ ] Axios instance uses an interceptor to attach `Authorization: Bearer <token>` to all authenticated requests
- [ ] React Context (or equivalent) manages the logged-in user globally
- [ ] Protected routes redirect unauthenticated users to `/login`
- [ ] Google OAuth: after redirect back, token extracted from URL params and stored in localStorage

### 9.3 Report Cards
Each report card in the feed must show:
- [ ] Tool name
- [ ] Title
- [ ] Severity badge (color-coded: Low=green, Medium=yellow, High=orange, Critical=red)
- [ ] Status badge (Ongoing / Resolved)
- [ ] Upvote count
- [ ] Author name
- [ ] Timestamp (formatted, not raw ISO string)

### 9.4 Upvote Button
- [ ] Shows **filled** state if `has_upvoted === true`, unfilled otherwise
- [ ] Clicking upvote/un-upvote updates state immediately (optimistic update or refetch) — **no full page refresh**
- [ ] Disabled or redirects to login if user is not authenticated
- [ ] Does not appear on user's own reports (or is disabled with appropriate message)

### 9.5 Loading & Error States
- [ ] Loading spinner/skeleton shown while fetching data
- [ ] Error message shown if API request fails (not a blank page or unhandled crash)
- [ ] Empty state shown when search returns no results

### 9.6 VITE_API_URL Usage
- [ ] Axios base URL uses `import.meta.env.VITE_API_URL` (not hardcoded localhost)
- [ ] Fallback to `http://localhost:5000` for local dev is acceptable

---

## SECTION 10 — Documentation & Submission Files

### 10.1 Required Files in Repo Root
- [ ] `README.md` (thorough — see Section 1.3 checklist)
- [ ] `.gitignore` (with `.env` listed)
- [ ] `seed.js` or `seed.sql`
- [ ] Postman collection JSON (`*.postman_collection.json` or similar)

### 10.2 Postman Collection
- [ ] Every one of the 13 endpoints has an example request
- [ ] Auth endpoints include example request bodies
- [ ] Protected endpoints include an example Authorization header (with placeholder token)
- [ ] Upvote and un-upvote both covered

### 10.3 Code Comments
- [ ] Upvote controller is commented (explaining the deduplication logic and 409 handling)
- [ ] The main upvote COUNT query is commented (explaining why no counter column)
- [ ] `has_upvoted` logic is commented
- [ ] Auth middleware is commented

---

## SECTION 11 — Deployment Verification

Test the live URLs directly:

### Backend Health
- [ ] `GET https://crashapp-production-c2e3.up.railway.app/api/reports` — returns JSON array (not HTML 502/503)
- [ ] `GET https://crashapp-production-c2e3.up.railway.app/api/reports/1` — returns a report or 404, not a crash
- [ ] CORS headers present on responses (check `Access-Control-Allow-Origin` in response headers)

### Frontend Health
- [ ] `https://industrious-presence-production-53fa.up.railway.app` loads the app
- [ ] Feed displays seeded reports with upvote counts
- [ ] Search bar works on production
- [ ] Login with email/password works on production
- [ ] **Login with Google works on production** (this was the bug that was fixed — retest it)
- [ ] Filing a new report (with and without screenshot) works on production
- [ ] Upvoting works on production

### Google OAuth Final Check
After confirming the OAuth fix steps were completed:
- [ ] Click "Login with Google" on the live frontend
- [ ] Select a Google account
- [ ] You are redirected back to the app and logged in (not stuck on a callback page or error)
- [ ] Check `DevTools → Network` if it fails and report the failing URL + status code

---

## SECTION 12 — Final Submission Checklist (from project spec)

Go through the official submission checklist and mark each item:

- [ ] Database schema diagram in README (showing UNIQUE constraint)
- [ ] All 13 API endpoints implemented and working
- [ ] Email/password auth works
- [ ] Google OAuth works
- [ ] Reports can be created with and without screenshot
- [ ] Upvote system: one per user per report, no self-upvoting
- [ ] Un-upvote works
- [ ] Feed ordered by upvote count by default
- [ ] `has_upvoted` boolean returned correctly in feed response
- [ ] Upvote button state reflects correctly on frontend without page refresh
- [ ] Severity badges color-coded correctly
- [ ] Keyword search + status/tool filters work and can be combined
- [ ] Rate limiting active and returns readable error messages
- [ ] Edit and delete are owner-restricted (enforced on backend)
- [ ] Database seeded with 10+ reports across 5+ tools
- [ ] `seed.js` or `seed.sql` in repo and documented in README
- [ ] Postman collection included
- [ ] `.env` in `.gitignore` and NOT committed
- [ ] Backend live on Railway, frontend live on Railway
- [ ] Both live URLs in README
- [ ] Meaningful commit history on GitHub

---

## How to Report Your Findings

After completing the audit, summarise:

1. **🔴 BLOCKING issues** — list each with file name + line number if possible
2. **🟡 IMPORTANT issues** — list each with suggested fix
3. **🟢 POLISH items** — quick wins before submission
4. **Overall readiness**: Ready to submit / Needs fixes first

Fix all 🔴 items before submitting. Address as many 🟡 items as you can.

# FinanceHub SQLite

React frontend, Express API, and a libSQL database — either hosted on
[Turso](https://turso.tech) or a local file for offline development.

## Project layout

The runnable app uses these folders:

```text
server/   Express API on http://localhost:3001
client/   Vite app on http://localhost:5173
```

## Database: Turso or local file

`server/db.js` picks the database target from environment variables:

- If `TURSO_DATABASE_URL` is set (and `TURSO_AUTH_TOKEN`, for a hosted DB),
  the app talks to that Turso database.
- If `TURSO_DATABASE_URL` is **not** set, it falls back to a local file at
  `local.db` in the project root — no network or Turso account needed for
  local development.

### Running migrations

Schema is created with idempotent `CREATE TABLE IF NOT EXISTS` statements, so
it's always safe to run:

```powershell
npm.cmd run migrate
```

This runs against whichever target your `.env` currently points at (Turso if
`TURSO_DATABASE_URL` is set, otherwise the local file). The server also runs
this automatically on startup.

### Creating the initial user

```powershell
npm.cmd run create-user
```

Works the same as before, just now against the async client — see
[Authentication](#authentication) below.

### Copying existing local data to Turso

If you already have a local `server/financehub.db` (the old better-sqlite3
file) with real data in it, copy it into Turso once:

```powershell
npm.cmd run copy-to-turso
```

This requires `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` to be set in `.env`. It
reads every table from the local file and inserts rows into Turso with
`INSERT OR IGNORE`, so it's safe to re-run — rows that already exist (matched
by primary key) are left untouched. It prints a per-table copied/skipped
summary when done. Pass a path as the first argument to use a different
source file: `node server/copy-local-to-turso.js path/to/other.db`.

## Run locally

From the project root:

```powershell
npm.cmd install
cd client
npm.cmd install
cd ..
npm.cmd run dev
```

If PowerShell blocks `npm`, use `npm.cmd` exactly as shown above.

Backend health check:

```text
http://localhost:3001/api/health
```

## Authentication

FinanceHub is single-user and has no public sign-up page — you create the one
account from the command line, then log in through the web UI.

### 1. Generate a secret key

The backend signs JWTs with `SECRET_KEY`. It refuses to start in production
without one; in development it falls back to a random key that resets on
every restart (fine for local dev, but you'll get logged out each time).

```powershell
openssl rand -hex 32
```

Copy `.env.example` to `.env` and paste the value in as `SECRET_KEY`. Set
`FRONTEND_ORIGIN` to whatever origin the browser app is actually served
from (the backend's CORS policy — and the cookie it sets — only trust this
one origin).

### 2. Create the initial user

```powershell
npm.cmd run create-user
```

This prompts for an email and password and writes a bcrypt-hashed row into
the `users` table (Turso or local file, whichever is active). It refuses to
run again once a user already exists — delete the row from the `users` table
first if you need to reset it.

### 3. How the token flow works

- `POST /auth/login` checks the email/password and returns a short-lived
  **access token** (30 min) in the JSON response, plus a **refresh token**
  (7 days) set as an `httpOnly` cookie scoped to `/auth`. The frontend never
  touches the refresh token directly — it can't, since JS can't read an
  httpOnly cookie.
- The access token is kept in memory only (a React context), never in
  `localStorage`, so it disappears on tab close/reload.
- Every `/api/*` request attaches the access token as `Authorization: Bearer
  <token>`. On a 401, the client calls `POST /auth/refresh` (which relies on
  the cookie) to get a new access token and retries the request once. If
  the refresh also fails, the user is dropped back to the login screen.
- `POST /auth/logout` revokes the stored refresh token server-side and
  clears the cookie.
- The login endpoint is rate-limited (5 attempts/minute/IP) and always
  returns a generic "Invalid credentials" error, whether the email exists
  or not.

## Deployment (Vercel frontend + Render backend)

The frontend and backend are deployed separately and talk to each other only
over HTTP(S) — no shared proxy or domain.

- **Backend (Render)**: set `FRONTEND_ORIGIN` to the deployed Vercel URL
  (e.g. `https://financehub.vercel.app`) so CORS accepts requests from it,
  plus `SECRET_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and
  `NODE_ENV=production` (this also makes the refresh cookie
  `Secure; SameSite=None`, required for it to survive the Vercel↔Render
  cross-site request — without it, login won't persist in production).
- **Frontend (Vercel)**: set `VITE_API_URL` (in the Vercel project's
  environment variables) to the deployed Render backend URL, e.g.
  `https://financehub-api.onrender.com`. Every API/auth call in `client/src`
  reads this via `client/src/utils/apiBase.js`; if it's unset, it falls back
  to `http://localhost:3001` for local development.
- Because the frontend calls the backend cross-origin in production, the
  refresh-token cookie is sent with `credentials: "include"` on every
  request — make sure `FRONTEND_ORIGIN` matches the Vercel URL exactly
  (scheme + host, no trailing slash) or the cookie will be rejected.

## DBeaver connection

1. Open DBeaver.
2. Create a new database connection.
3. Choose `SQLite`.
4. Set the database file path to:

```text
D:\IT Files\Coding\financehub-sqlite\financehub-sqlite\server\financehub.db
```

5. Test the connection and finish.

If the file does not exist yet, start the backend once and refresh the folder.

## Useful queries

```sql
SELECT name, amount, frequency, next_billing
FROM subscriptions
WHERE status = 'active';

SELECT category, SUM(amount) AS total
FROM transactions
WHERE type = 'expense'
  AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
GROUP BY category
ORDER BY total DESC;

SELECT
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS balance
FROM transactions;
```

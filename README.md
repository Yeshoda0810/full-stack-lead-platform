# Lead Platform

A lead management app a small sales team could actually use: a public capture
form feeds a pipeline that reps and admins work from, with permissions
enforced on the server, not just hidden in the UI.

Built for the Digital Heroes Full Stack Development task (Task A).

## Why this shape

Two services, one deploy:

- **`server/`** — Node + Express API. Owns all business rules and data.
- **`client/`** — React (Vite) single-page app. Talks to the API over `fetch`,
  holds no business logic of its own.

In production the Express server also serves the client's built static
files, so the whole thing runs as **one free-tier web service** (see
[Deploying](#deploying)) rather than needing two paid or two separately
configured hosts.

### Data layer

The API uses Node's built-in `node:sqlite` module rather than an external
database or an ORM. Two reasons: it needed to run inside a sandboxed
environment with no access to install native compiled dependencies or
download an ORM's query-engine binary, and — more importantly for the
brief — hand-written SQL keeps every query visible in the codebase instead
of hidden behind generated code, which is what "correctness and structure"
should mean at this scale. All access goes through `server/src/lib/db.js`;
swapping to Postgres for a real multi-instance production deploy touches
that one file plus the handful of call sites in `routes/leads.js` — see
[Swapping to Postgres](#swapping-to-postgres) below. `node:sqlite` is
labelled experimental by Node; that's a documented, deliberate tradeoff for
this exercise, not an oversight.

### Auth & permissions

JWT-based sessions (httpOnly cookie for the browser client, `Authorization:
Bearer` also accepted so the API is testable and usable by non-browser
clients). Two roles:

| Action | MEMBER | ADMIN |
|---|---|---|
| View the pipeline, search, filter | ✅ | ✅ |
| Add a note to any lead | ✅ | ✅ |
| Change status of a lead **assigned to them** | ✅ | ✅ |
| Change status of a lead assigned to **someone else** | ❌ | ✅ |
| Assign / reassign any lead | ❌ | ✅ |

This isn't arbitrary — it mirrors how a small team actually runs: reps own
their own conversations end to end, managers can intervene on anyone's.
Every rule above is enforced in `server/src/routes/leads.js` and
`server/src/middleware/auth.js`, re-checked on the server on every request.
The UI disables controls the current user can't use, but that's a courtesy,
not the control.

## Running locally

Requires Node **22.5+** (for `node:sqlite`).

```bash
# 1. API
cd server
npm install
npm run seed     # creates data/dev.db with 2 demo users + 4 sample leads
npm run dev       # http://localhost:4000

# 2. Client (separate terminal)
cd client
npm install
npm run dev       # http://localhost:5173, proxies /api to :4000
```

Demo accounts (created by `npm run seed`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@leadplatform.demo` | `AdminDemo123!` |
| Member | `member@leadplatform.demo` | `MemberDemo123!` |

## Tests

```bash
cd server
npm test
```

13 tests across two files:

- **`auth.test.js`** — login success/failure, generic error message for
  wrong-password vs unknown-email, rejected/missing/tampered tokens, and
  every row of the permission table above (member blocked from assigning,
  admin can assign, member blocked from editing someone else's lead, member
  can edit their own, admin can edit any).
- **`lead-lifecycle.test.js`** — the two core flows: (1) public capture →
  admin assigns → member notes + advances status → full detail view shows
  the correct notes and an activity trail in the correct order, and (2)
  paginated + status-filtered list queries return the right shape and
  reject an invalid status value with `400`.

Each test builds a fresh in-memory SQLite database (`:memory:`), so tests
never share state and never touch disk.

## API contract

Base path: `/api`. All authenticated routes accept either the session
cookie or `Authorization: Bearer <token>`. JSON in, JSON out.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/leads/public` | none | Public capture form. Body: `{ name, email, company?, message? }`. `201` with the created lead, `400` if `name`/`email` missing or email is malformed. |
| `POST` | `/auth/login` | none | Body: `{ email, password }`. `200` with `{ token, user }` and sets a session cookie. `401` on bad credentials (same message whether the email doesn't exist or the password is wrong). |
| `POST` | `/auth/logout` | any | Clears the session cookie. `204`. |
| `GET` | `/auth/me` | any | Returns the current user. `401` if the token is missing/invalid. |
| `GET` | `/users` | any | List of `{ id, name, email, role }` for populating the assignee dropdown. |
| `GET` | `/leads` | any | Paginated list. Query: `page` (default 1), `pageSize` (default 20, max 100), `status`, `assignedTo` (`me` \| `unassigned` \| a user id), `q` (search name/email/company). Returns `{ leads, pagination: { page, pageSize, total, totalPages } }`. `400` on an invalid `status` value. |
| `GET` | `/leads/:id` | any | Full detail: `{ lead, notes, activity }`. `404` if not found. |
| `PATCH` | `/leads/:id/status` | any | Body: `{ status }`. `403` unless caller is `ADMIN` or the lead's assignee. `400` on an invalid status value. |
| `PATCH` | `/leads/:id/assign` | `ADMIN` | Body: `{ assignedToId }` (or `null` to unassign). `403` for members. `400` if the id doesn't match a known user. |
| `POST` | `/leads/:id/notes` | any | Body: `{ body }`. `201` with the created note. `400` if `body` is empty. |
| `GET` | `/health` | none | Liveness check. |

Every mutation writes an entry to that lead's activity trail
(`lead_captured`, `reassigned`, `status_changed`, `note_added`), which is
what powers the timeline on the detail screen.

## Deploying

Both services can run for free.

1. **Database:** none needed to provision — `node:sqlite` writes to a file
   on disk. On a host with an ephemeral filesystem (e.g. Render's free
   tier without a persistent disk) that file resets on redeploy; for a real
   production deployment, mount a small persistent disk (Render free tier
   supports this) or move to Postgres (see below).
2. **Build the client:**
   ```bash
   cd client && npm run build
   ```
   This outputs `client/dist`, which `server/src/app.js` serves as static
   files and falls back to for any non-`/api` route (SPA routing).
3. **Deploy the server** (e.g. Render/Railway free web service):
   - Root: `server/`
   - Build command: `npm install && cd ../client && npm install && npm run build`
   - Start command: `npm start`
   - Env vars: `JWT_SECRET` (required — a real random string, not the dev
     default), `NODE_ENV=production`
   - After first deploy, run `npm run seed` once (via the host's shell/console)
     to create the two demo accounts.
4. Because client and server are one process, there's a single URL and no
   CORS configuration is even required in production.

### Swapping to Postgres

For a deployment that needs multiple server instances (the file-based
SQLite approach only works for a single instance), replace
`server/src/lib/db.js`'s `openDb`/`migrate` with a `pg` `Pool` and rewrite
the `CREATE TABLE IF NOT EXISTS` block using Postgres syntax (mainly:
`SERIAL`/`gen_random_uuid()` instead of hand-rolled ids if desired, and real
`ENUM` types instead of `CHECK` constraints, though the `CHECK` approach
also works unchanged on Postgres). No route file needs to change, because
every route talks to `db.prepare(...).get/all/run(...)`-shaped calls — only
that helper's internals move.

## AI use

Noted per the task kit's request in the submission below (see the `AI use`
section of the deliverables doc) rather than duplicated here.

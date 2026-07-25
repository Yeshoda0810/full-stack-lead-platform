# Lead Platform

A lead management app a small sales team could actually use: a public capture
form feeds a pipeline that reps and admins work from, with permissions
enforced on the server, not just hidden in the UI.

Built for the Digital Heroes Full Stack Development task (Task A).

**Live app:** https://full-stack-lead-platform.onrender.com

**Demo accounts:**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@leadplatform.demo` | `AdminDemo123!` |
| Member | `member@leadplatform.demo` | `MemberDemo123!` |

> Note: this runs on Render's free tier, which spins a service down after
> 15 minutes of no traffic. The first request after a quiet period can take
> 30-60 seconds to respond while it wakes back up - that's expected, not a bug.

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

One consequence of that choice worth being upfront about: Render's free
tier doesn't support a persistent disk, so the SQLite file resets whenever
the service redeploys or restarts. The start command handles this by
running the (idempotent) seed script before boot every time - see
[Deploying](#deploying) - rather than requiring a manual shell step, since
free-tier Render doesn't provide shell access either.

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

Deployed on Render's free tier, one web service for both API and client.

1. **Root Directory:** `server`
2. **Build Command:**
   ```
   npm install && cd ../client && npm install --include=dev && npm run build
   ```
   The `--include=dev` matters: with `NODE_ENV=production` set (below), npm
   skips `devDependencies` by default, and Vite lives there. Without this
   flag the build fails with `sh: 1: vite: not found`.
3. **Start Command:**
   ```
   npm run seed && npm start
   ```
   `npm run seed` is idempotent (it checks whether any user already exists
   and exits immediately if so), so running it on every boot is safe. This
   also compensates for Render's free tier not offering a persistent disk
   or shell access — there's no manual step needed to (re)create the demo
   accounts after a redeploy or a cold-start restart.
4. **Environment Variables:**
   - `JWT_SECRET` — a real random string, not the dev default
   - `NODE_ENV=production`
5. **Instance Type:** Free

Because client and server are one process, there's a single URL and no
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
that helper's internals move. This would also remove the need for the
seed-on-every-boot workaround above, since a managed Postgres instance
persists on its own.


# AI use

I used Claude (Claude.ai) heavily throughout both tasks — it scaffolded the
Express API, the React client, the test suites, and first drafts of the
four Task B documents. I want to be straightforward about that rather than
downplay it, since the brief explicitly says using AI well is the point.
Here's specifically what I did on top of the AI-generated draft, and where
I made the calls myself:

- **Deployment was mine to work through, not the AI's.** Claude gave me a
  starting Build/Start command for Render, but the actual deploy failed on
  the first attempt (`vite: not found`) because `NODE_ENV=production` was
  silently skipping `devDependencies` during the client build. I diagnosed
  that from the Render logs with Claude's help, and made the call to add
  `--include=dev` to the client install step rather than, say, removing
  `NODE_ENV=production` (which would have changed Express's runtime
  behavior, not just the build). I also decided to run the seed script on
  every boot (`npm run seed && npm start`) once I understood Render's free
  tier doesn't give me a persistent disk or shell access — that's a
  workaround I chose given the constraints of the free tier I'm actually
  deploying on, not something generic to the app.
- **The permission rule (members can only edit leads assigned to them;
  admins can edit/reassign anything) was a judgment call I reviewed and
  agreed with** — it fits how a small team actually works: reps own their
  own conversations end to end, managers step in only when needed.

What I did *not* do: hand in the first draft unedited. I read through the
permission logic, the test cases, and all four Task B documents rather
than treating them as a black box, and the deployment fix above is a
concrete example of debugging I had to do myself that the AI's first
answer didn't anticipate.



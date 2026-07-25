# Migration plan

No big-bang rewrite. The app cannot go down, so every phase below ships in
small, independently deployable pieces alongside the existing system, and
the old code path is only deleted once the new one has run in production
long enough to be trusted.

## Week 1

- Rotate every credential currently committed to the repo; move all
  secrets to environment variables / the host's secret manager.
  Add a pre-commit hook (e.g. `git-secrets` or a simple regex scan) so a
  new one can't be committed the same way.
- Add `.env.example` documenting what's required, and a README section on
  local setup that doesn't involve copying a teammate's `.env`.
- Stand up basic error logging/alerting (even something as simple as
  Sentry's free tier) so failures currently going to `console.log` in
  production are actually visible. This costs about a day and pays for
  itself the first time it catches something.
- No feature work changes this week - this phase is entirely risk removal,
  and it's short on purpose so it doesn't compete with roadmap pressure.

## Month 1

- Stand up a single, real API layer (even a thin one) that the frontend
  will migrate to instead of querying the database directly. Start with
  **one** high-value, low-risk read endpoint (e.g. "list my orders") to
  prove the pattern, not the riskiest write path.
- Introduce a test runner and CI (even one that only knows how to run
  `npm test` — the value is in existing, not in coverage yet).
- Adopt the **boy scout rule with teeth**: any pull request that touches a
  route handler must (a) not add new direct-database access from the
  frontend for that feature, and (b) add at least one test for the
  behavior it touches. This is enforced in code review, not aspirational -
  see the standards proposal for how.
- Migrate the frontend's 2-3 highest-traffic read paths to the new API
  layer. Leave the direct-DB paths that aren't being actively worked on
  alone for now; don't create risk by touching code nobody asked to change.

## Quarter 1

- Migrate the remaining frontend data access to the API layer, including
  writes, in order of how often that code path is actually touched by
  other work (so the migration rides along with feature work instead of
  being a separate parallel project competing for the same engineers).
- For each route migrated, extract its business logic into a service layer
  the way the refactor demo shows, with tests, following the pattern
  proved out in month 1.
- Once a given piece of frontend code has had zero direct-database calls
  for a full release cycle, delete the old data-access path it used to
  use. Nothing gets deleted preemptively.
- Revisit: by the end of the quarter, decide whether the pace of the
  remaining migration should continue at "ride along with feature work" or
  whether specific remaining hot spots (highest complexity, highest
  change frequency) justify dedicated time. This is a deliberate checkpoint,
  not a decision to make on day one before there's data to make it with.

## What doesn't change in this plan

- No feature freeze. Product work continues throughout; this plan is
  designed to run underneath it, not to compete with it for a dedicated
  team.
- No "rewrite in a new framework." The problems here are architectural
  layering and process, not the choice of language or framework - a
  rewrite would reintroduce all the same risks (no tests, unclear
  requirements, no safety net) while also being an enormous, high-risk,
  single deliverable, which is precisely what this plan is designed to
  avoid.

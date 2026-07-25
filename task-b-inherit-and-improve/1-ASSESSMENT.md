# Assessment: inherited codebase

Scope: a working production codebase serving real customers, no tests,
business logic inside route handlers, direct database calls from the
frontend, secrets committed to the repo. Cannot go down.

The instinct on day one is to start fixing things. The actual first move is
to *not* touch anything yet and spend a day understanding what's fragile
before deciding what's urgent - on a system with no tests, the biggest risk
isn't the bad code, it's making a confident change to bad code with no way
to know it broke something.

## Fix order and the reasoning behind it

### 1. Secrets committed to the repo — fix first, ship this week

**Risk of leaving it:** Highest of the four, and it's not really a
"someday" risk - every person who has ever had repo access, and every fork
or backup of it, already has these credentials, whether or not they've been
misused yet. This is the one item where the fix is nearly free (move to
environment variables / a secrets manager, rotate the exposed credentials)
and delaying it has no offsetting benefit. There's no reason to sequence
this behind anything else.

### 2. Frontend calling the database directly — fix second, ship this month

**Risk of leaving it:** This is a security and data-integrity hole hiding
as an architecture shortcut. If the frontend has direct database
credentials, there is no server-side place left to enforce a business
rule, validate input, or check a permission - the "backend" is whatever the
browser's JavaScript happens to send. It's also the item most likely to be
silently making the other three problems worse, since any data-shape
assumption the "real" backend makes can be violated by a request the
frontend layer never went through. Fixing it means introducing a real API
boundary the frontend talks to instead - which the migration plan below
treats as the first substantial phase of work, because everything else
(tests, refactored business logic) is easier to reason about once there's
one server-side entry point instead of two.

### 3. No tests — fix third, but starting immediately and continuously

**Risk of leaving it:** Not an acute risk the way #1 and #2 are - the app
has been running with no tests, so it isn't about to break because of that
alone. The risk is compounding: every fix to #1, #2, and #4 is itself a
change to code nobody can verify without manually clicking through the
app. Rather than "pause and write a test suite" (which never finishes and
blocks everything else), tests get added as a *condition of touching* a
given piece of code - see the migration plan's "boy scout rule" for the
exact mechanism. By month one, the highest-traffic paths have coverage;
the rest accumulates it as it's touched.

### 4. Business logic inside route handlers — fix fourth, ongoing

**Risk of leaving it:** Real, but the least acute of the four - it's a
maintainability and duplication problem (see the pricing-logic drift in
the refactor demo) rather than a security hole. It also can't be fixed
safely without #3 in place first: pulling logic out of a route handler is
exactly the kind of change that's easy to get subtly wrong, and subtle
wrongness in pricing/order logic is a customer-facing incident. This is
the multi-quarter piece of work; the migration plan phases it route by
route rather than as a rewrite.

## Summary

The sequencing logic in one line: **fix what's actively leaking (secrets),
close the hole that makes everything else unenforceable (direct frontend
DB access), build the safety net before doing surgery (tests), then do the
surgery (extract business logic) under that net.**

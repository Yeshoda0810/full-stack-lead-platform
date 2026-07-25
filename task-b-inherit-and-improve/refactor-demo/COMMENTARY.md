# Before / after: commentary

## What was wrong, concretely

`before/orders.js` is one file, but it has five separable problems stacked
on top of each other:

1. **SQL injection.** `` `SELECT * FROM orders WHERE id = ${orderId}` `` and
   the `UPDATE` right after it build queries by string concatenation. Any
   caller who can reach this route can read or write arbitrary rows.
2. **Duplicated, drifted business logic.** The discount math here is a
   second implementation of pricing that already exists at checkout. They
   have already disagreed (this path is missing the free-shipping rule) -
   which is exactly what happens when the same rule lives in two places.
3. **Secrets in source control.** `MAIL_PASS` and `DISCOUNT_API_KEY` are
   committed as string literals. Anyone with repo access - or anyone who
   finds an old commit - has them, and rotating a leaked credential means
   a code change and a redeploy instead of an environment variable update.
4. **No input validation.** `newStatus` is written straight into the
   database with no check against a known set of values.
5. **A side effect that can silently corrupt the response.** The database
   write commits before the email send is attempted. If Gmail is slow or
   down, the customer's order *has* updated but the request can still come
   back as a 500 - the client has no reliable way to know whether the
   write actually happened.

And underneath all five: **none of this is testable**. Exercising the
discount logic means exercising Express, a real (or heavily mocked) MySQL
connection, and Nodemailer, all in the same test. In practice that means
nobody writes the test.

## What changed, and which problem each change fixes

| Change | Fixes |
|---|---|
| `repositories/orderRepository.js` — every query parameterized | SQL injection (#1) |
| `services/pricingService.js` — one function, used everywhere pricing is needed | Duplicated logic (#2) |
| `config/env.js` — secrets read from environment, never literals | Secrets in source (#3) |
| `services/orderService.js` — validates `status` against a known list before touching the database | No validation (#4) |
| `services/notificationService.js` — emits an event instead of sending mail inline | Side effect corrupting the response (#5) |
| `routes/orders.js` — now ~10 lines, only HTTP concerns | Testability, readability |
| `middleware/errorHandler.js` — one place translates domain errors to status codes | Consistent, non-swallowed errors |
| `services/__tests__/orderService.test.js` | Testability - 4 tests, 0 network calls, 0 database |

## What this cost

Honesty about the tradeoff: the "after" version is eight files instead of
one, and a reviewer seeing it for the first time has to learn where things
live. That's a real cost for a codebase this small. The justification is
that this pattern is meant to repeat across every route in the app, not
just this one - the fixed cost of learning the layering is paid once, and
every subsequent route (there would eventually be dozens) is cheaper to
write, review, and test as a result. For a true one-off script, this much
structure would be over-engineering; for a route serving real customers
that "cannot go down," per the brief, it isn't.

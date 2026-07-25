# Standards proposal and adoption plan

## The standards

Kept short on purpose - a 40-page standards doc is itself a sign nobody
will read or follow it. Four rules, chosen because each one directly
prevents one of the four problems found in the assessment:

1. **No secrets in source control.** Config and credentials come from
   environment variables. Enforced by a pre-commit scanner, not by asking
   people to remember.
2. **The frontend talks to the API, never the database.** One boundary,
   one place permissions and validation live.
3. **A route handler contains no business logic** - it parses the request,
   calls a service, shapes the response. If a route handler is more than
   ~15 lines, that's a signal logic has leaked into it.
4. **New or changed behavior ships with a test.** Not 100% coverage as a
   target (a number that's easy to game and doesn't actually indicate
   confidence) - the rule is scoped to *what the PR touches*.

## Getting a resistant team to actually adopt this

The honest starting assumption: a team that built things this way wasn't
being careless, they were moving fast under real pressure, and the current
codebase is evidence that worked well enough to ship a product real
customers use. A standards rollout that implies "everything you did was
wrong" gets resisted, correctly. The adoption plan is built around that.

- **Enforce the cheap rules automatically, not socially.** The secrets
  scanner and a CI check for "no new frontend DB calls" don't require
  anyone to remember a rule or police a teammate - the tooling either
  passes or it doesn't. This is where standards work stick, because
  compliance stops being a matter of individual discipline.
- **Make the new pattern the path of least resistance, not just the
  approved one.** Once the service-layer pattern exists for one route
  (the refactor demo's shape), the fastest way to build the next route is
  to copy that pattern - it's less code to write than reinventing
  inline logic, not more. Standards that are slower to follow than to
  ignore don't survive contact with a deadline.
- **Review, don't gate.** New tests are required for *changed* behavior,
  not retrofitted onto untouched legacy code as a blocking condition -
  nobody should be stuck unable to ship a one-line copy fix because the
  file it's in has zero historical coverage.
- **Show the payoff early and specifically.** The first migrated route
  should be one where the team has been burned before (a bug that shipped
  because two copies of pricing logic drifted, say). When the standard
  visibly prevents a recurrence of a real, remembered incident, it stops
  being "process" and starts being "the thing that would have saved us
  last quarter."
- **A named owner, not a committee.** One senior engineer owns the
  standards doc and the CI checks, and is the person a PR author asks
  when a rule doesn't fit their situation - so the standard can flex for a
  genuine edge case instead of becoming a rule people quietly route
  around because raising an exception has no clear path.

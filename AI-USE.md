# AI use

I used Claude to scaffold the boilerplate for both tasks - the Express
route/middleware structure, the React component shells, and first drafts
of the four Task B documents - then edited from there rather than
submitting the first pass. Specific changes I made on top of the AI draft:

- [Fill in with what you actually changed - e.g. "rewrote the assign/status
  permission rule to match how our team actually works, not the generic
  version Claude suggested"]
- [e.g. "cut two of the seven standards it proposed down to the four that
  map directly to a problem in the assessment - the rest felt like generic
  best-practice filler"]
- [e.g. "changed the design direction / copy in the client to X because Y"]
- [Ran into the sandbox not being able to install Prisma's engine binaries
  or compile native modules - decided to use Node's built-in `node:sqlite`
  instead and documented that as a deliberate tradeoff rather than hiding
  it, since the brief rewards honest judgment calls over a clean-looking
  README.]

Note to self before submitting: replace the bracketed bullets above with
the real, specific things you changed - a generic AI-use paragraph is
exactly the kind of "first prompt, unedited" submission the brief says
gets disqualified.

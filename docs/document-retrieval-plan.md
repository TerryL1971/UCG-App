# Getting documents in and out of the app — plan + status

Captured from Terry (2026-09-21): "how will a salesman enter a signed
form or if a customer is asking for a form that the salesman must
generate, how will he/she get that form on the app?" — the real gap in
the document-storage.ts work that shipped just before this. Two separate
problems, addressed separately below.

## Problem 1: a customer retrieving their own paperwork — SHIPPED

A customer needs to view/print a generated or signed document again
later — a different session, a different device, after a reinstall —
without this app having real per-customer accounts (`auth-context.tsx`
is still a stand-in; "Browse without an account" is a normal, supported
path).

**Solution: a short "documents code."** `document-storage.ts`'s
`getOwnerId()` — previously an ugly `anon-<timestamp>-<random>` string
meant only to be a Storage folder name — now generates an 8-character,
human-typeable code (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`, excluding
0/O/1/I/L to cut down on misreads). Shown on the Documents tab
(`deal/documents.tsx`) under "Your Documents Code." The same screen has
a "Have a Code?" box: type in a code, and `lookupDealDocuments()`
(`document-storage.ts`) calls the `lookup-deal-documents` Edge Function,
which returns short-lived signed URLs for that code's `generated`/
`signed` documents (never `kind: 'scan'` — identity documents stay out
of this lighter-auth path on purpose).

This is an explicit, accepted tradeoff — a lighter stand-in for real
auth, not real auth. `lookup-deal-documents` runs with the project's
service-role privileges (the one place that key is ever used — it never
ships to the client) and logs every attempt to
`deal_code_lookup_attempts` for a basic per-IP rate limit (20 attempts /
5 minutes). 8 characters from a 32-symbol alphabet is ~1.1 trillion
combinations — resistant to casual guessing, not to a real sustained
attack; revisit if this app ever handles something more sensitive than
sample paperwork through this path.

**Status: shipped and smoke-tested end to end** (2026-09-21) — real
upload, real code, real signed URL, real fetch, both via raw HTTP and
via `supabase.functions.invoke` (the actual client path the app uses).

## Problem 2: a salesperson's own document getting INTO the system

This is the harder one, and genuinely still open. First framing was
wrong: a hidden salesperson screen inside this customer-facing app,
reachable via a direct link. Terry corrected that directly: salespeople
work from WhatsApp, Genius Scan, or whatever they already use day to
day — not a bolted-on tool in the customer's app. Building one would've
solved nothing real.

**Direction, confirmed with Terry:** UCG already has real mailboxes —
`name@usedcarguys.net` for everyone (matches the letterhead on every
sample document: `terry@usedcarguys.net`, `alex.birdie@usedcarguys.net`).
Genius Scan (and nearly every scanner app) can email a scanned PDF
directly — no new habit for a salesperson to learn, they already scan
and hit "send." The plan:

1. A dedicated address, e.g. `scans@usedcarguys.net` — matching the
   same `name@usedcarguys.net` convention Terry described, not a
   separate subdomain, so it reads as a real UCG address like everyone
   else's.
2. **Still need to know: Microsoft 365 or Google Workspace?** — that's
   the one fact this plan is blocked on. It decides how mail landing in
   that inbox gets forwarded to a webhook:
   - **Microsoft 365** — a Power Automate flow (trigger: "When a new
     email arrives," condition: has attachment) calling an HTTP webhook,
     or a Microsoft Graph API webhook subscription on the mailbox.
   - **Google Workspace** — a Gmail API push notification (Pub/Sub) on
     the mailbox, or an Apps Script trigger on a label/filter, calling
     the webhook.
3. **A new Edge Function** (not yet built — `lookup-deal-documents`'s
   counterpart, something like `ingest-scanned-document`) that receives
   the webhook, pulls the attachment, and needs a way to know which
   deal/customer it belongs to. Realistic options, roughly in order of
   how little they ask of the salesperson:
   - The salesperson includes the customer's documents code (Problem 1,
     above) in the subject line — e.g. "AB3D9XZK — signed PO" — the
     function just parses it out. Cheapest to build, asks one small
     habit of the salesperson (copy the code once).
   - Match by whatever DealerTeam-ish identifying text is in the
     subject/body (deal #, stock #) against `deal_documents`' existing
     `car_stock_number` field — fuzzier, no new habit required, more
     code to get right, more room for a wrong match.
   - No automatic matching at all — every incoming scan lands in a
     holding area (a `kind: 'unmatched'` row, or a separate table) and
     someone (Terry, today) manually assigns it to the right deal from
     the Supabase dashboard. Simplest function, most manual ongoing
     work — reasonable as a real v1 while volume is still low.
4. Uploads to the `documents` bucket + a `deal_documents` row, same
   shape `document-storage.ts` already writes from the client side —
   this Edge Function is just another writer into the same system,
   using its own service-role access instead of the customer app's
   anon-key path.

**Status: designed, not built.** Waiting on: (a) which platform runs
`usedcarguys.net` mail, (b) which of the three matching strategies above
Terry wants for v1, (c) actually provisioning the `scans@usedcarguys.net`
mailbox and its forwarding rule/webhook subscription — all outside what
this codebase can do on its own.

## What already exists to build on

- `documents` Storage bucket (private) + `deal_documents` table — one
  row per uploaded page, `kind` = `scan` | `generated` | `signed`.
- `deal_code_lookup_attempts` — rate-limit log for Problem 1's lookup
  function.
- `lookup-deal-documents` Edge Function (`supabase/functions/`) — live,
  deployed, the reference pattern for Problem 2's ingestion function too
  (same `withSupabase`/`ctx.supabaseAdmin` shape, same "service-role key
  never leaves the function" rule).

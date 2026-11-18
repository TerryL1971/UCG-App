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

**Second framing, also superseded (2026-09-21): the real answer is
SharePoint, not email.** UCG already runs Microsoft 365, and — this is
the important part — **staff are already doing exactly this**, today,
as their normal workflow: `theusedcarguys.sharepoint.com`'s "UCG
Library" has a folder per stock number (`Vehicle Inventory / _DE
Units... / (DE10003) 2019 Volkswagen Golf GTI`), with a `"Buying
[SellerName]"` subfolder (UCG buying the car — mirrors this app's
Sell It Back) and a `"Selling [BuyerName]"` subfolder (UCG selling the
car — mirrors this app's regular purchase flow), each already holding
the real thing: AE550 forms, driver's license copies, signed Purchase
Orders/Bills of Sale, stamped 550s, the Vehicle Hand-Over Document,
registration, wire confirmations, lien releases. Real staff (Carrie
Leggett, Sabine Vogl, Anke Neumayer, and others) upload to these
folders constantly. No new habit for anyone — this makes the
email-ingestion idea above obsolete for anything tied to a real stock
number; email inbound only still matters, if at all, for the case
SharePoint doesn't cover (see below).

**Why this is a better integration target than email:**
- **The key is already in the app.** `car.stockNumber` (from
  `useDeal()`) IS the SharePoint folder name — no invented "documents
  code" needed to look up a car that came from live inventory. The
  documents code (Problem 1) still matters for Sell It Back before a
  stock number/folder exists, and for anything this app generates
  before a salesperson ever touches SharePoint.
- **It's the real system of record**, not a parallel one this app
  would be asking staff to also remember to use.

**What it needs, and why this codebase can't do it alone:** reading
SharePoint programmatically means talking to Microsoft Graph API, which
means someone with Microsoft 365 admin rights registers an Azure AD
app and grants it permission to that SharePoint site — `Sites.Read.All`
or a site-scoped equivalent (application permission, since customers
have no M365 login of their own; needs admin consent). That produces a
tenant ID, client ID, and a client secret or certificate — which, like
every other secret in this project, would live ONLY in a Supabase Edge
Function's environment, never in the app itself.

**Status (2026-09-21): Terry wants to confirm with IT before committing
to a scope.** Reasonable — this touches the company's real M365 tenant,
not a project-specific service. Nothing built yet on this front. Once
there's a green light, the shape would be:

1. IT registers the Azure AD app, grants it read (at minimum) access to
   the UCG Library site, hands over tenant ID / client ID / client
   secret.
2. A new Edge Function (`lookup-vehicle-documents` or similar) takes a
   stock number, calls Graph API to find the matching
   `Vehicle Inventory/.../({stockNumber}) .../"Buying "` or `"Selling "`
   subfolder, and returns file names + short-lived download links —
   same `withSupabase`/`ctx` shape as `lookup-deal-documents`, just a
   different upstream.
3. Client-side, likely folded into the same "Have a Code?"-style UI on
   the Documents screen, or a parallel lookup keyed off `car.stockNumber`
   automatically when a real inventory car is in play — genuinely two
   reasonable options here, worth deciding once scope (read vs.
   read+write) is settled with IT.

If IT scope ends up narrower than full Graph API access (e.g., they'd
rather not grant a third-party app read access to the whole SharePoint
site), the email-ingestion plan below is the fallback — kept for that
reason, not because it's still the preferred path.

<details>
<summary>Original email-ingestion plan (fallback, not the current direction)</summary>

UCG has real mailboxes — `name@usedcarguys.net` for everyone. Genius
Scan (and nearly every scanner app) can email a scanned PDF directly.

1. A dedicated address, e.g. `scans@usedcarguys.net`.
2. Microsoft 365 (confirmed, 2026-09-21) — a Power Automate flow
   (trigger: "When a new email arrives," condition: has attachment)
   calling an HTTP webhook, or a Microsoft Graph API webhook
   subscription on the mailbox.
3. A new Edge Function receives the webhook, pulls the attachment, and
   needs a way to know which deal/customer it belongs to — e.g. the
   salesperson includes the documents code (Problem 1) in the subject
   line.
4. Uploads to the `documents` bucket + a `deal_documents` row, same
   shape `document-storage.ts` already writes from the client side.

</details>

## What already exists to build on

- `documents` Storage bucket (private) + `deal_documents` table — one
  row per uploaded page, `kind` = `scan` | `generated` | `signed`.
- `deal_code_lookup_attempts` — rate-limit log for Problem 1's lookup
  function.
- `lookup-deal-documents` Edge Function (`supabase/functions/`) — live,
  deployed, the reference pattern for Problem 2's ingestion function too
  (same `withSupabase`/`ctx.supabaseAdmin` shape, same "service-role key
  never leaves the function" rule).

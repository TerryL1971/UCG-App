# Real backend, management visibility, and an AI agent — one design

This ties together three things that turned out to be the same problem:
management can't monitor sales, an AI agent can't answer real questions,
and [[the DealerTeam plan's "Phase 1a"]] both need a backend that doesn't
exist yet. This doc is that backend's design, with the dashboard and the
AI agent as its first two consumers — not three separate projects.

Nothing in this doc is built yet. It's the plan to review before any of
it gets stood up, since real accounts/real data change what this app is
in a way mock data never did (see "Before this goes live," below).

## Why one backend, not two features

Right now every "submission" in this app (deal-intake, Sell It Back) is
a WhatsApp message to one phone. Nothing is recorded anywhere else. That's
*why* neither ask is possible:

- **Management can't see the pipeline** — there's no list, no dashboard,
  nothing but WhatsApp chat history on one device.
- **An AI agent can't answer account-specific questions** ("where's my
  deal") — there's no data anywhere for it to look up. It *could* answer
  general questions today (USAREUR licensing, warranty terms) since
  that's static knowledge already researched this session, not account
  data — see "AI agent, tier 1" below, which doesn't need any of this.

Both real fixes need the same three things: a real database, real
customer accounts (replacing the AsyncStorage stand-in in
`auth-context.tsx`), and a place for staff to log in and look at it.
Build that once, then point a dashboard and an agent at it.

## Recommended backend: a managed platform, not a hand-rolled server

The original DealerTeam research (Node/Python + hosting + auth + a
database, all self-managed) is the right shape for a team with backend
engineers on staff. UCG doesn't have one, and this app has been built by
Terry with Claude Code, not a dev team — a self-hosted server is a real,
ongoing maintenance burden (security patches, uptime, backups, scaling)
that's a bad fit here.

**Recommendation: a managed backend-as-a-service (e.g., Supabase)** —
Postgres database, real auth, file storage, and serverless functions,
all hosted and maintained by the provider, with a generous free tier
that's very likely enough for a small dealership's real volume for a
long while. The React Native app can talk to it directly via a client
SDK for most reads/writes (no hand-rolled API layer needed for basic
CRUD), with row-level security policies enforcing "a customer can only
see their own deal" at the database level rather than trusting app code
to get that right. A hosted Postgres table editor is also a *free,
already-built* first version of "management can see the pipeline" —
day-one visibility before any custom dashboard exists.

This is a recommendation, not a foregone conclusion — a different
managed platform (Firebase, etc.) would fit the same shape. The point is
*managed*, not *self-hosted*, given who's maintaining this.

## What the schema needs (sketch, not final)

- **customers** — replaces the local-only AsyncStorage user; real auth
  (email/password or magic link), so an account actually means something
  across devices, not just "remembered on this phone."
- **deals** — one row per `DealIntake` submission (currently
  `deal-intake-context.tsx`, gone the moment the app closes): base,
  payment method, license status, notes, timestamps, and a status field
  driving what today's `dealSteps` mock fakes.
- **salespeople** — real people, not one hardcoded `salesperson` — the
  actual fix for the "more than one salesperson per location" open
  question in [[deal-flow-roadmap]].
- **locations** — already half-modeled (`ucgLocations` in mock-data.ts).
- **documents** — file storage for license front/back scans (currently
  local-only URIs that don't survive the WhatsApp handoff) and eventually
  real KYC/loan documents.
- **agent_conversations** — if the AI agent ships, its own chat history
  per customer, separate from the deal record itself.

## Management dashboard — phased, not one big build

1. **Day one, zero build:** the backend platform's own built-in table
   view/admin UI. Not pretty, but real — David/Michelle/James can see
   every submission the moment the backend exists, before any custom UI
   is written.
2. **A real dashboard, once it's clear what views actually matter in
   practice** — likely: an incoming-submissions queue (replacing "check
   WhatsApp"), a per-location salesperson-assignment view (ties into the
   still-open assignment question), and per-deal status. Worth waiting
   for real usage of step 1 before guessing at this, rather than building
   it blind.

## AI agent — two tiers, only one buildable right now

- **Tier 1 (buildable without the backend above):** a general-FAQ agent
  grounded in what's already been researched and verified this session —
  USAREUR licensing (JKO process, the cert warning, arrival checklist),
  the 1-yr/2-yr PPP warranty terms, base info, how financing vs. cash
  works, what Sell It Back needs. Calls the Claude API through a small
  serverless function (never from the app directly — same "credentials
  can't live in a shipped app" rule as the DealerTeam plan), with a
  system prompt built from real, curated content rather than letting the
  model guess at UCG-specific facts. Escalates to a **real person via
  WhatsApp** — the same `whatsappChatUrl` pattern already built — for
  anything it can't answer or that's account-specific, consistent with
  how the rest of this app already treats "hand off to a human" as the
  answer to complexity, not a fallback of last resort.
- **Tier 2 (needs the backend):** account-aware answers ("has my
  financing been approved") by querying a logged-in customer's own
  `deals` row. Waits on real accounts existing.

Tier 1 could reasonably start before the full backend/dashboard work —
worth deciding explicitly if that's wanted, rather than assuming
"design together" means "build in strict lockstep."

## Before this goes live: real data changes what this app is

Worth saying plainly, not glossing over: everything the app has stored
until now is either on-device only or a WhatsApp message — nothing
building customer accounts, deal records, or license photos in a real
database has been necessary to think hard about *yet*. That changes here.
UCG operates in Germany, serving people who (even as US military) are
physically in the EU — **GDPR considerations are a real, separate
question that needs actual legal input before this stores real customer
PII**, not something to assume away or that a backend platform's
"compliance-ready" marketing page settles on its own. This isn't legal
advice and shouldn't be treated as it — flagging it here so it's a
decision made on purpose, before real data exists, not discovered after.

### How access would actually be controlled

- **Data residency:** provision the backend in an EU region if the
  platform offers one — customers are physically in Germany, so this is
  a real setting to pick deliberately, not an afterthought.
- **Row-level security, not app-side filtering.** A customer's login
  should only be able to query *their own* deal record, enforced at the
  database level — not something the app merely agrees to respect,
  which could be bypassed. Staff get a separate role with broader
  (still not unlimited) access.
- **The key embedded in the shipped app is a public, restricted key** —
  same rule as the DealerTeam Connected App credentials: no
  service-role/admin key ever ships inside app code.
- **Documents (license front/back, condition photos) deserve tighter
  handling than general profile fields** — a license photo is an ID
  document. Worth a deliberate retention rule (purged after the deal
  closes? kept N days?) rather than indefinite storage by default.

### What the app stores will require, not just recommend

- **A published Privacy Policy URL** — mandatory the moment the app
  collects real account data; doesn't exist yet. Needs real legal
  review given GDPR + operating in Germany — a starting draft can be
  written, but shouldn't ship without a lawyer's eyes on the actual
  language.
- **Apple's App Privacy "Nutrition Label"** and **Google Play's "Data
  Safety" section** — mandatory declarations at submission time of
  exactly what's collected and why, and whether it's shared with anyone
  else (relevant the moment DealerTeam sync becomes real, since that
  would be sharing customer data with a third-party system).
- **Apple requires self-service account deletion** (App Store Review
  Guideline 5.1.1(v)): if the app lets someone create an account, there
  must be a way to delete that account *from inside the app*, not just
  an email to support. This is the real-accounts version of the
  "delete my test data" question already raised earlier — once
  `auth-context.tsx`'s local stand-in becomes a real backend account,
  this stops being a nice-to-have and becomes a hard submission
  requirement, not optional polish.

## Open questions

- Who owns the backend platform account — a personal account of Terry's,
  or a UCG business account? Matters for billing, access control, and
  what happens if Terry stops being the one running this.
- GDPR/data-handling posture (above) — needs a real answer, likely
  outside a coding session, before real customer data is stored.
- Tier 1 AI agent: build now (doesn't need the backend) or hold until
  the backend work starts, so it's not a separate thread?
- Does the eventual DealerTeam integration (if UCG gets API access) feed
  *into* this new database, or does this database stay the source of
  truth and DealerTeam sync separately? Worth deciding once
  [[dealerteam-salesforce-confirmed]]'s open access question is answered,
  not now.
- Who writes/reviews the actual Privacy Policy language, and on what
  timeline relative to backend work starting? It's a submission blocker
  for both stores, so it can't be left until the app is otherwise ready.
- What's the retention rule for uploaded documents (license photos,
  condition photos) — kept indefinitely, purged after the deal closes,
  something else? Needs a real answer before storage is built, not
  patched on after.

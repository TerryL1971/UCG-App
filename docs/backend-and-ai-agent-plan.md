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

## Strategy: fake the APIs we don't control yet, real ones we do

Terry's framing (Sept 1): build minimized fakes of DealerTeam, PayPal,
and anything else that needs an API, so development isn't blocked
waiting on external access — then swap the real thing in behind the
same interface once it exists. Good instinct, but it splits into two
different answers depending on the API, and conflating them would waste
effort:

- **PayPal — don't build a fake, use PayPal's real Sandbox. DONE, same
  day.** PayPal already provides exactly this: a free developer account
  (developer.paypal.com) generates sandbox business/buyer test accounts
  and API credentials that hit the *same* endpoints and *same*
  request/response shapes as production — just fake money. Terry set up
  a real sandbox app within the hour and provided credentials, so this
  went straight to built: `src/app/deposit.tsx` + two server routes
  (`src/app/api/paypal/create-order+api.ts`, `capture-order+api.ts`) +
  `src/lib/paypal-server.ts`. Building against Sandbox from day one means
  "swap fake for real" is swapping `PAYPAL_API_BASE` and the credentials
  in `.env` — no code change. Full writeup in
  `docs/deal-flow-roadmap.md`'s "Make A Deposit" section, including two
  real things this caught: `new Anthropic()`'s module-scope construction
  in `chat+api.ts` was a real crash bug (fixed), and a shared PayPal
  helper first got exposed as its own client-facing route before moving
  to `src/lib` (also fixed) — worth remembering for any *future* `+api.ts`
  work: only put files meant to become endpoints under `src/app`.
- **DealerTeam — a genuine custom fake makes sense.** No public sandbox
  exists for it, and — separately from "for testing" — real API access
  may never be affordable on UCG's plan (see
  [docs/salesforce-dealerteam-integration-plan.md](./salesforce-dealerteam-integration-plan.md)'s
  still-unanswered cost question). This is not new scope: it's exactly
  **Phase 1a** from that doc (a small UCG-owned backend, independent of
  DealerTeam access) — reframed with a sharper reason to actually start
  it now (unblocks testing) rather than only "in case access never
  comes through." Building the fake deal/salesperson/status data model
  *is* building that backend's schema — same work, not two efforts.
- **The AI agent already follows a lighter version of this idea** —
  `chat+api.ts` degrades to an honest "not connected yet" fallback
  when no real `ANTHROPIC_API_KEY` exists, rather than faking a
  response. Worth deciding whether DealerTeam's fake should simulate
  *plausible data* (a fake deal record with fake but realistic values)
  or stay an honest "not connected" stub the way the AI agent does —
  a fake deal record is more useful for testing UI states (what does a
  financing-approved deal actually look like end to end?) but risks
  being mistaken for real if anyone forgets it's fake. Recommendation:
  simulate real-looking data, but label it unmistakably in the UI
  during this phase (a debug banner, or similar) so it's never
  ambiguous.

**The discipline that makes "swap later" actually cheap:** the app
should call one stable internal interface (e.g. "get this deal's
status," "create a deposit") — never DealerTeam- or PayPal-specific
shapes directly. Only the implementation behind that interface changes
when the real API replaces the fake one. Skipping this and wiring
DealerTeam/PayPal specifics directly into screens would mean "swap
later" requires rewriting call sites, not just an implementation.

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

## AI agent — two tiers, one now shipped

- **Tier 1 — SHIPPED (Sept 1), ahead of the rest of this plan.** Terry
  decided this explicitly: "Meet Your Specialist" is a real AI agent,
  not a WhatsApp handoff to a human — so `deal-intake.tsx` no longer
  opens WhatsApp on submit, and `salesperson.tsx` is a real in-app chat
  window backed by `src/app/api/chat+api.ts` (an Expo Router server
  route). The Anthropic API key lives only in that route's environment
  (`ANTHROPIC_API_KEY` in a local, gitignored `.env` — never in the
  shipped app), matching the credentials rule from the DealerTeam plan.
  The system prompt is built entirely from real, curated content
  gathered this session — USAREUR licensing (the JKO process, the cert
  warning, the arrival checklist), the real 1-yr/2-yr PPP warranty
  terms, real base/location names, how financing vs. cash works, what
  Sell It Back needs — rather than letting the model guess at
  UCG-specific facts. **No "Talk to a Human" link right now** — it
  briefly existed (real WhatsApp, `whatsappChatUrl`) but was removed
  Sept 2 on Terry's call, since `salesperson.whatsapp` is still a fake
  placeholder number and a fallback pointing at nobody is worse than no
  fallback. The system prompt now tells the agent to say a specialist
  will follow up directly instead of pointing to a link that doesn't
  work — re-add the real link once UCG's real WhatsApp Business number
  exists.
  **What this doesn't yet solve:** it works today because Expo Go talks
  to `npx expo start`'s local dev server directly — a real published
  app needs this route actually hosted somewhere (EAS Hosting or
  similar) and the `origin` config set in app.json's expo-router plugin,
  which hasn't happened yet.
- **Tier 2 (needs the backend, not built):** account-aware answers ("has
  my financing been approved") by querying a logged-in customer's own
  `deals` row. Still waits on real accounts existing.

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
A fuller research briefing (GDPR, the German-specific Impressum
requirement, and — the highest-stakes one — a real open question about
whether this app's sales flow counts as a "distance contract" carrying
a statutory right of withdrawal on a completed car sale) is in
[docs/legal-considerations-germany.md](./legal-considerations-germany.md),
with starting drafts of a
[Privacy Policy](./privacy-policy-draft.md) and an
[Impressum](./impressum-template.md) — none of it publishable as-is,
all of it meant to make the actual conversation with counsel faster.

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
- ~~Tier 1 AI agent: build now or hold?~~ Resolved Sept 1 — built now
  (see "AI agent" above). New question in its place: **who's setting up
  the real Anthropic API key and, eventually, real hosting for
  `chat+api.ts`** — this works against a local dev server today but
  needs both before a real customer ever uses it. **Partially resolved
  Sept 2:** Terry raised, correctly, that Anthropic API access is a
  separate account/billing from whatever Claude plan he's already on,
  and that it doesn't make sense for him personally to fund an account
  for an app that won't be his — same reasoning as the backend-account
  question above, just hit concretely first here. Decision: **the real
  key belongs to UCG, set up when David/Michelle/James are ready to own
  it, not fronted by Terry.** Nothing is blocked by this — the graceful
  "not connected yet" fallback (now fixed to trigger correctly, see
  `chat+api.ts`) means every other part of the app works independently
  of whether this piece is funded. For scale, if/when UCG does set this
  up: Anthropic API billing is pay-per-use with no minimum, and a
  typical short chat exchange costs on the order of a cent or two —
  testing this feature thoroughly would likely run well under $2 total,
  and Anthropic Console supports a hard monthly spend cap per key if
  bounding risk to zero matters.
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

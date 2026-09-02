# Pre-launch checklist — everything before this goes live somewhere

Terry's ask (Sept 2): "This app is not live yet. I need everything as
done as possible before it ever goes live somewhere." Nothing on this
list is newly invented — it's every real gap already surfaced across
`deal-flow-roadmap.md`, `backend-and-ai-agent-plan.md`,
`legal-considerations-germany.md`, and
`salesforce-dealerteam-integration-plan.md`, plus a fresh code sweep
(grep for TODO/placeholder/fake/sandbox/"not wired up"), pulled into one
place and organized by **who can actually move each item** — because
most of what's left isn't a coding task, and pretending otherwise would
just mean guessing at real business/legal facts instead of asking for
them.

## A. Fixed today, in this pass

- **"TESTING — Jump to Step" is now actually gated**, not just
  commented as dev-only. Wrapped in `__DEV__` (`deal/index.tsx`) — true
  in Expo Go/dev builds, false in a real release build (TestFlight, App
  Store, Play Store, an EAS production profile), so it's physically
  incapable of shipping to a real customer now, not just "isn't
  supposed to."
- **Camera/photo-library permission strings in `app.json` were stale.**
  They only mentioned "scan a VIN barcode and take photos of your car"
  — didn't mention license photos or deal documents, both real uses of
  the same camera/library permission now. Reviewers on both stores
  check that the permission description actually matches what the app
  does with it; updated both `expo-camera` and `expo-image-picker`
  plugin config to list every real use.
- **Added `.env.example`** — documents the exact env vars the server
  routes actually read (`ANTHROPIC_API_KEY`, `PAYPAL_CLIENT_ID`,
  `PAYPAL_CLIENT_SECRET`, optional `PAYPAL_API_BASE`), no secrets in it,
  `.env` itself already correctly gitignored (verified: never
  committed). Purely so setting up a real deployment doesn't mean
  reverse-engineering which vars matter from source.
- **This checklist itself** — so "what's left before launch" lives in
  one place instead of being scattered across four docs a new reader
  (or future me) would have to reassemble by hand.
- **Real Supabase auth, code-complete.** Terry picked the backend
  platform (Supabase) and decided account ownership (his "European
  Living" org for now, treated as UCG's) — see
  `backend-and-ai-agent-plan.md`'s "Real auth — SHIPPED" section for
  what actually shipped: `auth-context.tsx` uses real email/password
  auth the moment Supabase credentials exist, falls back to the old
  local stand-in until they do. **Only remaining step is Terry actually
  creating the Supabase project** — nothing else is blocked on more
  code.

## B. Real work, buildable in code, not yet done

Nothing currently on this list — every remaining gap I could find
either needs a real backend that doesn't exist yet (bucket C) or a
decision only Terry/UCG can make (bucket D). Flagging this explicitly
rather than padding the list: e.g. a customer-facing "I sent the wire"
checkbox for the cash path was considered and deliberately **not**
built here, because the actual business process is UCG confirming
receipt, not the customer self-certifying — building a toggle with no
real backend behind it would look like a working feature while doing
nothing, which is exactly the kind of thing this project has
deliberately avoided elsewhere (no fake WhatsApp send, no fake PayPal
charge, honest "not connected yet" states). If you want a customer-side
placeholder anyway (even knowing it's cosmetic), say so and I'll build
it — but I won't add it silently.

## C. Blocked on a real backend existing

The single biggest thing standing between "demo" and "live." Full design
already written in `backend-and-ai-agent-plan.md` — restating only what
it changes about launch-readiness:

- **Auth — DONE and proven working, Sept 2.** Supabase project created
  (org "Lombardi Enterprises," project "UCG App," eu-west-2/London),
  real credentials added, and a real signup produced a real, confirmed
  user in Supabase's dashboard. Two small non-blocking loose ends:
  confirmation emails redirect to a placeholder `localhost:3000` (Site
  URL was never set — cosmetic, doesn't actually block confirmation,
  low priority to fix), and the confirmation email is branded
  "Supabase Auth" (fix chosen: Resend custom SMTP, blocked on DNS
  access to usedcarguys.net — someone else controls it, Terry needs to
  loop them in). Also newly known: a real "tap the email link, land
  back in the app" round-trip needs a dev-client/standalone build —
  Expo Go can't be deep-linked into. See
  `backend-and-ai-agent-plan.md`'s "Real auth" section for full detail.
- **"View Contract"** (`deal/index.tsx`) — honestly shows "isn't wired
  up yet" rather than faking a document. Needs real contract
  storage/e-signature, which needs the backend first.
- **DealerTeam/Salesforce sync** — `salesforce-dealerteam-integration-plan.md`'s
  entire Phase 1b/2/3 is blocked on UCG actually getting DealerTeam API
  access, which is still an open question for the owners (per the
  commit that flagged it). Every "waiting on UCG" step in the timeline
  today is a manual stand-in for what should eventually be a real
  DealerTeam read.
- **PayPal deposit is Sandbox-only.** Code-wise, going live is a
  credential + `PAYPAL_API_BASE` swap (see `.env.example`) — but live
  credentials don't exist until PayPal's Business account is verified,
  and the route only runs against a local dev server until real hosting
  exists. Also **no webhook handling yet** — the app only knows a
  payment succeeded because the client-side capture call returned
  `COMPLETED`, not because PayPal told the server directly. Fine for
  testing, not production-solid.
- **AI agent chat needs a real, funded `ANTHROPIC_API_KEY`** — degrades
  gracefully without one today, but "degrades gracefully" isn't the
  same as "works." Decided Sept 2: this key belongs to UCG, not Terry.
- **Real hosting, period.** Every server route (`chat+api.ts`,
  `paypal/*+api.ts`) currently only runs against `npx expo start`'s
  local dev server. None of this is reachable by a real customer's
  phone yet, independent of any credential being live.
- **Document/deposit data has no retention policy** because there's
  nowhere real for it to live yet — license photos, deal documents,
  deposit records are all currently local-device-only.

## D. Blocked on a decision only Terry/UCG can make

- **Real WhatsApp number.** `salesperson.whatsapp` (`mock-data.ts`) is
  still `491700000000` — a fake number that's been a placeholder since
  this file's first version, reaches no one. Every WhatsApp touchpoint
  in the app reads this one constant, so it's a one-line fix once a
  real number exists — but needs UCG's actual WhatsApp Business number,
  and a decision on whose number it actually is now that a specific
  named "Marcus" may not reflect real salesperson assignment.
- **Multiple salespeople per location** — genuinely undecided (see
  `deal-flow-roadmap.md`'s "Open question" section). The whole app
  currently hardcodes one salesperson.
- **Lender "search function."** Terry asked for a way to find where a
  financing application should go beyond the two named lenders.
  Building it now would mean fabricating a directory or a search
  target that doesn't exist — needs Terry to say what it should
  actually search (a fixed UCG-approved list? something else?).
- **"More steps between 5 and 6, a lot more."** Flagged, not yet
  specified. The 7-step timeline is a real simplification of whatever
  UCG's actual process is between Contract Signed and Car Ready —
  needs Terry to enumerate what's missing.
- ~~Who owns the backend platform account~~ **Resolved Sept 2** —
  Supabase, Terry's org for now, treated as UCG's. See bucket C above.
- **EU-spec Purchase Order / Cost Estimate documents** — not yet
  scoped beyond "a cost estimate," per `deal-flow-roadmap.md`.
- **Deposit currency** — USD only right now; does a EUR option matter
  for EU-spec cars?
- **Failed/abandoned PayPal checkout** — retry? does the hold expire?
  does the salesperson get notified? Not decided.

## E. Blocked on legal counsel — cannot ship without this

The highest-stakes bucket. Full research in
`legal-considerations-germany.md` — **none of it is legal advice**,
all of it exists to make the actual conversation with a lawyer faster,
not to substitute for one.

- **§312g BGB distance-contract withdrawal risk** — flagged as the
  single most important open legal question in the whole project:
  whether this app's sales flow counts as a "distance contract"
  carrying a statutory right of withdrawal on a *completed car sale*.
  Recommended as the first thing to bring to counsel, before anything
  else on this list.
- **Published Privacy Policy** — mandatory the moment the app collects
  real account data. A draft exists (`privacy-policy-draft.md`) but
  needs a lawyer's actual review before it's publishable, given GDPR +
  operating in Germany.
- **Impressum** — a German-specific requirement distinct from a privacy
  policy. Draft exists (`impressum-template.md`), same "needs real
  review" caveat.
- **GDPR posture generally** — data residency, retention rules for
  license photos/documents, what DealerTeam sync sharing customer data
  with a third party means for disclosure requirements. Needs a real
  answer before real customer PII is stored anywhere.

## F. App Store / Google Play submission requirements

Store-specific, worth its own list since these are easy to miss until
submission day and some overlap with buckets C/E above:

- **Apple App Privacy "Nutrition Label" / Google Play "Data Safety"
  section** — mandatory declarations of exactly what's collected, why,
  and whether it's shared with anyone (relevant the moment DealerTeam
  sync becomes real).
- **Apple requires self-service account deletion** (Guideline
  5.1.1(v)) once real accounts exist — "Reset Test Data"
  (`account.tsx`) is deliberately positioned as the seed of this real
  feature, not just a dev tool (unlike "Jump to Step," it's meant to
  stay visible), but its copy/framing should be revisited once
  `auth-context.tsx` is backed by a real account instead of a local
  stand-in.
- **Published Privacy Policy URL** — required at submission time on
  both stores; see bucket E.
- **App icons/screenshots/store listing copy** — not audited in this
  pass; not a code question, flagging so it isn't forgotten.
- **EAS Build/Submit configuration** — no `eas.json` exists yet in this
  repo. Needed before a production build can be cut for either store;
  genuinely buildable now if useful, but has no effect until there's
  something worth submitting.

## Suggested order

1. **§312g BGB question to counsel** (bucket E) — highest stakes, and
   the answer could reshape the sales flow itself, so worth knowing
   before investing more engineering time downstream of it.
2. **Backend platform decision** (bucket C/D) — unblocks real auth,
   real document storage, real "View Contract," and is a prerequisite
   for the Privacy Policy/Data Safety declarations even being accurate.
3. Everything else in bucket D that's just "Terry needs to answer a
   question" — cheap to resolve, no reason to leave sitting.
4. Store submission prep (bucket F) once B/C/D/E have real answers to
   declare truthfully.

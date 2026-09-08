<div align="center">

<img src="brand/ucg-logo-full.png" alt="Used Car Guys" width="320" />

# Used Car Guys — Mobile App

**Browse the lot. Meet your specialist. Track the deal from application to plates.**
An Expo / React Native app for [Used Car Guys](https://www.usedcarguys.net) — a dealership serving U.S. military stationed in Germany.

<br />

![Expo SDK](https://img.shields.io/badge/Expo_SDK-57-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Expo Router](https://img.shields.io/badge/Expo_Router-file--based-000020?logo=expo&logoColor=white)
![Powered by Claude](https://img.shields.io/badge/AI_agent-Claude-D97757?logo=anthropic&logoColor=white)

![Platforms](https://img.shields.io/badge/platforms-iOS_|_Android_|_Web-4630EB)
![License](https://img.shields.io/badge/license-MIT-green)
![Last commit](https://img.shields.io/github/last-commit/TerryL1971/UCG-App)
![Repo size](https://img.shields.io/github/repo-size/TerryL1971/UCG-App)
![Languages](https://img.shields.io/github/languages/top/TerryL1971/UCG-App)

</div>

---

## Table of Contents

- [Why this app](#why-this-app)
- [The customer journey](#the-customer-journey)
- [Feature tour](#feature-tour)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Screen map](#screen-map)
- [Project layout](#project-layout)
- [Design decisions worth knowing](#design-decisions-worth-knowing)
- [Still mocked / not wired up](#still-mocked--not-wired-up)
- [Known gaps](#known-gaps)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why this app

Buying a car in the U.S. military community in Germany has moving parts a normal
dealership app never touches — a USAREUR driver's license, a PCS timeline, DEN vs.
DE registration, VAT forms, a Vehicle Registration Office checklist. This app walks
a customer through the whole thing: **find a car → open a real deal → get matched
with a specialist → track every step → drive to plates → and (eventually) sell it
back.**

The guiding principle throughout: **when something isn't wired up yet, the app says
so honestly** rather than faking it. Every "not connected yet" message in here is
deliberate.

---

## The customer journey

```
Onboarding → Browse the lot → Car detail → Start Your Deal (intake)
     → Meet Your Specialist (AI agent) → Hold the car ($300 deposit)
     → My Deal timeline  ──►  Documents · Financing · Contract · Road to Plates
     → Picked up 🎉 (photo + share + Google review)
                                             └─►  Sell It Back  (own tab)
```

Five tabs: **Browse · Saved · My Deal · Sell Back · Account.**

---

## Feature tour

### 🚗 Live inventory, straight off the real site
Browse and Car Detail read real cars from usedcarguys.net
([`src/lib/ucg-inventory.ts`](src/lib/ucg-inventory.ts)). There's no public API yet, so
this is a scraper against the public pages — it fails gracefully with a visible
error, and [`docs/wordpress-inventory-api-spec.md`](docs/wordpress-inventory-api-spec.md)
specs the endpoint it should become.

### 📝 "Start Your Deal" — a real intake, not a straight shot to a salesperson
There's no real deal (and no timeline) until someone knows cash vs. financed, which
base the customer is headed to, and where they stand on a license.
[`src/app/deal-intake.tsx`](src/app/deal-intake.tsx) gathers exactly that:

<details>
<summary><b>What the intake collects</b></summary>

- A **swipeable gallery of the car's own photos** at the top — so the customer
  doesn't lose the photos the moment they leave the detail page.
- Name, contact (explicitly WhatsApp), and destination base — a curated list of
  major U.S. military communities in Germany, plus free-text "Other".
- Cash or financing, with lender / down-payment fields that appear only once
  financing is picked.
- **USAREUR driver's license status** — genuinely researched, not invented.
  Primary link is [JKO](https://jko.jten.mil/) (course *USA 007*, exam *USA 007B*,
  60-day-valid cert), the actual exam a family member can take online before a PCS.
  The app warns that JKO's "connection is not private" browser warning is a known
  DoD-PKI quirk and safe to continue through. Study-first secondary link points at
  the U.S. Army's own official page. Passing score (85%+) and the arrival-day
  checklist (printed cert, stateside license, DoD ID/CAC, $30 fee, on-site vision
  check) are corroborated against the official Army Garrison page.
- Already licensed? Scan **front and back** of the card straight into the app.
- Submitting **opens WhatsApp pre-filled** with everything above. Button reads
  "Submit for a Salesperson" — a location can have more than one, and assignment
  is still an open question.

</details>

### 🤖 "Meet Your Specialist" is a real AI agent
[`src/app/salesperson.tsx`](src/app/salesperson.tsx) is an in-app chat backed by a real
Expo Router API route ([`src/app/api/chat+api.ts`](src/app/api/chat+api.ts)) that calls
the Claude API (Haiku 4.5, cost-limited). The system prompt is built entirely from
**real, verified content** — the actual USAREUR licensing process, real 1-yr / 2-yr
warranty terms, real locations — not guesses. The Anthropic key lives only in the
server route, never in the shipped app. No key set? The chat still works, every
reply an honest "a specialist will follow up" fallback.

### 💳 A real PayPal deposit flow
"Hold This Car — Make a Deposit" opens [`src/app/deposit.tsx`](src/app/deposit.tsx),
which puts a **5-day hold** on a car via real **PayPal Sandbox** checkout — server
routes ([`create-order`](src/app/api/paypal/create-order+api.ts) /
[`capture-order`](src/app/api/paypal/capture-order+api.ts)) create and capture a real
Orders API order, opened in-app via `expo-web-browser` and returned by deep link.
Going live later is a credential swap, not a rewrite. **The deposit is a flat
$300.00 USD** — a real decision. No graceful fallback here: missing credentials fail
with a visible error rather than walking someone into a payment they can't finish.

### 🛣️ The journey timeline is a winding road, not a progress bar
[`src/components/timeline-road.tsx`](src/components/timeline-road.tsx) — an SVG road
curving down the screen, each step a road-sign marker (status by color:
done / current / upcoming). Highlights:

| | |
|---|---|
| **Back / forward review** | Step through any *already-reached* stop to review it; forward is capped at where the deal actually stands. |
| **Who's it waiting on** | Every step shows You / UCG / the Bank — the real question this screen answers. |
| **Persistent detail panel** | Matched → specialist card, Documents → real list, Financing → loan terms, Car Ready → photo, Picked Up → camera + share + review. |
| **Landscape mode** | Only the My Deal tab unlocks rotation; the road reflows left-to-right on a horizontally scrolling canvas. Re-locks to portrait on unmount. |
| **Distance-scaled animation** | Drive duration scales with distance traveled; completed road fades out behind the car and fades back in as you reverse — driven by one continuous `progress` value via `react-native-svg` + Reanimated `useAnimatedProps`. |

Two earlier versions (straight-line tap-to-expand, then a first road pass) are intact
in git history — this is still an experiment, not a settled design.

### 📸 Camera & photos, done properly
- **VIN barcode scanning** ([`scan-vin.tsx`](src/app/scan-vin.tsx), `expo-camera`) —
  scans the Code 39 sticker instead of typing 17 characters; falls back to manual entry.
- **Sell It Back photo grid** — open-ended (up to 15), take or pick, tap to
  replace/remove. Matches the real 8–10+ condition-photos-per-car workflow.
- **Auto-resize, not just compress** ([`src/lib/image.ts`](src/lib/image.ts)) — every
  photo downscaled to 1024px on the long side before it's kept.
- **"Picked Up" camera** — snap the customer with their car, share straight to
  Instagram / Facebook / Messages via the native share sheet, then "Leave a Google
  Review" opens the right one of UCG's **six** per-location Google listings.

### 🔧 The stuff that happens after you pay
Dedicated screens for the parts a normal app skips: **Your Road to Plates**
([`road-to-plates.tsx`](src/app/road-to-plates.tsx)), **VRO Checklist** for clearing a
car ([`vro-checklist.tsx`](src/app/vro-checklist.tsx), real USAG Stuttgart form
550-175B), real generated PDFs (Purchase Order, Cost Estimate, Bill of Sale —
[`deal-paperwork.tsx`](src/app/deal-paperwork.tsx)), an **Add-ons hub** with a running
total (Winter Tires, Paint Protection, Warranty, Insurance referral), and a
**Service Center** screen whose address opens directions.

### ✅ Everything else that's actually real
Saved cars share real state · Create Account / Log In forms with validation · Sessions
persist (AsyncStorage) and returning users skip onboarding · Sell It Back pre-fills
the VIN if you bought the car here · "Reset Test Data" clears account, chosen car,
intake, timeline progress, saved cars and pending VIN scan in one tap · choosing a
new car starts the deal fresh.

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | **Expo SDK 57** · React Native 0.86 · React 19.2 (React Compiler on) |
| Routing | **Expo Router** — file-based, typed routes, `+api.ts` server routes |
| Language | TypeScript 6 |
| UI / motion | `react-native-reanimated` 4 · `react-native-svg` · `expo-linear-gradient` · Barlow / Barlow Condensed (brand fonts) |
| Device | `expo-camera` · `expo-image-picker` · `expo-image-manipulator` · `expo-screen-orientation` · `expo-sharing` · `expo-print` |
| Backend (partial) | Supabase (auth, gated on credentials) · Expo Router API routes for Claude + PayPal |
| AI | `@anthropic-ai/sdk` — Claude Haiku 4.5, server-side only |
| Payments | PayPal Orders API (Sandbox) |

> **Why SDK 57 and not "latest":** pinned on purpose. Expo Go only ever runs one
> SDK line, so the project either matches the published Expo Go app or device
> testing breaks. Re-check Expo Go's supported SDK before bumping — see
> [AGENTS.md](AGENTS.md).

---

## Quick start

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS / Android) on a phone on the same Wi-Fi.

```bash
npm run ios       # open in the iOS simulator
npm run android   # open on an Android emulator/device
npm run web        # run in the browser
npm run lint       # expo lint
```

---

## Environment variables

Copy [`.env.example`](.env.example) → `.env` at the project root (already gitignored —
**never commit real values**). Everything degrades gracefully except the deposit flow.

| Variable | Powers | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI specialist chat ([`chat+api.ts`](src/app/api/chat+api.ts)) | Chat still works; every reply is an honest "a specialist will follow up" fallback |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Deposit flow ([`deposit.tsx`](src/app/deposit.tsx)) | Deposit button fails with a **visible error** — no graceful fallback, by design |
| `PAYPAL_API_BASE` | *(optional)* PayPal host | Defaults to Sandbox. Only set to `api-m.paypal.com` when genuinely ready for real money |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Real Supabase auth ([`supabase.ts`](src/lib/supabase.ts)) | Auth stays in local on-device stand-in mode |

> Keys never ship inside the app — they're read only by `+api.ts` server routes,
> which Expo Router excludes from the client bundle. Works against `npx expo start`'s
> dev server as-is; a published app needs real hosting for those routes first — see
> [`docs/backend-and-ai-agent-plan.md`](docs/backend-and-ai-agent-plan.md).

---

## Screen map

<details>
<summary><b>All screens (Expo Router — <code>src/app/</code>)</b></summary>

| Route | Purpose |
|---|---|
| `index.tsx` | Onboarding |
| `(tabs)/index.tsx` | Browse the lot |
| `(tabs)/saved.tsx` | Saved cars |
| `(tabs)/deal/index.tsx` | My Deal timeline (the winding road) |
| `(tabs)/deal/documents.tsx` | Deal documents |
| `(tabs)/sell-back.tsx` | Sell It Back |
| `(tabs)/account.tsx` | Account + Reset Test Data |
| `car/[id].tsx` | Car detail |
| `deal-intake.tsx` | Start Your Deal |
| `capture-license.tsx` | Scan USAREUR license front/back |
| `scan-vin.tsx` | VIN barcode scanner |
| `salesperson.tsx` | Meet Your Specialist (AI chat) |
| `deposit.tsx` | $300 PayPal hold |
| `deal-paperwork.tsx` | Generated PDFs — Purchase Order / Cost Estimate / Bill of Sale |
| `wire-instructions.tsx` | Cash-wire payment instructions |
| `road-to-plates.tsx` | What happens after you pay |
| `vro-checklist.tsx` | Clearing your car (form 550-175B) |
| `add-ons.tsx` | Add-ons hub + running total |
| `warranty.tsx` · `winter-tires.tsx` · `paint-protection.tsx` · `insurance.tsx` | Individual add-on screens |
| `service.tsx` | Service Center |
| `create-account.tsx` · `log-in.tsx` | Auth forms |
| `api/chat+api.ts` | Claude chat server route |
| `api/paypal/*+api.ts` | PayPal create / capture order |

</details>

---

## Project layout

```
src/
  app/            Screens (Expo Router file-based routing) + api/ server routes
  components/     Shared UI — buttons, chips, fields, car card, avatar,
                  timeline-dot, timeline-road (the SVG road), animated splash
  constants/      Theme (brand colors/fonts) + mock data + AI prompt + checklists
  lib/            Live inventory scraper; deal / saved / auth / intake / docs /
                  license / warranty / vin-scan contexts; image resize; maps;
                  paypal-server; supabase; deal-sync/ (Salesforce adapter seam)
  hooks/          use-color-scheme

brand/            Source logo files + extracted brand colors
design-mockup/    The original Claude Design canvas this app was built from
assets/           App icons, splash, favicon
docs/             Specs & plans for integrations we're waiting on:
                  · wordpress-inventory-api-spec       · salesforce-dealerteam-integration-plan
                  · backend-and-ai-agent-plan          · deal-flow-roadmap
                  · end-to-end-flow · product-vision   · pre-launch-checklist
                  · vro-checklists · purchase-paperwork
                  · legal-considerations-germany + draft privacy-policy / impressum
                    (not legal advice — starting points for counsel)
```

---

## Design decisions worth knowing

<details>
<summary><b>The chosen car carries through the whole flow</b></summary>

Tapping "Choose This Car" is tracked in-memory ([`src/lib/deal-context.tsx`](src/lib/deal-context.tsx))
so the salesperson and timeline screens reference the actual car, not a placeholder.
Choosing a *different* car resets everything that car determines.
</details>

<details>
<summary><b>Pre-Buy Inspection lives in Sell It Back, not car detail</b></summary>

A pre-buy inspection is UCG inspecting a car it's about to buy *from a customer* — so
it's gated behind a real submit → "awaiting your accept" → "offer accepted" flow in
Sell It Back. No fake dollar figure (there's no pricing backend). Opens UCG's actual
Microsoft Bookings calendar for Ramstein/KMC.
</details>

<details>
<summary><b>Everything routes through WhatsApp, not tel: / sms:</b></summary>

`whatsappChatUrl` in `mock-data.ts`. One honest limit: WhatsApp has no auto-dial, so
"Call" opens the chat (one tap from the real call button inside WhatsApp) rather than
faking a one-tap call. `wa.me` links can't auto-attach photos, so license photos stay
in the app and the message just flags that they exist.
</details>

<details>
<summary><b>The deal-sync seam</b></summary>

[`src/lib/deal-sync/`](src/lib/deal-sync/) already has the adapter shape for a real
Salesforce **DealerTeam** DMS/CRM (`mock-deal-sync` today, `salesforce-deal-sync`
stubbed) — REST + Connected App for writes, Change Data Capture / Pub-Sub for
real-time reads, a backend proxy either way. See
[`docs/salesforce-dealerteam-integration-plan.md`](docs/salesforce-dealerteam-integration-plan.md).
</details>

---

## Still mocked / not wired up

| Area | Status |
|---|---|
| **Auth** | Forms validate and the app tracks a logged-in user across restarts, but sign-up / log-in accepts anything well-formed. No server, no password check, no token. Supabase path exists, gated on credentials. |
| **Salesperson assignment** | Hardcoded person in `mock-data.ts`. **The attached WhatsApp number (`491700000000`) is a placeholder that reaches no one.** Needs the DealerTeam API. |
| **Deal progress & documents** | Mock data — deliberately set further along than day one so the Car Ready photo and pickup camera are visible by default. |
| **Salesperson photo** | Illustrated placeholder ([`salesperson-avatar.tsx`](src/components/salesperson-avatar.tsx)); plan is admin-uploaded real photos with this as fallback. |
| **Document upload** | Honest "not connected yet" — no file-storage backend yet. (Photo attach on Sell It Back *is* real.) |

---

## Known gaps

- **The inventory scraper is inherently fragile** — it reads the site's current HTML,
  so a redesign of usedcarguys.net breaks it. Fails gracefully, doesn't self-heal.
- **Deal state is in-memory only** — closing the app loses it. Should move to a real
  backend once accounts exist.
- **The timeline road hasn't been fully checked on a real device.** Landscape mode
  already surfaced one real bug (safe-area side edges). The per-segment SVG fade
  animation is easy to get subtly wrong in ways TypeScript / Metro can't catch —
  worth confirming it animates smoothly before treating it as final. Clean revert
  available in git history.

---

## Roadmap

Written up in [`docs/deal-flow-roadmap.md`](docs/deal-flow-roadmap.md) and
[`docs/backend-and-ai-agent-plan.md`](docs/backend-and-ai-agent-plan.md):

- [ ] Real WordPress inventory API (retire the scraper)
- [ ] Salesforce DealerTeam sync — writes + real-time deal status
- [ ] Real backend for auth, deal state, and document storage (Supabase)
- [ ] Gate the actual timeline on the deal-intake (start a brand-new deal at step zero)
- [ ] Real WhatsApp Business number → re-add "Talk to a Human"
- [ ] Per-location Microsoft Bookings links + knowing which lot a car is on
- [ ] Hosting for the `+api.ts` routes → publishable app
- [ ] Management dashboard + Tier-2 AI agent

---

## License

[MIT](LICENSE).

<div align="center">
<sub>Built with Expo · Designed for the U.S. military community in Germany 🇺🇸🇩🇪</sub>
</div>

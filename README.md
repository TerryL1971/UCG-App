# Used Car Guys — mobile app

An Expo / React Native app for [Used Car Guys](https://www.usedcarguys.net) —
browse the lot, get matched with a specialist, track a deal from application
to pickup, and (eventually) sell a car back — for a dealership serving US
military stationed in Germany.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) on a phone on the same
Wi-Fi. This project is pinned to **Expo SDK 54** on purpose — see
[AGENTS.md](./AGENTS.md) for why (short version: the published Expo Go app
only supports SDK 54 as of writing; don't bump this without checking that
first, or device testing breaks).

## What's actually built

- **Onboarding → Browse → Car Detail → Salesperson match → Journey timeline
  → Documents → Sell it back** — the full flow, in the real brand
  (navy/red, Barlow/Barlow Condensed, the real logo). Sell It Back is a
  full tab of its own (Browse / Saved / My Deal / Sell Back / Account),
  not buried inside Account.
- **Live inventory.** Browse and Car Detail read real cars off
  usedcarguys.net (`src/lib/ucg-inventory.ts`) — there's no public API for
  this yet, so it's a scraper against the public pages. See
  [docs/wordpress-inventory-api-spec.md](./docs/wordpress-inventory-api-spec.md)
  for the real endpoint this should become.
- **The chosen car carries through the flow.** Tapping "Choose This Car"
  is tracked in-memory (`src/lib/deal-context.tsx`) so the salesperson and
  timeline screens reference the actual car, not a placeholder.
- **The journey timeline is a winding road with signs, not a straight
  line** (`src/components/timeline-road.tsx`) — an SVG road curving side
  to side down the screen, each step a small road-sign marker (one
  consistent shape, status shown by color — done/current/upcoming) rather
  than seven different novelty signs, which would've gotten visually
  noisy at phone size. A car icon marks whichever step is currently being
  viewed and crossfades into the customer's actual car photo when that's
  the final stop. **The car's position and the detail panel are driven by
  the same `viewedIndex`, not just a one-way reveal** — a back/forward
  control bar above the road (`reviewBar` in `deal/index.tsx`) lets you
  step through any *already-reached* step to review it; forward is capped
  at wherever the deal actually stands, so you can look back at history
  but can't drive into a future that hasn't happened yet. Whatever step
  is being viewed shows in a persistent panel above the road (not a modal
  you have to open) — Matched shows the salesperson's contact card,
  Documents the real document list, Financing the loan terms, Contract a
  signed confirmation, Car Ready the photo card, Picked Up the
  camera+share+review actions. Every step also shows **who it's waiting
  on** — You / UCG / the Bank (`waitingOn` on each step in
  `mock-data.ts`) — meant to answer the actual question this screen
  exists for: what's blocking the deal, and whose job is it to unblock it.
  **This replaced a straight-line, tap-to-expand-inline version of the
  same screen**, then that first road version replaced *itself* once
  (dots → signs, modal → persistent panel, one-way reveal → back/forward)
  after the first pass turned out to hide the pickup camera/review
  buttons behind a tap, which was a real regression, not just a style
  question. Both earlier versions are intact in git history if this one
  doesn't work out either — this is genuinely still an experiment, not
  a settled design.
- **The road can go landscape.** Only the My Deal tab unlocks rotation
  (`expo-screen-orientation` — unlocked on this screen's mount, re-locked
  to portrait on unmount so leaving the tab doesn't unlock rotation
  elsewhere in the app; every other screen stays portrait-only). Turn the
  phone sideways and the road reflows to run left-to-right across a
  horizontally-scrolling canvas instead of top-to-bottom — same
  waypoint/curve math, axes swapped (`horizontal` prop on `TimelineRoad`).
- **A real camera button on "Picked Up"** — snap a photo of the customer
  with their car and share it straight to whatever app you want
  (Instagram, Facebook, Messages…) via the native share sheet
  (`expo-sharing`), meant for posting to UCG's social pages. Next to it,
  a "Leave a Google Review" button opens a picker for UCG's six real
  locations (Ramstein, Kaiserslautern, Stuttgart, Spangdahlem,
  Grafenwoehr, Wiesbaden — `ucgLocations` in `mock-data.ts`) and opens
  that location's actual Google Business listing — UCG turns out to have
  a separate Google listing per lot, not one shared listing, so picking
  the right one matters. See the comment on `ucgLocations` for how these
  were found and verified (and for a real mistake this caught: an earlier
  version hardcoded a single review link that turned out to be a stale,
  unrelated identifier once actually checked against the real listings).
  Both this and every Call/Text touchpoint (salesperson match screen, the
  timeline's pinned bar) now go through **WhatsApp**
  (`whatsappChatUrl` in `mock-data.ts`), not the native phone/SMS apps.
  One honest limit: WhatsApp doesn't publish a way to auto-dial a voice
  call the way `tel:` does, so "Call" opens the WhatsApp chat too (one
  tap from the real call button inside WhatsApp) rather than faking a
  one-tap call that wouldn't actually work.
- **Saving a car actually saves it.** The heart button on a car card and
  the Saved tab share real state (`src/lib/saved-context.tsx`), not just a
  per-card toggle that went nowhere.
- **Real Create Account / Log In screens** (`src/app/create-account.tsx`,
  `src/app/log-in.tsx`) — actual forms with validation, not a dead bypass.
  "Browse without an account" still skips straight in, on purpose.
- **Sell It Back knows if you bought the car from us.** If the car you're
  selling back is the one you chose earlier in the app, the form recognizes
  it and pre-fills the VIN (`src/app/(tabs)/sell-back.tsx`, reads
  `deal-context`). If not, it's just a normal blank form — works either way.
- **VIN barcode scanning** (`src/app/scan-vin.tsx`, `expo-camera`) — scans
  the Code 39 barcode on a VIN sticker instead of making someone type all
  17 characters. Falls back to manual entry if camera permission is denied
  or scanning doesn't work out.
- **Real photo attach on Sell It Back** (`expo-image-picker`) — an open-
  ended grid, not a fixed count: take a photo or choose from the library,
  tap the **+** tile to keep adding (up to 15 — a soft ceiling, not a
  realistic limit), tap an existing photo for Replace/Remove. Matches the
  actual dealership workflow of 8-10+ condition photos per car.
- **Photos are auto-resized, not just compressed** (`src/lib/image.ts`,
  `expo-image-manipulator`) — every photo is downscaled to 1024px on the
  long side before it's kept, since a phone camera photo can be several MB
  at full resolution and that adds up fast across a batch. Resizing the
  actual dimensions is what shrinks file size; JPEG quality alone on a
  huge image doesn't.

- **Staying logged in.** Sessions persist (AsyncStorage) — closing and
  reopening the app remembers you, and returning logged-in users skip
  onboarding entirely instead of re-typing their info every time.

## What's still mocked / not wired up

- **Auth is a stand-in** (`src/lib/auth-context.tsx`) — the forms validate
  properly and the app genuinely tracks a logged-in user (shows their real
  name/email on the Account tab, supports logging out) across app restarts,
  but signing up or logging in accepts anything well-formed. There's no
  real backend, no password check, no server-issued token — just a name
  and email saved locally.
- **Salesperson assignment** is a hardcoded person (`src/constants/mock-data.ts`)
  — this is the piece that needs the Salesforce Dealer Team API.
- **Deal progress** (application submitted, financing approved, etc.) and
  **documents** are also mock data — pending whatever system actually
  tracks financing status. It's deliberately set further along than a
  brand-new deal (`dealSteps` in `mock-data.ts`, "Picked Up" as the
  current step) so the Car Ready photo and pickup camera are visible by
  default instead of requiring someone to hand-edit the file to see them.
- **The salesperson's photo** is an illustrated placeholder
  (`src/components/salesperson-avatar.tsx`) — the plan is admin-uploaded
  real photos, with the illustration as a fallback when none is set.
- **Document upload** (on the Documents tab) still shows an honest "not
  connected yet" message — no file storage backend exists for it yet.
  Photo attach on Sell It Back is real now (see above); documents aren't.

## Project layout

```
src/
  app/           Screens (Expo Router — file-based routing)
  components/    Shared UI (buttons, chips, icons, car card, avatar, timeline dot)
  constants/     Theme (brand colors/fonts) + remaining mock data
  lib/           Live inventory scraper, deal/saved/auth/vin-scan contexts
brand/           Source logo files + extracted brand colors
design-mockup/   The original Claude Design canvas this app was built from
docs/            Specs for integrations we're waiting on (WordPress API)
```

## Known gaps worth knowing about

- The inventory scraper is inherently fragile — it reads the site's current
  HTML structure directly, so a redesign of usedcarguys.net will break it.
  It fails gracefully (shows an error, doesn't crash) but won't self-heal.
- Deal state (`deal-context.tsx`) is in-memory only — closing the app loses
  it. That's fine for now; it should move to a real backend once accounts
  exist.
- **The timeline road (`timeline-road.tsx`) still hasn't been checked on a
  real device** — the geometry (S-curve waypoints, sign label placement,
  car animation, photo crossfade, the back/forward control bar) is all
  hand-computed, not visually verified. It compiles and bundles clean on
  both web and iOS targets, but "compiles" isn't "looks right" for
  something this visual. Check it on your phone before treating it as
  final; it's a clean revert (see the note above) if it doesn't land.

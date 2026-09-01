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
- **"Choose This Car" leads to a real intake, not straight to a
  salesperson with nothing behind it.** There's no real deal — and so no
  real timeline — until someone knows cash vs. financed, which base the
  customer's headed to, and where they stand on a license. The new
  **Start Your Deal** screen (`src/app/deal-intake.tsx`) gathers exactly
  that before the salesperson-match screen, standing in for what a
  salesperson would type into Dealer Team (Salesforce) to open a real
  deal (`DealIntake` in `mock-data.ts`, held in-memory by
  `src/lib/deal-intake-context.tsx`):
  - A **swipeable gallery of the car's own photos** at the top of the
    screen (all of `car.images`, same pattern as the detail page) — added
    after David's first look at the app surfaced that the customer loses
    access to the car's photos the moment they leave the detail page.
  - Name, a way to reach them, and which US base they're headed to (a
    curated list of major US military communities in Germany, plus a
    free-text "Other" — the list will always be incomplete, so it doesn't
    pretend otherwise).
  - Cash or financing, with lender/down-payment fields that only appear
    once financing is picked.
  - **USAREUR driver's license status** — genuinely researched, not
    invented, and corrected twice in one afternoon by actually checking
    what got reported back: the original practice-test link 404'd on a
    real device, got independently reproduced (dead site, not a typo, so
    it's gone for good, not re-added later), and got swapped for the U.S.
    Army's own official page. Terry then pasted that page's full text back
    while checking the fix, which caught a second thing: it's not an
    interactive practice test (correctly labeled as a study-first
    secondary link now, not "Practice the Test"), but it also revealed
    [JKO](https://jko.jten.mil/) isn't CAC-gated the way the first pass
    assumed — non-CAC family members can get a free sponsored account —
    so JKO ("USA 007" the course, "USA 007B" the exam, 60-day-valid
    certification) is now the **primary** link, since it's the actual
    exam, doable online before a PCS move, not a proxy for it. Also
    explicitly **not** linked: two Quizlet flashcard sets Terry found
    while double-checking — user-submitted content for a real government
    exam that neither of us could verify (Quizlet 403's this app's own
    fetch tooling), and Terry raised the same accuracy concern
    independently before it was even asked — and held up again when a
    separate AI-generated answer Terry checked repeated the same
    unverifiable claim about one of those sets, which isn't
    confirmation of it. One more real, reproducible finding along the
    way: fetching a direct JKO login URL failed with the exact signature
    of a DoD PKI certificate not being in a normal device's trust store
    (confirmed via search as a common, well-documented experience, not
    just this app's tooling) — so the app now warns right next to the
    JKO button that a "connection is not private" browser warning is
    normal there and safe to continue through, instead of letting it
    look like a broken link. Also added, once corroborated by the
    official Army Garrison page itself: the 85%-or-higher passing score
    and the arrival-day checklist (printed certificate, stateside
    license, DoD ID/CAC, $30 fee, on-site vision check). If they already
    have a license, they scan **both the front and back** straight into
    the app
    (same `expo-image-picker` + `compressPhoto` pattern as Sell It Back's
    photo grid, two slots here) instead of bringing the physical card in
    later.
  - Submitting **opens WhatsApp with everything above pre-filled** as a
    message (`whatsappChatUrl(salesperson.whatsapp, message)` — the same
    helper, now used with its optional message argument for the first
    time). The button reads **"Submit for a Salesperson"**, not "Send to
    My Salesperson" — a location can have more than one salesperson and
    how that gets assigned is still an open question (see
    [docs/deal-flow-roadmap.md](./docs/deal-flow-roadmap.md)), so the copy
    stopped presuming a specific person before that's decided. One honest
    limit: WhatsApp's `wa.me` links can't attach a photo automatically, so
    the license photos stay saved in the app and the message just flags
    that they're there — documented in-app, not silently pretended to
    work.
  - The salesperson-match screen shows a short confirmation once intake
    was submitted ("Marcus already has what you sent — Ramstein / KMC,
    financing...") instead of acting like the two screens don't know about
    each other.
  - **What this doesn't do yet, on purpose:** it doesn't change
    `dealSteps`/the timeline itself — that's still the same
    further-along-than-day-one mock it always was. Gating the *actual*
    timeline on this intake (starting a brand-new deal at step zero, etc.)
    is a real next step, not done here — the user asked to leave the
    timeline alone for now while this got built. What comes *after* this
    screen — a deposit/hold step, a warranty upsell, an insurance
    referral, and more — is written up, not built yet, in
    [docs/deal-flow-roadmap.md](./docs/deal-flow-roadmap.md).
- **Book a real Pre-Buy Inspection from the car detail screen.** A
  secondary button above "Choose This Car" opens UCG's actual Microsoft
  Bookings calendar for Ramstein/KMC (`ucgLocations[].bookingUrl` in
  `mock-data.ts`). Only that one location's link exists so far, so the
  button is honestly labeled "(Ramstein)" rather than presented as
  universal — the other five locations' links, and a way to know which
  lot a given car is actually at, are both still needed (see
  [docs/deal-flow-roadmap.md](./docs/deal-flow-roadmap.md)).
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
  Fixed a real bug found on first use: the screen's `SafeAreaView` only
  reserved the `top` edge, which is fine in portrait but wrong in
  landscape — the notch/dynamic island moves to a *side* edge when
  rotated, so `top`-only was leaving that side completely unprotected.
  Now reserves `top`, `left`, and `right`.
- **The road drives slower, and completed road fades away behind you as
  you go** — a real animation redesign, not just a speed tweak. Duration
  now scales with distance traveled (a full drive feels like a real trip,
  a single back/forward step still feels snappy) instead of a fixed
  650ms. Each road segment and its sign fade out together once the car
  has driven a step past them, and fade back in as the car retreats —
  driven by the same continuous `progress` value that positions the car,
  so pressing Back doesn't just move the car backward, it un-fades the
  road behind it step by step. Segments are individually animatable via
  `react-native-svg`'s `Animated.createAnimatedComponent(G)` +
  Reanimated's `useAnimatedProps` (the SVG-specific pattern — plain
  `useAnimatedStyle` doesn't drive SVG props the way it drives RN View
  styles). This fades the road to transparent rather than truly tucking
  it behind the header/detail-panel chrome via z-index — a lighter-weight
  version of "disappears" that reads the same but doesn't require
  restructuring the screen into overlapping layers.
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
  — this is the piece that needs the Salesforce Dealer Team API. DealerTeam
  turns out to be a real, Salesforce-native DMS/CRM (confirmed, not
  assumed — see
  [docs/salesforce-dealerteam-integration-plan.md](./docs/salesforce-dealerteam-integration-plan.md)
  for the architecture plan: REST API + Connected App for writes, Change
  Data Capture + Streaming/Pub-Sub API for real-time reads, a backend
  proxy either way since Salesforce credentials can't live in the app).
  The new deal-intake screen (below) is Phase 0 of that plan — it gathers
  real structured info but still hands it off by WhatsApp message, not an
  API call, since none of the above exists yet.
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
docs/            Specs/plans for integrations we're waiting on (WordPress
                 inventory API, Salesforce DealerTeam sync), the deal-flow
                 roadmap (deposit, warranty, referrals, DEN/VAT, more), the
                 real-backend + management-dashboard + AI-agent plan, and
                 Germany/EU legal research + draft Privacy Policy/Impressum
                 (none of it legal advice — starting points for counsel)
```

## Known gaps worth knowing about

- The inventory scraper is inherently fragile — it reads the site's current
  HTML structure directly, so a redesign of usedcarguys.net will break it.
  It fails gracefully (shows an error, doesn't crash) but won't self-heal.
- Deal state (`deal-context.tsx`) is in-memory only — closing the app loses
  it. That's fine for now; it should move to a real backend once accounts
  exist.
- **The timeline road (`timeline-road.tsx`) still hasn't been fully
  checked on a real device** — landscape mode surfaced one real bug
  already (the safe-area edges fix above), which is exactly the kind of
  thing that only shows up on an actual device, not in a bundler check.
  The newer per-segment fade animation (SVG `G` + `useAnimatedProps`) is
  a pattern that's easy to get subtly wrong in ways TypeScript/Metro
  can't catch — worth specifically confirming the fade actually animates
  smoothly (not just cuts on/off) before treating it as final. Still a
  clean revert if any of this doesn't land — see the note above.

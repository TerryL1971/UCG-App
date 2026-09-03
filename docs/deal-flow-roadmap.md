# Deal flow roadmap — what's next after "Start Your Deal"

Notes from David's first real look at the app (Aug 31), captured in full
so nothing gets lost — Terry had two minutes and more to say. Nothing
below is built yet except where marked **(shipped)**. Treat this as the
backlog for the deal-intake → My Deal pipeline, roughly in the order a
real customer would hit it.

## Shipped Sept 3

- **Service Center hub — open to non-customers.** New `/service` screen
  (`src/app/service.tsx`) + `src/constants/service-center.ts` with real
  content from usedcarguys.net/service-center/ (fetched Sept 3): oil
  changes, scheduled maintenance, brakes, windshield, accident repair, UCG
  warranty work, wheels & tires. Every action hands off to UCG's own
  hosted forms — appointment request (`/book/`), tire quote
  (`/service-center/tires-and-wheels/`), warranty assistance (`/warranty/`)
  — plus direct call / WhatsApp (wa.me/491737656926, the number the page
  links) / email / the Ramstein Superstore address. No in-app scheduling,
  no Microsoft Bookings (unlike Pre-Buy Inspection). Reachable without a
  deal or an account: a "Service" pill in the Browse navbar and a row on
  the Account tab. Copy leads with "you don't need to have bought your car
  from UCG." New `WrenchIcon`. The page prints a second WhatsApp number
  (+49 1522 8806145) with no explanation of how it differs from the linked
  one — only the linked one is used, not guessed at.
- **2-Year Premium Protection Plan — real accept/decline.** New `/warranty`
  screen (`src/app/warranty.tsx`) + `src/lib/warranty-context.tsx`
  (`WarrantyChoice`, AsyncStorage-persisted, wired into Reset Test Data).
  Real terms for both tiers transcribed exactly into `mock-data.ts`
  (`oneYearWarranty`, `premiumProtectionPlan`) from the flyers — coverage,
  $0 vs. 40k-mile deductible, €10,000 vs €3,300 max claim, rental +
  courtesy-car access, unlimited mileage, towing. Eligibility check
  (`pppEligibility()`): "newer than 2019 AND under 70,000 miles" — returns
  `unknown` when the scraped listing has no mileage, and the screen then
  says "your salesperson will check" instead of guessing. Accept records
  the choice (does NOT charge $999 — the salesperson adds it). Decline is
  an explicit reason picker (`warrantyDeclineReasons`) + free-text note,
  because UCG wants the "why" (it's what decides the American Auto Nation
  handoff — still not built). Entry points: the deposit success screen
  ("Next: Protect Your Car") and a button on the salesperson screen that
  reflects the current choice. Choice is passed to the AI agent context.
  **Not built:** the American Auto Nation insurance-quote handoff that a
  decline is supposed to lead into; wiring the choice into a My Deal
  timeline step; the winter-tire / PPF add-ons (still waiting on flyers).
- **`deal-sync` module — the seam between the app and DealerTeam.** Answers
  the recurring "should we clone DealerTeam?" question: no. The app now
  talks to one interface, `DealSyncBackend` (`src/lib/deal-sync/`), with
  two implementations — `MockDealSync` (default; in-memory state machine
  that also auto-advances "waiting on UCG/bank" steps on a 45s timer to
  simulate the back office) and `SalesforceDealSync` (stub, selected only
  by `EXPO_PUBLIC_DEAL_SYNC=salesforce`). `createDealSync()` in `factory.ts`
  is the single swap point — going live against DealerTeam is a change to
  that one function. Replaced `deal-steps-context.tsx` entirely:
  `useDealSync().state.steps` is what `dealSteps` was, `jumpToStep`
  replaces `setDealStepIndex` (still dev-gated on My Deal), `reset`
  replaces `resetDealSteps` (Account → Reset Test Data). `financingTerms`
  moved off a bare mock-data import onto `state.financingTerms` (nullable
  now — the financing panel shows a "terms appear once approved"
  placeholder for a cash/early deal). New `send(signal)` path: submitting
  deal intake fires `intake-submitted`, a confirmed deposit fires
  `deposit-paid` — customer actions the mock uses to advance the timeline
  and a real integration would turn into Salesforce writes. `salesperson`
  is in `DealServerState` for the future but still read from the mock-data
  const app-wide (assignment is still the open question below). Full notes
  in `src/lib/deal-sync/README.md`. tsc + lint clean; not yet device-tested.
- **APO / FPO address added to deal intake.** The piece the Vehicle
  Registration Office (VRO) needs to register the car, issue plates, and
  issue the environmental sticker that nothing else in the intake captured
  (see `docs/product-vision.md`). New `ApoAddress` type on `DealIntake`
  (`mock-data.ts`) — recipient, unit/PSC/CMR + box (one free-text line),
  APO/FPO/DPO, region AE/AA/AP, ZIP — plus `apoAddressStatus: 'have' |
  'not_yet'`. The intake form (`deal-intake.tsx`) has an "I Have It / Not
  Assigned Yet" toggle: "not yet" is a first-class state, not a validation
  failure, because the box is usually assigned at in-processing. Surfaced
  on the My Deal timeline's Documents step (`deal/index.tsx`,
  `formatApoAddress()`), and passed to the AI agent (`chat+api.ts` context
  + system prompt) so it can nudge a customer to add it once they have it.
  Also fixed a stale line while in there: the intake footer still said
  "Opens WhatsApp with everything above filled in for you" — untrue since
  the WhatsApp handoff was removed Sept 2.
- **Not built (follow-ups):** sponsor name/rank/unit, gaining installation,
  and report date — the VRO wants these too, but "Orders" (a document)
  already carries most of it, so deferred until the VRO packet is scoped
  properly. Full VRO-packet assembly (the app producing the printable set
  a customer walks in with) is its own feature.

## Shipped Sept 2, later still

- **Deal-intake now survives an app restart, and the contact field is
  explicitly WhatsApp.** Terry: "when I logged back into the app, my
  phone number disappears... I have to reenter it every time." Real
  cause: `deal-intake-context.tsx` was in-memory only (`useState`, no
  persistence) — documented as a known, deliberate gap ("should become
  a real server-side deal record... not local state that resets on app
  restart"), but a real usability problem in the meantime. Fixed: it
  now persists to AsyncStorage the same way `auth-context.tsx` already
  does — the whole intake (name, WhatsApp number, base, payment
  method, license, notes) survives a restart, not just the one field
  Terry noticed. Also relabeled "Phone or WhatsApp Number" →
  **"WhatsApp Number"** per Terry's second point: it's UCG's preferred
  channel for any real call/text, so the field should say what it
  actually is, not stay generic. **Not changed, related, and worth
  knowing:** `deal-context.tsx` (the chosen car) is still in-memory
  only, same original reasoning — a restart still loses the selected
  car even though the intake form now remembers its own fields. Same
  fix shape would apply if that also turns out to be a problem;
  deliberately not done preemptively since Terry didn't flag it and
  caching a whole `InventoryDetail` object (photos included) has real
  staleness tradeoffs a simple contact string doesn't.
- **Flagged by Terry, not yet actionable:** "when I get the API for
  Dealer Team, there will be much more needed to be entered" — expect
  the deal-intake form to grow once real DealerTeam field requirements
  are known. Nothing to build yet; noting so the persistence fix above
  isn't mistaken for "the form is done."
- **Animated opening splash.** Terry asked for the opening splash to
  have animation and "look better." Real constraint worth recording:
  the *native* splash (`app.json`'s `expo-splash-screen` plugin) is a
  static OS-level image — it renders before React is even running, so
  it can never animate; that's a platform limit, not a missed setting.
  Built the actual fix: `src/components/animated-splash.tsx`, a real
  React overlay (`react-native-reanimated`, already a dependency) shown
  the instant JS takes over — same navy background and mark image as
  the native splash for a seamless handoff, then the star/swoosh mark
  scales in with a spring, the "USED CAR GUYS" wordmark fades up under
  it, holds briefly, and fades out to reveal the real first screen
  (already mounted underneath the whole time, not delayed behind this).
  Wired into `_layout.tsx`'s `AppShell` — status bar switches to
  light content while it's showing. Shows once per cold launch only.

## Shipped Sept 2

- **Fixed: the Documents fix from earlier the same day didn't actually
  reach My Deal.** Terry tested "Edit My Info" expecting it to also
  cover the "Documents Uploaded" summary shown on the My Deal screen —
  reasonable, since that panel lists the same 4 documents. Root cause
  was architectural, not a missing link: `deal/documents.tsx` (the real,
  now-editable screen) held its own **local** `useState`, while the My
  Deal summary panel read `dealDocuments` **directly from mock-data.ts**
  — two completely separate copies that never agreed. Replacing a
  document on the real screen was never going to show up in the
  summary, no matter how "Edit My Info" was wired. Fixed with the same
  pattern already used for the timeline and intake: new
  `src/lib/documents-context.tsx` (`useDealDocuments()`) is now the one
  shared source both screens read from, with `replaceDocument(id, uri)`
  and a `resetDocuments()` wired into Reset Test Data. "Edit My Info"
  itself was correct all along — it's for the deal-intake form (name,
  base, license), which is genuinely a different flow from the 4 KYC
  documents; the confusion was reasonable given both were broken in
  similar-looking ways, but they needed two separate fixes.
- **Fixed the real thing behind "That did not allow me to change any
  documents already loaded."** Terry was describing `deal/documents.tsx`
  specifically: `dealDocuments` defaults every document to "approved"
  (by design, so the advanced-demo steps show by default — see
  mock-data.ts), and the old `handlePress` logic only offered an upload
  flow when a document's status was `"needed"` — anything else just
  showed "downloading isn't connected yet." Since nothing starts as
  "needed," there was **no way to replace any document at all**. Fixed:
  every row is now tappable regardless of status, opens a real
  Take Photo/Choose from Library capture (same `expo-image-picker` +
  `compressPhoto` pattern as Sell It Back and the license scan), shows
  the captured image as the row's thumbnail, and — importantly — sets
  status back to `"uploaded"`, not `"approved"`, since a real
  salesperson/backend would need to actually review a freshly replaced
  file. Removed the separate "+" FAB (it implied adding a new document
  to the list, which doesn't fit this fixed 4-document model, and is
  redundant now that every row already supports replacing itself).
- **"Edit My Info" added to the My Deal page**, not just the specialist
  screen — Terry's follow-up: customers are more likely to be checking
  My Deal regularly than revisiting the one-time match screen. Same
  link, same behavior (`router.push('/deal-intake')`, only shown once
  something's been submitted), now on both screens.
- **Caught while adding that: two stale WhatsApp references on My Deal
  that the "Talk to a Human" removal missed.** The pinned bar's message
  icon and the "Matched with Salesperson" detail card's Call/Text icons
  still opened `whatsappChatUrl(salesperson.whatsapp)` — the same fake
  placeholder number already removed from the specialist screen itself.
  Both now navigate to the in-app AI chat (`router.push('/salesperson')`)
  instead; dropped the Call icon entirely (an AI agent has nothing to
  "call"), kept a single message icon.
- **Fixed: no way to correct anything after submitting "Start Your
  Deal."** Real bug, not a discoverability gap (though the license photo
  retake — tap an already-filled slot again — is one of those too,
  worth revisiting for a clearer "retake" affordance later). Once
  submitted, `deal-intake.tsx` used `router.replace('/salesperson')`,
  which doesn't keep the intake screen in navigation history — there was
  no way back to it at all, so name, base, payment method, and license
  photos were permanently locked in, and there'd be no way to fix a
  wrong upload the way there is on Sell It Back's photo grid (Replace/
  Remove). Fixed:
  - `deal-intake.tsx` now pre-fills every field from the already-
    submitted `intake` (context) when one exists, instead of always
    starting blank — the header reads "Edit Your Info" and the submit
    button "Save Changes" in that case, "Start Your Deal" / "Submit for
    a Salesperson" otherwise.
  - A new **"Edit My Info"** link on the salesperson screen (only shown
    once something's been submitted) does a fresh `router.push` back to
    the intake form — a real forward navigation, not "back," so it
    works regardless of what's left in history.
  - License photo retake already worked (tapping a filled slot
    re-triggers the capture flow, correctly overwriting it) — just
    wasn't obvious from the UI. Not changed this pass; worth a clearer
    "Retake" label/icon later if it still isn't discovered in testing.
- **My Deal: a real testing tool + auto-scroll, not the SVG road
  redesign.** Terry needs to test each of the 7 steps directly, and
  wants the customer to land on "what's next" without manually
  scrolling once a step completes. Two additions, deliberately *not* the
  higher-risk option (making the SVG road itself shrink/collapse as
  segments complete — the road is a single fixed-size canvas with
  waypoints computed from all steps up front, not independently
  collapsible React Native views, and this component already has a
  history of "didn't come out correctly"):
  - `useDealSteps()` gained `setDealStepIndex(i)` — jumps straight to
    any of the 7 states (mock titles/waitingOn, real status math), not
    just reset-to-fresh. A dashed-border "TESTING — Jump to Step" row of
    7 chips on the My Deal screen itself uses it — clearly marked as a
    dev aid, not a real feature a customer would ever see.
  - The outer `ScrollView` (detail panel + road) now scrolls back to the
    top whenever the deal actually advances a step (`targetIndex`
    changes) — not when just reviewing history via the back/forward
    arrows, which stays exactly as before. The detail panel showing the
    new current step is the first thing in that scroll view, so
    scrolling to top *is* "see the next step without scrolling down" —
    solves what Terry asked for without touching the fragile SVG canvas
    at all. The existing per-segment fade (from the paused work) is
    still there underneath, unchanged.
  - **Not done:** literally shrinking/collapsing the road's occupied
    space as it completes. If auto-scroll-to-top doesn't feel like
    enough once tested, that's the next real option — bigger, separate
    piece of work, not attempted here.
- **Fixed: "Done" didn't actually dismiss the keyboard.** The previous
  fix (moving the CTA buttons inside `KeyboardAvoidingView`) worked —
  screenshotted confirmation the buttons stay reachable with the
  keyboard up — but the dismiss button itself didn't close it.
  `Keyboard.dismiss()` alone is known to be unreliable: it asks the OS
  to hide the keyboard without necessarily releasing the `TextInput`'s
  own focus, and if focus never actually leaves the input, iOS can just
  show it again. Fixed by giving the input a ref and explicitly calling
  `.blur()` on it (`dismissKeyboard()` in `salesperson.tsx`), with
  `Keyboard.dismiss()` kept as a fallback — both the "Done" row and
  tapping the header now use this.
- **Added sender attribution to chat bubbles.** Terry's read: a reply
  didn't clearly read as coming from "Marcus" — assistant bubbles were
  plain white text with no name attached, indistinguishable from generic
  app text. Added a small "Marcus" label above each assistant bubble
  (`salesperson.name.split(' ')[0]`, same pattern used elsewhere in the
  app) so a reply is unambiguously attributed to him, not just floating
  text.
- **Fixed the chat's auth-error detection — real bug, confirmed via
  Terry's terminal log.** Testing after the JSON-parse fix, the chat
  showed the generic "Something went wrong on our end" fallback instead
  of the accurate "isn't connected yet" one. The actual error (from
  Terry's log): `Could not resolve authentication method... Expected
  one of apiKey, authToken, credentials, config, or profile to be set`
  — thrown by the SDK itself at client construction when literally no
  credential source exists, which is a different error shape than
  `Anthropic.AuthenticationError` (a server-side rejection of a bad key)
  and doesn't even contain the string "ANTHROPIC_API_KEY", so the
  previous detection missed it. Fixed by checking
  `process.env.ANTHROPIC_API_KEY` directly before ever constructing the
  client, instead of pattern-matching a caught error's type/message —
  more robust than guessing at the SDK's exact error shape.
- **Real Anthropic API key: decided not to set one up yet, and why —
  see `docs/backend-and-ai-agent-plan.md`'s "Open questions."** Terry
  correctly flagged that API billing is a separate account/cost from
  his existing Claude plan, and that funding it himself doesn't make
  sense for an app that won't be his. Decision: the real key is UCG's to
  set up when ready, not Terry's to front. Nothing is blocked by this —
  every other part of the app works independently of the chat being
  funded.
- **Removed "Talk to a Human" from the salesperson chat screen —
  Terry's explicit call.** "There is no one to chat with and no number
  to reach," and that's accurate: `salesperson.whatsapp` is still the
  fake placeholder number, so the link was pointing at nobody. Removed
  the button, the greeting's "or say the word and I'll get a real
  person for you" line, and every reference to it in the chat's error
  fallbacks and system prompt (`chat+api.ts`) — the agent now says a
  specialist will follow up directly instead of directing to a
  nonexistent link. Re-add all of this together once UCG's real
  WhatsApp Business number exists — don't re-add just the button
  without also fixing the number, that's the exact mistake this undoes.
- **Fixed: new chat messages didn't scroll into view.** Reported same
  day — sending a message gave no visual confirmation it was sent, and
  new messages ended up hidden behind the input/keyboard. The message
  `ScrollView` had no way to know to scroll — added a ref and
  `onContentSizeChange` calling `scrollToEnd({ animated: true })`, the
  standard fix for this in a chat UI (the list scrolls to the bottom
  automatically whenever its content grows, not just on a manual swipe).
- **Fixed: the keyboard wouldn't dismiss, blocking "View My Timeline" /
  "Make a Deposit."** Real layout bug, not just a missing dismiss
  gesture: those buttons (`ctaWrap`) sat *outside* the
  `KeyboardAvoidingView`, so an open keyboard could cover them with
  nothing pushing them back into view — tap-to-dismiss not working
  reliably meant there was no way to reach them at all. Fixed two ways
  together: (1) moved `ctaWrap` inside the `KeyboardAvoidingView` so the
  buttons get pushed up above the keyboard along with everything else,
  and (2) added explicit, always-reachable dismiss points — a "Done ⌄"
  button right above the CTAs, and the header area also dismisses on
  tap — rather than relying on `keyboardShouldPersistTaps`/tap-outside
  behavior alone, which is exactly what wasn't working. Also switched
  `keyboardDismissMode` from `"interactive"` (requires a synced drag,
  not very discoverable) to `"on-drag"` (dismisses as soon as a scroll
  starts, the more standard behavior).
- **Fixed two console deprecation warnings Terry spotted testing the web
  preview** (`"shadow*" style props are deprecated. Use "boxShadow"` and
  `props.pointerEvents is deprecated. Use style.pointerEvents`) — real,
  worth fixing, but neither affects the mobile app itself: `boxShadow`
  is CSS-only and doesn't exist on native (iOS reads `shadow*`, Android
  reads `elevation`), so `Shadow` in `theme.ts` now uses
  `Platform.select` — `boxShadow` on web, the classic
  `shadow*`/`elevation` object everywhere else — rather than switching
  outright and silently dropping shadows on a real device.
  `pointerEvents` as a direct prop (3 spots in `timeline-road.tsx`) is a
  React Native-wide deprecation, not web-only, so those moved into
  `style.pointerEvents` for both platforms. Purely a console-warning
  fix — no visible behavior changed on either platform, and nothing
  about the paused timeline-road animation work was touched.
- **Financing lender choice, real wire instructions, a real license
  camera overlay, and multi-page documents** — the big multi-part
  request Terry gave in one message. Broken down:
  - **Financing lender multi-select.** deal-intake.tsx's old single
    "Preferred Lender" text field is now a chip multi-select
    (`financingLenderOptions` — Service Federal Credit Union, Community
    Bank, both real names Terry gave directly) plus a free-text "Other"
    field, matching "or all of the above check boxes." `DealIntake.
    financingLender: string` → `financingLenders: string[]`. The
    "Application Submitted" step on My Deal (`deal/index.tsx`) now reads
    `intake.paymentMethod`: financing shows which lender(s) were picked
    and links out to the real https://www.usedcarguys.net/finance/
    (verified live, Sept 2 — collects SSN/DOB/military/financial detail,
    which is exactly why it's linked rather than rebuilt in-app; no
    secure backend exists yet for that level of PII, see
    docs/legal-considerations-germany.md).
  - **NOT built: a lender "search function."** Terry asked for a way to
    "find where the application should be sent" beyond the two named
    lenders. Building that would mean either fabricating a directory of
    financial institutions or standing up a real lookup against
    something — neither is honest to ship right now. Needs Terry to say
    what it should actually search (a fixed UCG-approved list? routing
    number lookup? something else) before it's buildable.
  - **Real wire instructions (cash deals).** New `wire-instructions.tsx`
    screen with the exact two-step wire Terry provided (Citibank NY →
    further credit to Commerzbank Mannheim), shown on-screen and as a
    real, shareable/printable PDF (`expo-print` + `expo-sharing`).
    Reachable from deal-intake.tsx's cash path and from the "Application
    Submitted" step for a cash deal. Every account/routing/SWIFT/IBAN
    number is preserved character-for-character; only two prose-only
    spelling fixes were made ("COMMMERZBANK" → "COMMERZBANK,"
    "Whats App" → "WhatsApp") — see the doc comment on `wireInstructions`
    in mock-data.ts.
  - **License photo alignment rectangle.** New `capture-license.tsx` —
    a real `CameraView` screen (same pattern as `scan-vin.tsx`) with an
    ID-1-card-shaped frame (85.6×54mm proportions) the customer lines
    the license up with, replacing `ImagePicker.launchCameraAsync`'s
    native camera UI, which can't show a custom overlay. "Choose from
    Library" still uses ImagePicker, unchanged. Hands the captured photo
    back to deal-intake.tsx via a new `license-capture-context.tsx`
    (same pattern as `vin-scan-context.tsx`).
  - **Multi-page documents, not a true document scanner.** Terry asked
    for "a real document scanner allowing for 1-x pages." A genuine
    edge-detection/auto-crop scanner needs a native module outside what
    Expo Go can run — that would break live device testing, which is
    exactly why AGENTS.md pins this project's Expo SDK to what the
    published Expo Go app supports. Built instead: real multi-page
    capture. `documents-context.tsx`'s `DocumentState.uri?: string`
    became `uris: string[]`; `deal/documents.tsx` now shows a thumbnail
    strip per document with "Add Page"/"Add Another Page" and per-page
    removal, so Proof of Insurance, Orders, and Proof of Residence can
    each carry as many pages as they actually need.
  - **"Proof of Income" → "Orders."** Renamed in mock-data.ts — PCS/
    deployment orders make more sense for this customer base than a
    civilian income proof. Internal `id`/`icon` left as `'income'` on
    purpose (touches lookup tables elsewhere); only the customer-facing
    name changed.
  - **Steps 4 & 5 (Financing Approved, Contract Signed):** Terry flagged
    that the bank may not be able to feed status back into the app
    automatically. Acknowledged, not something to build around — no
    change made; both steps already read as `waitingOn: 'bank'` /
    `'you'` rather than implying an automatic feed.
  - **"There are more steps between 5 and 6, a lot more":** not
    actionable yet — no specifics given. Tracked under "Not covered
    yet" below; needs Terry to enumerate what's actually missing.
  - **Not raised as an action item, and not acted on:** Terry's aside
    that the insurance company sends a "white card" to the VRO (Vehicle
    Registration Office) for the buyer. Read as context, not a request
    — the exact German term/process (eVB confirmation? Grüne Karte?)
    isn't something to guess at and put in front of a customer without
    verifying it first. Left out of Documents' UI copy for now.

## Shipped Sept 1

- **Fixed: a real "JSON Parse error: Unexpected character: N" Terry hit
  while testing.** That exact message is what `JSON.parse` throws when
  fed plain text starting with "N" instead of JSON — most likely
  "Not Found" or "Network request failed" — not something a customer
  should ever see. Root cause: `deposit.tsx` and `salesperson.tsx` both
  called `res.json()` directly and, in `deposit.tsx`'s case, passed the
  resulting error's raw `.message` straight into the UI (`salesperson.tsx`
  already caught and hid it behind a friendly fallback, so this was only
  ever visibly broken on the deposit screen). New shared
  `src/lib/api-fetch.ts` (`parseJsonResponse`) reads the body as text
  first, so a non-JSON response now surfaces the actual status code and
  a snippet of what the server returned instead of the opaque native
  parse error — used by both screens now. **Root cause of *why* the
  response wasn't JSON in the first place is still unconfirmed** — this
  makes it diagnosable next time, not necessarily impossible again.
- **Pre-Buy Inspection booking — corrected location, not the car detail
  screen.** Originally placed on the car detail screen (buying FROM
  UCG), which was wrong — Terry caught this: a "pre-buy inspection" is
  UCG inspecting a car it's about to buy **from a customer**, so it
  belongs in **Sell It Back**, and specifically *after an offer is made
  and accepted*, not before. Moved: Sell It Back now has a real
  `awaitingAccept` → `accepted` status flow (no fake dollar amount shown
  — there's no real offer-generation backend, so a made-up number would
  misrepresent a working pricing engine that doesn't exist; instead,
  submitting moves the screen to "your offer is on the way," and an
  honest "I've Accepted My Offer" button — standing in for a real
  accept-confirmation once a backend exists — reveals the actual "Book a
  Pre-Buy Inspection (Ramstein)" button). Uses the same real Microsoft
  Bookings link
  (`outlook.office.com/book/PreBuyInspection@usedcarguys.net`, confirmed
  to redirect through real Microsoft Bookings infrastructure using UCG's
  own domain) and the same `UcgLocation.bookingUrl` field as before —
  **still needed: booking links for the other five locations**
  (Kaiserslautern, Stuttgart, Spangdahlem, Grafenwoehr, Wiesbaden).
- **Choosing a new car now actually starts fresh.** A previous car's
  deal-intake submission was staying in memory even after choosing a
  *different* car, so the salesperson-match screen could show a stale
  "already submitted" confirmation for a car that was no longer the one
  being pursued. "Choose This Car" now clears any prior intake first.
- **A real "Reset Test Data" action** (Account tab) — wipes account,
  chosen car, deal-intake, saved cars, and any pending VIN scan in one
  tap, with a confirmation prompt. Directly answers "can you delete my
  information" for testing; the same underlying idea (a complete,
  self-service delete) is also what Apple will require once real
  backend accounts exist — see `docs/backend-and-ai-agent-plan.md`.
- **Reset Test Data now actually resets the My Deal timeline too.** Terry
  caught that Reset didn't touch `dealSteps` 1-7 — because it was a
  static export, not state, so there was nothing for any context to
  reset. Wrapped it in `src/lib/deal-steps-context.tsx` (the further-
  along demo default on first launch is unchanged; a reset now moves it
  to a genuinely fresh, just-matched `freshDealSteps` state instead).
- **"Meet Your Specialist" is now a real AI agent**, not a WhatsApp
  handoff to a human — Terry's explicit call: submitting the intake form
  no longer opens WhatsApp, and the salesperson screen is a real in-app
  chat backed by a server route calling the Claude API, with a "Talk to
  a Human" WhatsApp fallback for anything it can't answer. Full writeup
  in `docs/backend-and-ai-agent-plan.md`, "AI agent" — this is that
  plan's Tier 1, now built rather than only planned.
- **Found while testing the chat: "Talk to a Human" isn't real yet.**
  `salesperson.whatsapp` (`491700000000`) has been a placeholder since
  this file's first version — it doesn't reach anyone. Wasn't consequential
  until "Talk to a Human" became a real fallback a customer might actually
  tap. **Still needed: UCG's real WhatsApp Business number** before that
  fallback (or anything else using this constant) means anything.
- **Reported: typing in the chat box didn't work.** Couldn't reproduce
  directly, so applied the standard fixes for the most common causes
  (`keyboardShouldPersistTaps="handled"` + `keyboardDismissMode`,
  `blurOnSubmit={false}` on the multiline input) rather than guessing at
  one root cause — **not confirmed fixed**, needs a real on-device
  retest. If it's still broken, the next useful details are: does the
  keyboard open at all, does a character appear and then vanish, and
  which platform/device.
- **Found from the terminal crash after adding `.env`: a real bug in
  `chat+api.ts`.** `new Anthropic()` was constructed at module scope,
  outside the route's own try/catch — the SDK throws *synchronously* at
  construction when no credentials resolve at all, which crashed the
  whole route (matching the stack trace Terry showed) instead of
  degrading to the intended "not connected yet" fallback. Fixed by
  constructing the client inside the try block. Unrelated: the VS Code
  notification about `python.terminal.useEnvFile` in that same
  screenshot is a red herring for this project — that's the Python
  extension's own terminal-env feature, unrelated to whether Expo/Node
  reads `.env` (confirmed separately: `expo lint`/`expo-doctor` both
  logged `env: load .env` correctly).
- **PayPal deposit flow — shipped, see "Make A Deposit" below** for the
  full writeup. Also caught and fixed a real architecture bug while
  building it: a shared PayPal helper first lived at
  `src/app/api/paypal/client.ts` and got exposed as its own client-facing
  page route (`/api/paypal/client`) — Expo Router treats every file
  under `src/app`, not just `+api.ts` ones, as potentially routable.
  Moved to `src/lib/paypal-server.ts` instead.

Terry re-raised these explicitly — they were already tracked below, not
new, but worth surfacing as still-live priorities rather than assuming
"documented" means "deprioritized":

- **The PPP warranty offer** (see "Warranty upsell" below) — still needs
  to actually be built, not just planned.
- **Refer a Friend** — genuinely new, not previously captured anywhere.
  No design details given yet (referral code? reward — cash, service
  credit, something else? tracked how, since it needs the same "real
  backend" this app doesn't have yet — see
  [docs/backend-and-ai-agent-plan.md](./backend-and-ai-agent-plan.md)).
  Flagging the dependency now rather than guessing at a mechanism: a
  referral program needs to attribute one customer to another and likely
  needs a reward to actually issue, which is account-and-backend-shaped
  work, not a screen that can be bolted onto the current in-memory/
  WhatsApp-only flow the way the Pre-Buy Inspection button just was.

## Shipped Aug 31

- **Car photo gallery on the deal-intake screen.** Once a customer
  chooses a car, they were losing access to its photos — the detail
  page's gallery doesn't follow them into the flow. `deal-intake.tsx`
  now shows the same swipeable gallery (all of `car.images`, not a
  subset) right under the header, with a "swipe for all N photos" hint.
- **USAREUR license link fixed — twice, same afternoon.** The original
  `usareurpracticetest.com` link Terry hit a 404 on is confirmed dead —
  independently reproduced (connection reset on both http and https,
  every attempt). First swap: the U.S. Army's own official page
  (`home.army.mil/.../drivers-testing`). Terry then pasted that page's
  full text back while checking the fix, which caught something more
  useful than a bug report — that page isn't an interactive practice
  test (now correctly framed as a secondary "study the manual first"
  link, not "Practice the Test"), and it revealed
  [JKO](https://jko.jten.mil/) isn't CAC-gated: non-CAC family members
  can request a free sponsored account with their DoD ID number. JKO is
  now the **primary** link — it's the real exam (course USA 007, exam
  USA 007B, 60-day-valid certification), doable online before a PCS
  move, which is strictly more useful than a practice quiz. Also
  explicitly **not** linked: two USAREUR Quizlet flashcard sets Terry
  found while double-checking this — unverifiable user-submitted
  content for a real government exam (Quizlet blocks this app's own
  fetch tooling with a 403 on both, so neither could even be
  superficially checked), and Terry flagged the same accuracy worry
  independently before it was even raised. Held up a third time: a
  separate AI-generated answer Terry checked also recommended one of
  these sets, with an equally unverifiable "nearly all the exact
  questions" claim — a second unverified source repeating an unverified
  claim isn't confirmation.
- **JKO certificate warning + arrival checklist, added same day.**
  Checking a direct JKO login URL Terry sent turned up a real,
  reproducible finding: the fetch failed with the specific signature of
  a DoD PKI certificate not being in a normal device's trust store —
  confirmed via search as common and well-documented, not a fluke of
  this app's tooling. A real customer's own phone will likely show a
  "connection is not private" warning tapping into JKO. The app now
  warns about this right next to the button instead of letting it look
  broken. Also added, once corroborated by the official Army Garrison
  page itself (not just an AI summary repeating it): the 85%-or-higher
  passing score, and the arrival-day checklist (printed certificate,
  stateside license, DoD ID/CAC, $30 fee, on-site vision check).
- **License scan is now front AND back**, not one photo — two separate
  capture slots on the deal-intake screen (`DealIntake.licensePhotoFrontUri`
  / `licensePhotoBackUri`).
- **Button copy no longer presumes a specific matched salesperson.**
  "Send to My Salesperson" → **"Submit for a Salesperson"** — see the
  open question below, this doesn't solve assignment, just stops the
  copy from lying about it.
- **EU-spec `DEN*****` stock numbers parse correctly.** The inventory
  scraper's stock-number regex only matched 2-letter prefixes (`DE9917`)
  and would have silently mis-parsed a 3-letter `DEN`-prefixed one
  (`src/lib/ucg-inventory.ts`) — fixed before it ever shipped a visible
  bug, since Terry's note about DEN cars is what surfaced the gap.

## Open question: multiple salespeople per location

Terry flagged this as genuinely undecided, not just undocumented:
locations may have more than one salesperson, so "the" salesperson
(`mock-data.ts`'s single hardcoded `salesperson`) doesn't reflect
reality. Ideas floated, none chosen yet:

- Someone receives every "Submit for a Salesperson" message and
  manually assigns it to a specific person.
- A per-location list of salespeople with round-robin/alternating
  assignment.

**Partially superseded, Sept 1:** "Submit for a Salesperson" no longer
opens WhatsApp at all — the actual next screen is a real AI agent chat
(see `docs/backend-and-ai-agent-plan.md`, "AI agent"), not a message to
a specific person. This question still matters for the **"Talk to a
Human"** fallback the agent escalates to, which does still go through
`salesperson.whatsapp` — but it's no longer the very next thing every
customer hits after submitting.

**Nothing changed in code for this** beyond the button copy — assigning
a specific person algorithmically needs a real backend regardless of
which model is picked (something has to hold "whose turn is it" or
"who's free" state), so this waits for a decision, not an implementation
guess. One reading worth considering: today's single `salesperson`
mock could keep representing whoever triages incoming submissions (a
real, common small-business pattern — one shared intake number, humans
sort it out from there) rather than needing to be replaced outright.

## Make A Deposit (new My Deal step, after "Matched with Salesperson")

- A deposit puts a **5-day hold** on the car.
- The hold reserves the car both on the public website and in
  DealerTeam.
- Once reserved in DealerTeam, that step "can be checked" — i.e. this
  is a manual confirmation (someone checks DealerTeam and marks it),
  not something the app can verify itself without the API access still
  being sorted out (see
  [docs/salesforce-dealerteam-integration-plan.md](./salesforce-dealerteam-integration-plan.md)).
- **Payment method: PayPal — SHIPPED (Sept 1), against real PayPal
  Sandbox.** Terry set up a real PayPal Developer sandbox app the same
  day and provided sandbox credentials, so this went from "specified"
  to "built" in one pass rather than staying queued. "Hold This Car —
  Make a Deposit" on the salesperson screen
  (`src/app/deposit.tsx`) creates and captures a real PayPal Orders API
  order via two server routes
  (`src/app/api/paypal/create-order+api.ts`,
  `capture-order+api.ts`, sharing `src/lib/paypal-server.ts`) —
  `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` in `.env`, same
  "server-only, never in the client bundle" pattern
  `src/app/api/chat+api.ts` already proved out for the Claude API. No
  PayPal native SDK (would need a custom dev client, breaking Expo Go
  testing) — instead, `expo-web-browser`'s `openAuthSessionAsync` opens
  PayPal's own hosted approval page and catches the redirect back via a
  deep link. `PAYPAL_API_BASE` defaults to the sandbox host, so going
  live later is a credential/env swap, not a rewrite — see
  `docs/backend-and-ai-agent-plan.md`'s "Strategy" section for why
  Sandbox was the right move over a homemade fake.
  - **Deposit amount decided, Sept 1: a flat $300.00 USD**, not a
    percentage of price. No longer a placeholder — `DEPOSIT_AMOUNT` in
    `src/app/deposit.tsx`.
  - **Not done:** this isn't wired into the My Deal timeline
    (`timeline-road.tsx`) as an actual step — deliberately kept as its
    own screen instead, both because that component is complex/still
    being iterated on and separately paused, and because the "reserved
    in DealerTeam, can be checked" confirmation above still needs the
    DealerTeam access question resolved before it means anything.
  - **Not done:** webhook handling. PayPal's sandbox app has webhooks
    available (up to 10) but none are configured — right now the app
    only knows a payment succeeded because the client-side capture call
    returned `COMPLETED`, not from PayPal notifying the server directly.
    Fine for solo testing, not something to treat as production-solid.
  - **Going live, when ready — what's actually a credential swap and
    what isn't (Terry asked Sept 1):** swapping `PAYPAL_CLIENT_ID`/
    `PAYPAL_CLIENT_SECRET` for live values and setting
    `PAYPAL_API_BASE=https://api-m.paypal.com` is genuinely all the code
    needs. But **live credentials don't exist until PayPal's Business
    account is actually verified** — the sandbox dashboard shows a banner
    ("Upgrade your account to PayPal for Business to view live
    credentials") confirming this is still ahead, not done. And a
    credential swap alone doesn't make the app reachable by a real
    customer either — this route still only runs against `npx expo
    start`'s local dev server; real hosting (see
    `docs/backend-and-ai-agent-plan.md`) still needs to land before this
    is customer-facing (the deposit amount itself is decided now, see
    above).
  - Still open: currency (USD given pricing elsewhere is in $, or does a
    EUR option matter for EU-spec cars?), and what happens on a
    failed/abandoned PayPal checkout (retry? hold expires? notify the
    salesperson?).

## Warranty upsell: 1-Year vs. 2-Year Premium Protection Plan (PPP)

Real terms, from UCG's own flyers (preserved exactly, not paraphrased,
since these are the actual coverage terms customers will see):

| | 1-Year Comprehensive Warranty | 2-Year Premium Protection Plan |
|---|---|---|
| Coverage | Comprehensive warranty — only what's listed is covered | Everything in the 1-year plan **plus** all electronic and mechanical components, excluding wear-and-tear items and fluids ("bumper to bumper") |
| Deductible | On cars over 40,000 miles, a deductible applies to parts (labor is 100% covered either way) | **$0 deductible**, parts and labor |
| Rental car | €60/day after 4 days | €60/day after 4 days, **plus priority access to UCG's small fleet of courtesy cars** |
| Mileage | — | **Unlimited mileage** |
| Towing | — | Included |
| Price | Included in the advertised price | **$999** (≈ $16–18/mo on a standard loan, 53–60¢/day) |
| Max claim over the coverage period | €3,300 | €10,000 |
| Eligibility | — | Vehicle must be newer than 2019 **and** under 70,000 miles on the odometer |

Full 1-year comprehensive coverage list (for reference, this is what
"comprehensive" actually includes): Engine, Manual & Auto Transmission,
Axle/Transfer Case, Transmission Shafts, Steering, Brakes, Fuel System,
Electrical System, Comfort Electric (power windows/sunroof/central
locking), Exhaust System (Lambda probe), Safety System (airbags, seat
belt pre-tensioners), Cooling System, and Mobility (rental/towing
reimbursement up to €60/day, 4 days max). Full 2-year list is the same
categories, described as "bumper to bumper... all electronic and
mechanical components excluding wear and tear items and fluids," plus
the higher claim cap and courtesy-car access above.

**Planned flow (not built yet):** after the deposit step, offer the
2-year PPP. If declined, show a second screen offering an insurance
quote from **American Auto Nation** instead (see below) rather than
just dropping the subject.

**New UX requirement, Sept 1:** the warranty offer needs to be an
explicit **accept/decline choice**, not just a link to read about it —
a real yes/no the customer checks, and **if no, capture why** (price,
already has coverage elsewhere, doesn't want it, etc. — exact reason
options not specified yet). That "why" matters: it's presumably what a
salesperson would want to see, and/or what decides whether the American
Auto Nation handoff below makes sense for this specific decline reason.

## Add-on upsells: Service (winter tires), PPF — content pending

Terry described a **"Service" button on a bottom row of options, before
a final pricing summary**, for a winter-tire upsell, plus a separate
**PPF (paint protection film)** upsell option. Read together with the
2-year warranty requirement just above, this sounds like one combined
add-ons/checkout-style screen (Service/winter tires, PPF, 2-yr
warranty, each with its own accept/decline) that sits before a final
price total — but that's my working interpretation of the description,
not confirmed, and **nothing is built here yet**. Deliberately not
guessing at a screen layout blind:

- **Winter tires (the "Service" button):** Terry is getting the actual
  flyer — waiting on that before building real content, the same way
  the PPP warranty section above only has real numbers because the real
  flyer was provided first.
  - **Assumption worth naming, not treating as decided**: given
    UCG serves customers heading to a country with genuinely cold,
    snowy winters (unlike much of the continental US many customers are
    coming from), a winter-tire upsell probably isn't just a nice-to-have
    accessory pitch — it may be closer to a safety/legal-requirement
    conversation (Germany has a winter-tire requirement in relevant
    conditions). Worth confirming with the flyer/Terry whether that
    framing ("recommended add-on" vs. "you may be required to have
    these") should shape the copy, rather than assuming either way.
- **PPF:** no details or flyer yet — waiting on that too.
- Once both flyers exist, this becomes buildable the same way the PPP
  section did: real terms transcribed exactly, not paraphrased or
  invented.

## If PPP is declined: American Auto Nation insurance quote

Terry showed [americanautonation.com](https://americanautonation.com) —
a real site ("Tailor-made insurance for USAREUR drivers and expats"),
which already has its own WhatsApp chat widget on the page. Planned
integration:

- A **WhatsApp submission**, same pattern as the deal-intake handoff —
  not a live API, a formatted message.
- Needs to carry **all the relevant car + customer info already
  gathered** (from the deal intake), since American Auto Nation will
  ask for more detail to actually quote — the point is not re-asking
  the customer everything from scratch a second time.
- Not yet specified: exactly what American Auto Nation needs beyond
  what deal-intake already collects, and whether this is a formal
  referral relationship or just "here's a resource" — worth confirming
  with them directly before building the handoff, the same way the
  DealerTeam architecture doc flags open questions rather than guessing.

## US-spec vs. EU-spec buying: a Purchase Order or a Cost Estimate

Restated and confirmed Sept 1: which paperwork the deal generates
depends on US-spec vs. EU-spec buying —

- **US-spec (or already USAREUR-registered) → a Purchase Order.**
- **EU-spec, never registered on USAREUR (`DEN*****` stock number) → a
  Cost Estimate instead**, because of the VAT process below.

If a car is EU-spec and has **never been registered on the USAREUR
system**, its stock number carries an extra letter: `DEN*****` instead
of `DE*****` (now parses correctly — see "Shipped" above). These need a
different process:

- The customer needs to get a **"Super" VAT Form** from the VAT office.
- That form needs a **cost estimate from UCG**, downloadable/printable
  from the app (or site).
- The cost estimate needs to be **stamped at the UCG location** where
  they're buying the car.

Not yet built: generating/hosting either document (Purchase Order or
Cost Estimate), or anything UI-side that tells a customer which path
they're on based on their car's stock number. This is a real, distinct
workflow, not a variant of the normal purchase flow — needs its own
screen(s) once scoped further, including what fields each document
actually needs (not yet specified beyond "a cost estimate" for the
EU-spec path).

## Financing application: customer-private, salesperson sees only a checkbox

The financing application's actual contents are private to the
customer — the salesperson shouldn't see the details, only that it's
been **completed and submitted**. Planned: a simple checked/unchecked
indicator on the salesperson- or timeline-facing side (a checkbox, not
a data dump), separate from wherever the actual application content
lives.

## Cash path: wire transfer + PIF

If paying cash (chosen on the deal-intake screen already —
`paymentMethod: 'cash'`), the customer needs **wire transfer
instructions** made available in the app, and a **PIF (Paid In Full)**
confirmation once funds arrive — presumably a manual check-off once
UCG confirms receipt, mirroring the deposit step's "can be checked"
pattern above.

**(shipped Sept 2, wire instructions half only)** — see this date's
entry above: `wire-instructions.tsx`, on-screen + printable/shareable
PDF, real numbers. The **PIF confirmation** half is still not built —
no manual check-off exists yet for "funds received."

## Not covered yet

Terry had more to go through and ran out of time before a meeting —
expect this doc to grow. Don't treat the above as the complete list.

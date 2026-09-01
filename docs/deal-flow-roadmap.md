# Deal flow roadmap — what's next after "Start Your Deal"

Notes from David's first real look at the app (Aug 31), captured in full
so nothing gets lost — Terry had two minutes and more to say. Nothing
below is built yet except where marked **(shipped)**. Treat this as the
backlog for the deal-intake → My Deal pipeline, roughly in the order a
real customer would hit it.

## Shipped Sept 1

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
- **Payment method specified Sept 1: PayPal.** Terry confirmed the
  deposit should go through PayPal, and that PayPal account credentials
  will be provided when ready. **Not built yet — status as of this
  check: no.** What it actually needs, so it's ready to wire up the
  moment credentials exist:
  - A real PayPal Business account, with API credentials (Client ID +
    Secret) from the PayPal Developer Dashboard — sandbox credentials
    first for testing, live credentials only once this is genuinely
    ready for real money.
  - Same rule as every other credential in this app: PayPal secrets
    can't live in the shipped app. Collecting a deposit needs a real
    server-side call (PayPal's Orders API — create an order server-side,
    capture it after the customer approves) — this is exactly what
    `src/app/api/chat+api.ts` already proved out for the Claude API
    (Expo Router server route, secret in `.env`, never in the client
    bundle). A PayPal route would follow the identical pattern.
  - Still open: deposit amount (fixed $ or a % of price?), currency
    (USD given pricing elsewhere is in $, or does a EUR option matter
    for EU-spec cars?), and what happens on a failed/abandoned PayPal
    checkout (retry? hold expires? notify the salesperson?).

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

## Not covered yet

Terry had more to go through and ran out of time before a meeting —
expect this doc to grow. Don't treat the above as the complete list.

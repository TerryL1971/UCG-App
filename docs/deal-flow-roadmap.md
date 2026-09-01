# Deal flow roadmap — what's next after "Start Your Deal"

Notes from David's first real look at the app (Aug 31), captured in full
so nothing gets lost — Terry had two minutes and more to say. Nothing
below is built yet except where marked **(shipped)**. Treat this as the
backlog for the deal-intake → My Deal pipeline, roughly in the order a
real customer would hit it.

## Shipped Sept 1

- **Pre-Buy Inspection booking (car detail screen).** Terry sent a real
  Microsoft Bookings link for Ramstein/KMC
  (`outlook.office.com/book/PreBuyInspection@usedcarguys.net`, confirmed
  to redirect through real Microsoft Bookings infrastructure using UCG's
  own domain — not verifiable content-wise since it's a client-rendered
  widget, but the redirect chain itself is legitimate). Added a secondary
  "Book a Pre-Buy Inspection (Ramstein)" button on the car detail screen,
  above "Choose This Car." `UcgLocation` in `mock-data.ts` gained an
  optional `bookingUrl` field so more locations can be added the moment
  their links exist — **still needed: booking links for the other five
  locations** (Kaiserslautern, Stuttgart, Spangdahlem, Grafenwoehr,
  Wiesbaden). Also worth knowing: there's no per-car location data yet
  (the inventory scraper doesn't expose which lot a car is at — see
  `docs/wordpress-inventory-api-spec.md`), so this button can't yet pick
  the *right* location automatically for a given car; it's labeled
  "(Ramstein)" specifically rather than presented as universal.

## Still needed, re-confirmed Sept 1

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
- Not yet specified: deposit amount, currency, how the deposit itself
  is actually collected (this app has no payment processing today —
  that's a separate, bigger question from just adding a timeline step).

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

## EU-spec cars with a `DEN*****` stock number

If a car is EU-spec and has **never been registered on the USAREUR
system**, its stock number carries an extra letter: `DEN*****` instead
of `DE*****` (now parses correctly — see "Shipped" above). These need a
different process:

- The customer needs to get a **"Super" VAT Form** from the VAT office.
- That form needs a **cost estimate from UCG**, downloadable/printable
  from the app (or site).
- The cost estimate needs to be **stamped at the UCG location** where
  they're buying the car.

Not yet built: generating/hosting that cost-estimate document, or
anything UI-side that tells a customer with a `DEN` car they're on a
different path. This is a real, distinct workflow, not a variant of the
normal purchase flow — needs its own screen(s) once scoped further.

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

# Product vision — the one thing this app is

Written because the detail work (DealerTeam APIs, timeline animations, keyboard
bugs) keeps crowding out the actual idea. This is the north star. Every other
doc in `docs/` is a sub-plan under this one.

## The north star (Terry + the owner)

**One app for the whole life of an American's car situation in Germany —
buying, owning, servicing, selling, and buying again.**

Two audiences, one app:

1. **Pre-arrival** — someone PCSing to Germany who buys *before* they land, so
   the car and all the two-country paperwork is as ready as it can be the day
   they arrive. "As ready as it can be" is the honest framing: some steps
   legally or physically have to happen in Germany, in person. The app does
   everything that *can* be done from the US ahead of time and is the single
   channel for the rest — not a pretence that the deal closes from a phone in
   Texas.
2. **Already in-country** — a service member already stationed in Germany,
   **whether or not they bought from UCG**. During a longer tour people trade
   or sell the car they have and buy something else; they need service
   (UCG-customer or not); they sell back at the end. All of that is the same
   app, and for this audience it's the primary use, not an afterthought.

## What the app is — and what it is NOT

**It is:**
- The customer-facing front end for a UCG car purchase, start to finish.
- The **data-entry surface** for everything UCG's back office (DealerTeam)
  needs — filled in by the customer, because they're the one holding the
  orders, the APO address, the license status.
- A **document concierge**: capture/scan/upload documents, get notified when
  UCG-generated documents are ready, sign what needs signing.
- An **all-in-one hub** for the other things UCG sells and does: insurance
  (American Auto Nation), warranty (PPP), winter tires, PPF, service
  scheduling, sell/trade, refer-a-friend.
- **Not gated to UCG buyers.** Service, sell/trade quotes, and browsing are
  open to anyone stationed in Germany. Buying from UCG is one path through the
  app, not the price of admission.

**It is NOT:**
- A dealership management system. It does not replace DealerTeam and should
  not try to mirror its objects, its deal math, or its internal workflow.
- A system that needs a "clone of DealerTeam" to develop against. It needs a
  well-defined **intake package** (the set of fields UCG needs to open a
  deal) and a thin seam where that package is handed off — WhatsApp/email
  today, the DealerTeam API later, with no app-side rewrite when it swaps.

## The customer journey, end to end

*(This is the pre-arrival buy flow. An in-country user may enter at step 1 to
buy, at the sell/trade flow to move a car on, or at the service hub without
buying anything — same app, different door.)*

1. **Browse inventory** — same cars, same sorting as usedcarguys.net.
2. **Open a car** — full detail page (photos, specs, price, monthly).
3. **Ask the AI bot anything** — gather all the info they need to decide.
4. **Commit** — either:
   - **Buy it**, or
   - **5-day hold** with a **$300 deposit** (reserves the car on the website
     *and* in DealerTeam).
5. **Deal intake** — the customer enters everything DealerTeam needs to open
   the deal. They can, because they have orders. **The APO address is the key
   missing piece** — it's what makes the registration paperwork completable.
6. **Choose the money path** — cash (wire + PIF) or financing (UCG's real
   finance application).
7. **Add-ons, each an explicit accept/decline** (capture the "why" on
   decline):
   - 2-Year Premium Protection Plan ($999) vs. included 1-Year warranty
   - American Auto Nation insurance quote (UCG owns AAN) — first month
     reimbursed
   - Winter Tire Program (may be closer to legal-requirement than upsell)
   - Paint Protection Film
8. **Documents** — customer uploads/scans license, insurance, orders, proof
   of residence; UCG generates deal paperwork (Purchase Order or, for EU-spec
   `DEN` stock, a Cost Estimate for the Super VAT form); customer is
   **notified as each document is ready** and **signs in-app** what needs a
   signature.
9. **Arrival** — customer walks into the VRO with a complete packet:
   registration, plates, environmental sticker. Picks up the car.
10. **After the sale** — service scheduling, refer-a-friend, and eventually
    sell-it-back all live in the same app.

## Feature map — vision vs. reality

| Feature | Status | Blocking |
|---|---|---|
| Inventory list + sorting | **Partial** — live scrape of usedcarguys.net (`ucg-inventory.ts`), no real API | WordPress REST API (`wordpress-inventory-api-spec.md`) |
| Car detail page | **Partial** — scraped, same fragility | same |
| AI chat bot ("UCG Assistant") — runs the whole flow | **Built** — real Claude-backed route; decoupled from any named person (2026-09-03) | Funded Claude API key (Terry now, UCG later); real hosting; consider Haiku 4.5 for cost |
| Real salesperson assigned after deposit (management) | **Built (mock)** (2026-09-03) — `DealServerState.salesperson` null until `deposit-paid`, then assigned | Real names from DealerTeam; management assignment tool |
| "Stuck" escape hatch → real human on WhatsApp/Trengo | **Built** (2026-09-03) — link in chat, placeholder number | UCG's real Trengo-connected WhatsApp number |
| Buy / 5-day hold | Hold **built** | — |
| $300 deposit | **Built** — real PayPal Sandbox | Live PayPal Business creds; webhooks; hosting |
| Deal intake (name, base, license, payment) | **Built + persists** | Grows once real DealerTeam field list is known |
| **APO address capture** | **Built** (2026-09-03) — `ApoAddress` on `DealIntake`, captured on the intake form with an explicit "not assigned yet" state, shown on the timeline's Documents step, fed to the AI agent | — |
| **VRO packet framing** (registration / plates / environmental sticker) | **NOT built** | Need the real list of what the VRO requires; sponsor/orders sub-fields not yet captured |
| Cash path — wire instructions | **Built** — real numbers, printable PDF | — |
| Cash path — PIF confirmation | **NOT built** | UCG confirms receipt; needs backend |
| Financing — link to real app | **Built** — links to usedcarguys.net/finance/ | — |
| Financing — "submitted" checkbox for salesperson | **NOT built** | Backend |
| 2-Year PPP accept/decline + reason | **Built** (2026-09-03) — `/warranty` screen, real terms, eligibility check, decline captures the "why" | — |
| American Auto Nation insurance quote | **Planned** — WhatsApp handoff pattern; the PPP-decline flow is meant to lead here | What AAN needs beyond intake; referral terms |
| Winter Tire Program | **NOT built** | Flyer (pending from Terry) |
| Paint Protection Film | **NOT built** | Flyer (pending from Terry) |
| Refer a Friend | **NOT built** | Backend + reward mechanism decision |
| **Service center** (oil, repair, tires — open to *anyone*, not just buyers) | **Built** (2026-09-03) — `/service` hub, real service list, hands off to UCG's `/book/` etc.; entry points on Browse + Account | Real hours; whether `/book/` should be embedded vs. linked |
| Sell / trade — VIN → multi-step form → quote | **Partial** — Sell It Back screen exists, no real quote engine | Real valuation source (mirror usedcarguys.net/sell-your-vehicle/ 9-step) |
| **Import customer info from the UCG inbound email** | **NOT built** | The Word doc Terry has; where the email lands; backend to parse it |
| Two-way customer messaging for follow-up info | **Partial** — AI chat only | Backend; real salesperson channel |
| Notify customer when a document is ready | **NOT built** | Backend + push (APNs/FCM) |
| Scan / upload documents (license etc.) | **Partial** — multi-page capture built; no edge-detect scanner (Expo Go limit) | — |
| In-app e-signature on UCG documents | **NOT built** | Backend + document storage + e-sign |
| EU-spec vs US-spec paperwork branch (PO vs Cost Estimate) | **NOT built** | Document generation; VAT process detail |

## The DealerTeam relationship (resolves the "should I clone it?" question)

**No clone.** The app never talks to a fake DealerTeam and never models its
schema. Instead:

1. **Define the intake package** — the complete set of fields UCG needs to
   open a deal. Most already exist in `DealIntake` (`mock-data.ts`). APO
   address is now captured (2026-09-03); the remaining VRO sub-fields
   (sponsor rank/unit, gaining installation, report date) are deferred
   until the VRO packet is scoped.
2. **One handoff seam — built (2026-09-03).** `src/lib/deal-sync/`: the app
   talks to the `DealSyncBackend` interface only. `MockDealSync` runs today
   (advances the timeline, simulates the back office on a timer);
   `SalesforceDealSync` is a stub. `createDealSync()` is the one-line swap.
3. **The handoff itself, today** — formatted WhatsApp/email message (Phase 0,
   already the pattern). A human is the sync in both directions.
4. **The handoff later** — backend proxy + Connected App writes a Sales Up /
   Deal record. Only if/when UCG confirms API access exists on their plan.

Full architecture in `salesforce-dealerteam-integration-plan.md`. The point
here: **nothing in the customer experience is blocked on DealerTeam access.**

## What's genuinely new in this conversation (not yet in other docs)

- **APO address** as the linchpin field for the VRO packet.
- **VRO packet** as an explicit deliverable — registration, plates,
  environmental sticker — the app assembling everything the customer carries
  in on arrival.
- **Service center** as a feature open to non-customers (oil changes, repair,
  scheduling) — usedcarguys.net/service-center/.
- **Winter Tire Program** and **PPF** as named add-ons (flyers pending).
- **Inbound-email import** — the app ingesting the customer info from the
  email UCG already receives (Word doc pending), then using in-app messaging
  to collect whatever's missing.
- **In-app e-signature** on UCG-generated documents, plus **ready-document
  notifications**.
- **In-country audience** — the app is equally for service members already in
  Germany (UCG customers or not) who trade/sell and re-buy mid-tour, or just
  need service. Sell/trade and service are first-class entry points, not
  post-sale add-ons.

## Open decisions for Terry / UCG

- The Word doc: what the inbound customer email actually contains, and where
  it lands (inbox? form backend?).
- VRO: the real, current list of what the Vehicle Registration Office
  requires to register + plate + sticker a car for an incoming service
  member. Don't guess this.
- Service center: is booking a real system (Microsoft Bookings, like the
  Pre-Buy Inspection?) or a request form?
- Sell/trade quote: is there a real valuation source to hit, or is it a
  request-a-callback like the current Sell It Back?
- Winter tire + PPF flyers.
- Everything already in `pre-launch-checklist.md` buckets D and E.

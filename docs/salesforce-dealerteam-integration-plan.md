# Salesforce / DealerTeam integration — real-time deal sync plan

Not a spec to hand off yet (there's no backend, no Connected App, no
confirmed object names) — this is the architecture plan for the biggest
remaining gap in the app: `salesperson`, `dealSteps`, `dealDocuments`,
`financingTerms`, and now `DealIntake` (`src/constants/mock-data.ts`) are
all still mock data standing in for whatever a salesperson does inside
DealerTeam. Written down here so the plan survives between sessions
instead of living only in chat.

## What DealerTeam actually is

Confirmed, not assumed: [DealerTeam](https://www.dealerteam.com/) is a
real, Salesforce-native dealership management system (DMS) + CRM — the
first dealer solution listed on the
[Salesforce AppExchange](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N30000009wdBqEAI),
built on the Lightning Platform, ~$120/user/month. Because it's native to
Salesforce rather than a separate system Salesforce talks to, the
standard Salesforce integration surface (REST API, OAuth 2.0 Connected
Apps, Streaming/Pub-Sub API, Change Data Capture) genuinely applies here —
this isn't a guess about some unrelated third-party CRM. What's **not**
confirmed yet: the actual custom object/field API names DealerTeam uses
for a deal, a vehicle, a customer, etc. Those are whatever DealerTeam's
managed package defines, not something to guess at in code — needs
confirming with whoever administers UCG's DealerTeam org (David/Michelle/
James or whoever they'd point to).

## Recommended architecture

This matches real Salesforce integration patterns — laid out here for
reference, no corrections needed to the shape of it:

1. **App → Salesforce (writes).** Customer-entered data (deal intake,
   eventually documents) goes out as an HTTPS POST/PATCH to the
   Salesforce REST API, authenticated via OAuth 2.0 (Web Server Flow),
   *through a backend proxy* — Salesforce credentials must never live in
   the React Native app itself, since a shipped app's code and bundled
   secrets can be extracted.
2. **Salesforce → App (real-time reads).** Rather than polling, enable
   **Change Data Capture** on the relevant DealerTeam/Salesforce objects
   and subscribe via the **Streaming API (CometD)** or the newer
   **Pub/Sub API (gRPC)** — a salesperson's change in DealerTeam publishes
   an event the app can react to instantly.
3. **A backend proxy is required**, not optional — something has to hold
   the Connected App's Consumer Key/Secret, manage/refresh OAuth tokens,
   and relay requests both directions. This app has no backend at all
   today; standing one up (Node or Python, per the original research) is
   itself a prerequisite for *any* of this, independent of which phase
   below gets built first.
4. **Offline queue.** Phone connectivity in transit/on base isn't
   guaranteed — cache and queue writes locally (WatermelonDB or SQLite)
   rather than losing them.
5. **Background updates.** Neither iOS nor Android keeps a live
   streaming connection open while the app is backgrounded/killed —
   real "your financing was approved" alerts need a Salesforce-side Apex
   trigger firing a push notification (APNs/FCM), not the streaming
   connection itself.

## What we've actually seen (from a real screenshot of UCG's org, Aug 25)

Terry sent a screenshot of a live "Sales Up" record in UCG's own
DealerTeam org (Josh Ingram / 2024 BMW X1). This is real, not guessed,
and replaces the earlier best-guess mapping table:

- Top nav is **Home · Chatter · Accounts · Sales Up · Deals · Vehicle
  Inventory · Appraisals · Credit Applications · Reports · Dashboards ·
  Cashiering** — so a deal's lifecycle is spread across *separate*
  objects/tabs (Sales Up → Appraisal → Credit Application → Deal →
  Cashiering), not one flat "Deal" record. `dealSteps` in this app is a
  simplified customer-facing view; it should not be assumed to map
  1:1 onto a single DealerTeam object.
- A **Sales Up** record (the lead/opportunity stage) has: `Salesperson
  1` / `Salesperson 2`, `Email`, `Phone`, `Record Type`, `Stock#` (linked
  to the vehicle), `Deal` (linked once one exists), `Lead Status`, `In
  Store?`, `Be-Back`, `Lead Date`, `Store Location`, and a horizontal
  stage tracker (…→ **Open → HOT → Won**) with a "Mark Lead Status as
  Complete" action. Related tabs on the record: **Vehicle / Buyer /
  Trade / Deals**, plus Chatter and Attached Files.
- Confirms `salesperson` in this app maps to `Salesperson 1` on a Sales
  Up record, and that DealerTeam already models "which vehicle" and
  "store location" the same way this app does (`Stock#`, per-location).
- Still unconfirmed: what a **Deal** record (the separate tab) actually
  contains once Sales Up converts to one — that's almost certainly where
  `financingTerms`/`dealDocuments` would really live, not on Sales Up.

## The real blocker isn't only DealerTeam access — nothing updates the app yet

Worth being blunt about, independent of any Salesforce question:
**`dealSteps` is 100% static mock data right now.** There is no
mechanism today — cheap or expensive — for a salesperson to push a
status update that the customer's app reflects. So "will it be obtained
through DealerTeam" is really two separate questions stacked together:

1. Is there *any* way for a salesperson's update to reach the app at
   all (today: no)?
2. If yes, does it come from DealerTeam specifically, or from something
   UCG builds and owns instead?

Terry's screenshot also confirms the cost concern directly: DealerTeam
markets **"Integrations & Add-Ons"** as its own separate page/tier
(https://www.dealerteam.com/integrations-and-addons) — consistent with
"UCG doesn't have access to everything, this costs a lot of money to
get." That means Phase 1 below (writing/reading DealerTeam via its API)
may not be available on UCG's current plan at all, not just "not built
yet." Realistic planning should not assume it becomes available on any
particular timeline.

## Phased approach

Reordered so the plan doesn't quietly depend on DealerTeam access UCG
may not have:

- **Phase 0 (shipped today):** The deal-intake screen's WhatsApp handoff
  — zero backend, a human (the salesperson) is the sync in both
  directions. This is not just a stopgap "MVP" — given the DealerTeam
  cost question above, this may need to be treated as the **durable
  default**, not a placeholder guaranteed to be replaced.
- **Phase 1a — cheapest real option, no DealerTeam dependency at all:**
  A small, UCG-owned way for a salesperson to push a status update
  themselves — as simple as a single authenticated web form ("mark this
  customer's deal: financing approved / contract signed / car ready")
  that the app polls, no Salesforce integration involved. Costs UCG dev
  time, not a DealerTeam upsell, and doesn't depend on what tier
  DealerTeam access they have.
- **Phase 1b — if/when DealerTeam API access exists:** One-way write via
  backend proxy + Connected App + REST API — submitting the intake form
  actually creates/updates a Sales Up (or later, Deal) record, instead
  of or alongside the WhatsApp message.
- **Phase 2:** Read-your-own-deal on demand — refresh-on-app-open
  against the REST API, no streaming infrastructure. Covers most of the
  real value ("is my financing approved" checked on app open) without
  CDC/gRPC/CometD complexity.
- **Phase 3:** True real-time — CDC + Streaming/Pub-Sub API + Apex-
  triggered push notifications. Only worth planning for once it's
  confirmed UCG's DealerTeam plan (or a future upgrade) actually
  includes this tier.

## Open questions before Phase 1b/2/3 can start

- **Does UCG's current DealerTeam plan include any API/integration
  access at all**, or does that require upgrading to whatever
  "Integrations & Add-Ons" costs? This determines whether Phase 1b is
  worth planning for right now, or whether Phase 1a (UCG-owned, no
  DealerTeam dependency) is the only realistic near-term path.
- Does UCG's DealerTeam subscription include Salesforce Setup access
  (to create a Connected App), or does that have to go through
  DealerTeam's own support/integration team?
- What does a **Deal** record (the tab separate from Sales Up) actually
  contain — that's the more likely home for financing/documents than
  Sales Up.
- Which Salesforce edition UCG is on — Change Data Capture and Pub/Sub
  API access depend on edition/licensing.
- Who builds and hosts the backend/proxy any of Phase 1a/1b needs? It
  doesn't exist yet either way.

## Sources

- [DealerTeam](https://www.dealerteam.com/) —
  [Dealership Management System](https://www.dealerteam.com/products/platform) product page
- [DealerTeam on Salesforce AppExchange](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N30000009wdBqEAI)
- [DealerTeam integrations & add-ons](https://www.dealerteam.com/integrations-and-addons)

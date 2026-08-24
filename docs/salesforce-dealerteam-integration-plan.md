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

## How today's mock data would map over

Best guess, **not confirmed** — the actual DealerTeam object/field names
need to come from whoever administers UCG's org, not be assumed from this
table:

| App concept | Where it lives now | Likely DealerTeam-side equivalent |
|---|---|---|
| `salesperson` | `mock-data.ts` | Assigned User/Contact on the deal record |
| `DealIntake` (new) | `deal-intake-context.tsx` | A new Deal/Opportunity-type record, created on submit |
| `dealSteps` | `mock-data.ts` | A stage field on that record, or a related child object per step |
| `dealDocuments` | `mock-data.ts` | Salesforce Files (ContentDocument) or a custom Document object |
| `financingTerms` | `mock-data.ts` | Fields on the deal record or a related Financing object |

## Phased approach

Full real-time sync (CDC + Pub/Sub + push) is a lot to build before
anything real ships. Suggested order:

- **Phase 0 (shipped today):** The deal-intake screen's WhatsApp handoff
  — zero backend, a human is the "sync." Good enough for a first real
  customer, not a real integration.
- **Phase 1:** One-way write only. Backend proxy + Connected App + REST
  API — submitting the intake form actually creates/updates a DealerTeam
  record, in addition to (or eventually instead of) the WhatsApp message.
  No live updates back to the app yet.
- **Phase 2:** Read-your-own-deal on demand — refresh-on-app-open against
  the REST API, no streaming infrastructure yet. Cheap, and covers most
  of the actual value ("is my financing approved" checked when someone
  opens the app) without CDC/gRPC/CometD complexity.
- **Phase 3:** True real-time — CDC + Streaming/Pub-Sub API + Apex-
  triggered push notifications, per the original research above. Worth
  it once Phases 1–2 prove the rest of the pipeline works.

## Open questions before any of this can start

- Does UCG's DealerTeam subscription include Salesforce Setup access
  (to create a Connected App), or does that have to go through
  DealerTeam's own support/integration team?
- What are the actual object/field API names for a deal, vehicle, and
  customer in UCG's DealerTeam org?
- Which Salesforce edition UCG is on — Change Data Capture and Pub/Sub
  API access depend on edition/licensing.
- Who builds and hosts the backend proxy this requires? It doesn't exist
  yet, and every phase above needs it.

## Sources

- [DealerTeam](https://www.dealerteam.com/) —
  [Dealership Management System](https://www.dealerteam.com/products/platform) product page
- [DealerTeam on Salesforce AppExchange](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N30000009wdBqEAI)
- [DealerTeam integrations & add-ons](https://www.dealerteam.com/integrations-and-addons)

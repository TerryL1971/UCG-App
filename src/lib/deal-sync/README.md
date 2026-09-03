# deal-sync

The seam between the app and UCG's back office (DealerTeam / Salesforce).

## Why this exists

The app needs to know a deal's state — timeline steps, financing terms,
which salesperson — but UCG may not have DealerTeam API access on their
plan for a while (docs/salesforce-dealerteam-integration-plan.md). So the
app **does not talk to DealerTeam and does not model its schema.** It talks
to one interface, `DealSyncBackend`, and there are two implementations:

| | |
|---|---|
| `MockDealSync` | Default everywhere today. In-memory state machine that also *simulates the back office* — steps not waiting on the customer auto-advance on a timer. |
| `SalesforceDealSync` | Stub. Where a real Change-Data-Capture + backend-proxy integration lands. Selected only by `EXPO_PUBLIC_DEAL_SYNC=salesforce`, which nothing sets. |

`createDealSync()` in `factory.ts` is the **only** place that picks. Going
live against DealerTeam is a change to that one function, not an app-wide
refactor.

## What belongs here vs. not

**Here** (back-office state): timeline steps, financing terms, salesperson
assignment, and eventually document *review* status, deposit confirmation,
warranty/add-on selections once they're server-tracked.

**Not here** (device-local): the chosen car (`deal-context`), the
deal-intake form (`deal-intake-context`), captured license/document photos
(`documents-context`, `license-capture-context`). Those are things the
customer holds on their phone until there's a real upload backend.

## Usage

```tsx
const { state, send, reset, jumpToStep } = useDealSync();
state.steps            // DealStep[] — same shape the timeline always used
state.financingTerms   // FinancingTerms | null
send({ type: 'deposit-paid' })   // customer did something worth reporting
```

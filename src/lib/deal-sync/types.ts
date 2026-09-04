import type { DealStep, FinancingTerms, Salesperson } from '@/constants/mock-data';

/**
 * The slice of a deal's state that, in production, comes from UCG's back
 * office — DealerTeam / Salesforce — rather than from the customer's
 * device. Anything the customer captures or chooses locally (the selected
 * car, license photos, document page images) is deliberately NOT here:
 * that stays in its own device-local context. See this folder's other
 * files and docs/salesforce-dealerteam-integration-plan.md.
 */
/**
 * Where a CASH payment stands — the wire-instructions screen has nothing
 * else tracking this, unlike financing (which rides the 7-step timeline's
 * own 'financing' step, "waiting on the bank"). See end-to-end-flow.md
 * Phase 5: "Payment status the customer sees `MOCK`" — this is that.
 * `awaiting_payment`: instructions shown, nothing sent yet.
 * `payment_submitted`: the customer says they wired it.
 * `funds_verified`: stands in for admin confirming funds actually landed
 * (PIF) — still `GAP` as a real process, this is the customer-visible
 * status once it would happen.
 */
export type PaymentStatus = 'awaiting_payment' | 'payment_submitted' | 'funds_verified';

export interface DealServerState {
  /** The customer-facing 7-step timeline. Shape is identical to
   * mock-data.ts's `DealStep[]` so the (fragile) timeline-road SVG never
   * has to change — only where the array is sourced from. */
  steps: DealStep[];
  /** null until a financed deal actually reaches an approved-financing
   * state. A cash deal stays null forever. */
  financingTerms: FinancingTerms | null;
  /** The real human salesperson management assigns to handle logistics —
   * `null` until a deposit is placed (before that the customer is with the
   * AI assistant). "Which salesperson" is a back-office decision, so it
   * lives here; a DealerTeam integration would return the actually-assigned
   * person. */
  salesperson: Salesperson | null;
  /** Cash-payment status only — a financed deal's progress is the
   * 'financing' step above instead. See `PaymentStatus`. */
  paymentStatus: PaymentStatus;
}

/**
 * Something the customer did in the app that's worth telling the back
 * office about. In `MockDealSync` these just nudge an in-memory state
 * machine; in `SalesforceDealSync` each becomes an authenticated write
 * through the backend proxy (create/update a Sales Up or Deal record).
 */
export type DealSignal =
  | { type: 'intake-submitted' }
  | { type: 'deposit-paid' }
  | { type: 'documents-updated' }
  | { type: 'payment-submitted' };

/**
 * The one interface the whole app talks to for deal state. Screens never
 * import a concrete implementation — `createDealSync()` (factory.ts) is
 * the single place the mock-vs-real choice is made, so swapping to a real
 * DealerTeam integration is a one-function change here, not an app-wide
 * refactor.
 */
export interface DealSyncBackend {
  getState(): DealServerState;
  /** Fires `listener` whenever `getState()` would return a new value.
   * Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Report a customer-side event. */
  send(signal: DealSignal): void;
  /** Back to a fresh, just-matched deal (what "Reset Test Data" does). */
  reset(): void;
  /** Dev/test only — jump the timeline straight to a given step index.
   * A real backend can't fake its own state from the client, so
   * `SalesforceDealSync` no-ops this. */
  jumpToStep(index: number): void;
  /** Dev/test only — jump straight to a payment status, same rationale as
   * `jumpToStep`. `SalesforceDealSync` no-ops this too. */
  setPaymentStatus(status: PaymentStatus): void;
}

import type { DealStep, FinancingTerms, PaymentMethod, Salesperson } from '@/constants/mock-data';

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
  /** Whether every "message UCG" action for this deal should go straight
   * to the assigned specialist's own WhatsApp instead of the shared
   * Trengo inbox. `false` by default even once `salesperson` is assigned
   * — a deposit alone doesn't mean the specialist has asked to move off
   * Trengo yet; this flips independently, whenever they actually do. See
   * `specialistWhatsapp()` in mock-data.ts and `setPersonalWhatsapp`
   * below for how (there's no real trigger for this yet — Terry, 2026-09-
   * 21: "keep it simulated for now," same call as `paymentStatus`'s PIF
   * timer). Meaningless (and never true) while `salesperson` is null. */
  onPersonalWhatsapp: boolean;
}

/**
 * Something the customer did in the app that's worth telling the back
 * office about. In `MockDealSync` these just nudge an in-memory state
 * machine; in `SalesforceDealSync` each becomes an authenticated write
 * through the backend proxy (create/update a Sales Up or Deal record).
 */
export type DealSignal =
  // Carries paymentMethod because the back office needs to know cash vs.
  // financing to make sense of the 'financing' step at all — cash never
  // goes to a bank for approval, it goes to `paymentStatus` instead (see
  // that field's comment above and mock-deal-sync.ts). Also carries isDen
  // (from the *car*, not the intake form — deal-intake.tsx reads it off
  // `useDeal()`) because a DEN-stock car's 'financing' step is the
  // Cashier's-Check/VAT-Office process regardless of cash vs financing —
  // it needs the generic per-step timer either way, not paymentStatus's
  // wire-transfer gating, which doesn't apply to a DEN car at all.
  | { type: 'intake-submitted'; paymentMethod: PaymentMethod; isDen: boolean }
  | { type: 'deposit-paid' }
  | { type: 'documents-updated' }
  | { type: 'payment-submitted' }
  // The step-5 paperwork is done — see deal-paperwork.tsx. Two different
  // real actions fire this, depending on the car: a signed-copy photo
  // upload for a Purchase Order (non-DEN stock), or just printing/sharing
  // the Cost Estimate for a DEN-stock car (never signed — see
  // isDenStock's doc comment, VAT-Form cars don't get a signed contract
  // through this app). Neither path involves a bank or e-sign integration.
  | { type: 'paperwork-complete' };

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
  /** Dev/test only — flips `onPersonalWhatsapp` directly, standing in for
   * "the assigned specialist asked to move this deal off Trengo." No real
   * trigger exists yet (see that field's doc comment); `SalesforceDealSync`
   * no-ops this too, same as the other dev-only setters. */
  setPersonalWhatsapp(active: boolean): void;
}

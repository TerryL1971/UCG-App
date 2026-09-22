import {
  dealSteps as demoStartSteps,
  financingTerms as demoFinancingTerms,
  freshDealSteps,
  salesperson,
  type DealStep,
  type PaymentMethod,
} from '@/constants/mock-data';

import type { DealServerState, DealSignal, DealSyncBackend, PaymentStatus } from './types';

/**
 * The default backend everywhere today. An in-memory state machine over
 * the 7-step deal timeline that also *simulates the back office*: steps
 * that are "waiting on UCG" or "waiting on the bank" auto-advance on a
 * timer, as if a salesperson or lender did something. Steps "waiting on
 * you" never move on their own — the customer has to act (send a signal)
 * first.
 *
 * This is the concrete answer to "should we clone DealerTeam?" — no: the
 * app codes against `DealSyncBackend`, and this fake is enough to build
 * and test every downstream deal screen against.
 */

/** How long to wait before auto-advancing a not-on-the-customer step.
 * Deliberately long — short enough to see the seam work, long enough not
 * to fight manual testing with the Jump-to-Step chips (which call
 * `jumpToStep`, cancelling the timer anyway). */
const AUTO_ADVANCE_MS = 45_000;

/** Real titles/waitingOn per step come from the full 7-step list; only
 * status is recomputed, and `detail` is dropped for anything not "done"
 * (matching how `freshDealSteps` already reads). Same helper the old
 * deal-steps-context used. */
function stepsAtIndex(index: number): DealStep[] {
  return demoStartSteps.map((step, i) => ({
    ...step,
    status: i < index ? 'done' : i === index ? 'current' : 'upcoming',
    detail: i < index ? step.detail : undefined,
  }));
}

function currentIndex(steps: DealStep[]): number {
  const i = steps.findIndex((s) => s.status === 'current');
  return i === -1 ? steps.length - 1 : i;
}

/** Which step id a given customer signal is allowed to complete, but only
 * while that step is the current one AND it's "waiting on you". Not
 * consulted for 'payment-submitted' — that signal has its own dedicated
 * handling in `send()` (it drives `paymentStatus`, not a timeline step) —
 * the `() => false` entry exists only so this stays a total `Record`. */
const SIGNAL_COMPLETES: Record<DealSignal['type'], (step: DealStep) => boolean> = {
  'intake-submitted': (s) => s.id === 'matched' || s.id === 'application',
  'deposit-paid': (s) => s.id === 'matched',
  'documents-updated': (s) => s.id === 'documents',
  'payment-submitted': () => false,
  'paperwork-complete': (s) => s.id === 'contract',
  'cashiers-check-obtained': (s) => s.id === 'application',
};

export class MockDealSync implements DealSyncBackend {
  private steps: DealStep[] = demoStartSteps;
  // Whether management has assigned a human salesperson yet. True on the
  // demo-start state (a further-along deal); a fresh deal starts false and
  // flips on the `deposit-paid` signal — matching "a salesperson is
  // assigned by management once the customer has placed a deposit".
  private assigned = true;
  // A brand-new demo deal is financed (see `dealSteps`/`financingTerms`
  // defaults), so this starts 'awaiting_payment' rather than implying a
  // cash wire is already in flight — it only becomes visible/relevant once
  // the customer is actually on the cash path.
  private paymentStatus: PaymentStatus = 'awaiting_payment';
  // Unknown until the customer's intake actually says otherwise — defaults
  // to 'financing' to match the demo-start state above (financingTerms
  // already populated, 'financing' step already 'done'). Only 'intake-
  // submitted' ever changes this — see `send()`.
  private paymentMethod: PaymentMethod = 'financing';
  // Whether the chosen car is DEN-stock (from `car`, via deal-intake.tsx —
  // see the 'intake-submitted' signal's doc comment). A DEN car's
  // 'financing' step is always the Cashier's-Check/VAT-Office process
  // regardless of cash vs financing, so it needs the generic per-step
  // timer either way — see scheduleAutoAdvance()'s cash exclusion below,
  // which this also has to override.
  private isDen = false;
  // Off by default even on the demo-start "further along" deal — see this
  // field's doc comment on DealServerState for why a deposit alone doesn't
  // imply it. Only `setPersonalWhatsapp()` (dev/test only for now) changes
  // this.
  private onPersonalWhatsapp = false;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private paymentTimer: ReturnType<typeof setTimeout> | null = null;
  // Memoized so useSyncExternalStore doesn't see a fresh object on every
  // call and re-render forever — cleared on every mutation by emit().
  private cachedState: DealServerState | null = null;

  getState(): DealServerState {
    if (!this.cachedState) {
      // A cash deal never goes to a bank for approval, so it never gets
      // real financing terms even once the 'financing' step itself
      // (relabeled "Funds Received" for cash — see deal/index.tsx) reaches
      // 'done'. Neither does a DEN-stock deal — it pays via Cashier's
      // Check + VAT Office regardless of cash vs financing, never a bank
      // loan against UCG (see deal/index.tsx's DEN branch for that step).
      const financingApproved =
        this.paymentMethod !== 'cash' &&
        !this.isDen &&
        this.steps.find((s) => s.id === 'financing')?.status === 'done';
      this.cachedState = {
        steps: this.steps,
        financingTerms: financingApproved ? demoFinancingTerms : null,
        salesperson: this.assigned ? salesperson : null,
        paymentStatus: this.paymentStatus,
        // Can't be on someone's personal WhatsApp if no one's assigned —
        // defensive even though the only setter (`setPersonalWhatsapp`) is
        // meant to be gated the same way at the call site.
        onPersonalWhatsapp: this.assigned && this.onPersonalWhatsapp,
      };
    }
    return this.cachedState;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  send(signal: DealSignal): void {
    // A confirmed deposit is what gets a real salesperson assigned.
    if (signal.type === 'deposit-paid') this.assigned = true;

    // The back office only learns cash-vs-financing (and DEN-ness, from
    // the chosen car) when the customer actually submits their intake —
    // same moment `paymentMethod` is captured in deal-intake-context
    // locally.
    if (signal.type === 'intake-submitted') {
      this.paymentMethod = signal.paymentMethod;
      this.isDen = signal.isDen;
    }

    if (signal.type === 'payment-submitted') {
      // "I sent the wire" — moves to 'payment_submitted' immediately, then
      // simulates admin verifying funds landed (PIF) after a wait, the
      // same "waiting on UCG auto-advances" pattern the 7-step timeline
      // already uses. Only meaningful from 'awaiting_payment' — resending
      // once already submitted/verified is a no-op, not a reset backward.
      if (this.paymentStatus === 'awaiting_payment') {
        this.paymentStatus = 'payment_submitted';
        this.emit();
        this.schedulePaymentVerification();
      }
      return;
    }

    const step = this.steps[currentIndex(this.steps)];
    // A DEN cash payer has no financing application to submit, so
    // 'intake-submitted' shouldn't complete 'application' for them the
    // way it does for every other cash/financing × DEN/non-DEN
    // combination — only the explicit 'cashiers-check-obtained' signal
    // does, once they've actually confirmed they have the check in hand.
    const isDenCashApplication =
      step?.id === 'application' && signal.type === 'intake-submitted' && this.isDen && this.paymentMethod === 'cash';
    if (!isDenCashApplication && step && step.waitingOn === 'you' && SIGNAL_COMPLETES[signal.type]?.(step)) {
      this.advance();
    } else if (signal.type === 'deposit-paid') {
      this.emit(); // assignment changed even if no step advanced
    }
  }

  reset(): void {
    this.clearTimer();
    this.clearPaymentTimer();
    this.steps = freshDealSteps;
    this.assigned = false; // fresh deal — no salesperson until a deposit
    this.paymentStatus = 'awaiting_payment';
    this.paymentMethod = 'financing'; // unknown again until intake is submitted
    this.isDen = false;
    this.onPersonalWhatsapp = false;
    this.emit();
    this.scheduleAutoAdvance();
  }

  jumpToStep(index: number): void {
    // Manual override — stop pretending the back office is working so the
    // tester's chosen step doesn't move out from under them. Steps past
    // "matched" imply a deposit happened, so a salesperson is assigned.
    this.clearTimer();
    this.steps = stepsAtIndex(index);
    this.assigned = index >= 1;
    if (!this.assigned) this.onPersonalWhatsapp = false; // can't be assigned nowhere
    this.emit();
  }

  setPaymentStatus(status: PaymentStatus): void {
    // Dev/test only (see the interface doc comment) — same "stop
    // pretending the timer is real" override as jumpToStep.
    this.clearPaymentTimer();
    this.paymentStatus = status;
    this.emit();
    if (status === 'payment_submitted') this.schedulePaymentVerification();
  }

  setPersonalWhatsapp(active: boolean): void {
    // Dev/test only (see the interface doc comment) — stands in for the
    // assigned specialist actually asking to move off Trengo. Force-
    // assigns a specialist when flipping this on, same as jumpToStep's
    // `assigned = index >= 1` — a dev override should work from any state
    // without first walking through the deposit flow, not silently no-op
    // because nothing's assigned yet.
    if (active) this.assigned = true;
    this.onPersonalWhatsapp = active;
    this.emit();
  }

  private advance(): void {
    const idx = currentIndex(this.steps);
    if (idx >= this.steps.length - 1) return;
    this.steps = stepsAtIndex(idx + 1);
    this.emit();
    this.scheduleAutoAdvance();
  }

  private scheduleAutoAdvance(): void {
    this.clearTimer();
    const step = this.steps[currentIndex(this.steps)];
    if (!step) return;
    // A cash deal's 'financing' step isn't a bank approval to fake a wait
    // for — it's UCG confirming wire funds landed, which
    // `schedulePaymentVerification()` already drives off `paymentStatus`.
    // Let that be the only thing advancing this step for cash. Doesn't
    // apply to a DEN-stock deal though, even a cash one — DEN never goes
    // through the wire-transfer/paymentStatus flow at all (Cashier's
    // Check instead), so it always needs this generic timer regardless of
    // payment method.
    if (step.id === 'financing' && this.paymentMethod === 'cash' && !this.isDen) return;
    if (step.waitingOn === 'ucg' || step.waitingOn === 'bank') {
      this.timer = setTimeout(() => this.advance(), AUTO_ADVANCE_MS);
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedulePaymentVerification(): void {
    this.clearPaymentTimer();
    this.paymentTimer = setTimeout(() => {
      this.paymentStatus = 'funds_verified';
      // For cash, this *is* the "someone at UCG confirms the wire landed"
      // moment `scheduleAutoAdvance()` deliberately stepped aside for — so
      // it's what completes the 'financing' ("Funds Received") step too,
      // if that's still where the timeline is sitting.
      const idx = currentIndex(this.steps);
      if (this.paymentMethod === 'cash' && this.steps[idx]?.id === 'financing' && idx < this.steps.length - 1) {
        this.steps = stepsAtIndex(idx + 1);
        this.scheduleAutoAdvance();
      }
      this.emit();
    }, AUTO_ADVANCE_MS);
  }

  private clearPaymentTimer(): void {
    if (this.paymentTimer) {
      clearTimeout(this.paymentTimer);
      this.paymentTimer = null;
    }
  }

  private emit(): void {
    this.cachedState = null;
    this.listeners.forEach((l) => l());
  }
}

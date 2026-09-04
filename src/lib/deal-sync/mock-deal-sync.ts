import {
  dealSteps as demoStartSteps,
  financingTerms as demoFinancingTerms,
  freshDealSteps,
  salesperson,
  type DealStep,
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
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private paymentTimer: ReturnType<typeof setTimeout> | null = null;
  // Memoized so useSyncExternalStore doesn't see a fresh object on every
  // call and re-render forever — cleared on every mutation by emit().
  private cachedState: DealServerState | null = null;

  getState(): DealServerState {
    if (!this.cachedState) {
      const financingApproved = this.steps.find((s) => s.id === 'financing')?.status === 'done';
      this.cachedState = {
        steps: this.steps,
        financingTerms: financingApproved ? demoFinancingTerms : null,
        salesperson: this.assigned ? salesperson : null,
        paymentStatus: this.paymentStatus,
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
    if (step && step.waitingOn === 'you' && SIGNAL_COMPLETES[signal.type]?.(step)) {
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
    if (step && (step.waitingOn === 'ucg' || step.waitingOn === 'bank')) {
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

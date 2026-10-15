import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  dealSteps as demoStartSteps,
  financingTerms as demoFinancingTerms,
  freshDealSteps,
  salesperson,
  type DealStep,
  type PaymentMethod,
} from '@/constants/mock-data';

import type { DealServerState, DealSignal, DealSyncBackend, PaymentStatus } from './types';

/** Everything this class needs to pick up right where it left off —
 * `listeners`/`timer`/`paymentTimer`/`cachedState` are deliberately left
 * out, they're runtime-only. Persisted to AsyncStorage now (Terry,
 * 2026-10-15, catching a real gap): this whole class used to be pure
 * in-memory state while deal-intake-context.tsx/warranty-context.tsx/
 * deal-context.tsx already persisted, so a force-quit mid-deal reset the
 * customer's entire timeline back to step 1 — with a chosen car and
 * intake answers that still looked intact — even though nothing about
 * the deal itself had actually changed. */
interface PersistedDealSyncState {
  steps: DealStep[];
  assigned: boolean;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  isDen: boolean;
  financingApproved: boolean;
  financingDeclined: boolean;
  onPersonalWhatsapp: boolean;
}

const STORAGE_KEY = 'ucg.dealSyncState';

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
  // Tracks whether financing was ACTUALLY approved (the bank-wait timer in
  // advance() genuinely fired while financing applied), rather than being
  // re-derived from the *current* paymentMethod every read (Terry,
  // 2026-10-15, catching a real bug: re-deriving it meant switching
  // payment method mid-deal via "Edit My Info" could retroactively
  // fabricate approved terms no bank ever gave, or erase real ones, purely
  // because the 'financing' step happened to already be 'done'). Matches
  // the demo-start state, where the financing step is already 'done' under
  // the default financing/non-DEN starting conditions.
  private financingApproved = demoStartSteps.find((s) => s.id === 'financing')?.status === 'done';
  // A real decline outcome wasn't modeled at all before this (Terry,
  // 2026-10-15) — see this field's doc comment on DealServerState.
  // Dev/test only for now (setFinancingDeclined), same as
  // onPersonalWhatsapp below — no real bank-decline trigger exists yet.
  private financingDeclined = false;
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

  constructor() {
    this.hydrate();
  }

  // Can't be awaited by getState() (the DealSyncBackend interface requires
  // it stay synchronous — useSyncExternalStore's getSnapshot can't be
  // async) — runs in the background after construction, same shape as
  // every other AsyncStorage-backed context's own load-on-mount effect.
  // Until this resolves, getState() just returns the normal field-
  // initializer defaults above, same as it always has.
  private hydrate(): void {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved: Partial<PersistedDealSyncState> = JSON.parse(raw);
        if (saved.steps) this.steps = saved.steps;
        if (typeof saved.assigned === 'boolean') this.assigned = saved.assigned;
        if (saved.paymentStatus) this.paymentStatus = saved.paymentStatus;
        if (saved.paymentMethod) this.paymentMethod = saved.paymentMethod;
        if (typeof saved.isDen === 'boolean') this.isDen = saved.isDen;
        if (typeof saved.financingApproved === 'boolean') this.financingApproved = saved.financingApproved;
        if (typeof saved.financingDeclined === 'boolean') this.financingDeclined = saved.financingDeclined;
        if (typeof saved.onPersonalWhatsapp === 'boolean') this.onPersonalWhatsapp = saved.onPersonalWhatsapp;
        this.emit();
        // Resume whatever timer the restored state implies — same
        // "doesn't try to account for elapsed time, just restarts the
        // wait" simplification jumpToStep/setPaymentStatus already use
        // for a dev override. Skipped entirely for a declined outcome,
        // same as setFinancingDeclined's own guard.
        if (!this.financingDeclined) this.scheduleAutoAdvance();
        if (this.paymentStatus === 'payment_submitted') this.schedulePaymentVerification();
      })
      .catch(() => {
        // Corrupt or inaccessible storage — start clean rather than crash.
      });
  }

  private persist(): void {
    const snapshot: PersistedDealSyncState = {
      steps: this.steps,
      assigned: this.assigned,
      paymentStatus: this.paymentStatus,
      paymentMethod: this.paymentMethod,
      isDen: this.isDen,
      financingApproved: this.financingApproved,
      financingDeclined: this.financingDeclined,
      onPersonalWhatsapp: this.onPersonalWhatsapp,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {});
  }

  getState(): DealServerState {
    if (!this.cachedState) {
      this.cachedState = {
        steps: this.steps,
        financingTerms: this.financingApproved ? demoFinancingTerms : null,
        salesperson: this.assigned ? salesperson : null,
        paymentStatus: this.paymentStatus,
        // Can't be on someone's personal WhatsApp if no one's assigned —
        // defensive even though the only setter (`setPersonalWhatsapp`) is
        // meant to be gated the same way at the call site.
        onPersonalWhatsapp: this.assigned && this.onPersonalWhatsapp,
        financingDeclined: this.financingDeclined,
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
      // Only clear a previously-earned approval when payment method or
      // DEN-ness actually changes — resubmitting intake with the same
      // values (e.g. just editing notes) shouldn't erase a real approval.
      if (this.paymentMethod !== signal.paymentMethod || this.isDen !== signal.isDen) {
        this.financingApproved = false;
        this.financingDeclined = false;
      }
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
    this.financingApproved = false;
    this.financingDeclined = false;
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
    // Dev tool, so blunt is fine: jumping past 'financing' shows approved
    // terms only under conditions that could genuinely produce them (not
    // cash, not DEN) — same rule advance() uses for the real path.
    const financingIdx = demoStartSteps.findIndex((s) => s.id === 'financing');
    this.financingApproved = index > financingIdx && this.paymentMethod !== 'cash' && !this.isDen;
    this.financingDeclined = false;
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

  setFinancingDeclined(declined: boolean): void {
    // Dev/test only (see the interface doc comment) — stands in for a real
    // bank actually declining the application. Clears a stale approval if
    // one somehow already existed, same mutual-exclusivity cleanup
    // financingApproved's own setters already do for each other. Stops
    // the auto-advance timer too — otherwise it could still fire later
    // and silently advance past a step this just declared declined.
    if (declined) {
      this.clearTimer();
      this.financingApproved = false;
    }
    this.financingDeclined = declined;
    this.emit();
  }

  private advance(): void {
    const idx = currentIndex(this.steps);
    if (idx >= this.steps.length - 1) return;
    // The real moment financing gets "approved" — leaving the 'financing'
    // step behind while it's genuinely a bank-approval wait (not cash,
    // not DEN, which never goes to a bank at all; see this field's doc
    // comment). Checked at the moment it happens, not re-derived later.
    if (this.steps[idx]?.id === 'financing' && this.paymentMethod !== 'cash' && !this.isDen) {
      this.financingApproved = true;
    }
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
    this.persist();
    this.listeners.forEach((l) => l());
  }
}

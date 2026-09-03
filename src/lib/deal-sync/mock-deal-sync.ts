import {
  dealSteps as demoStartSteps,
  financingTerms as demoFinancingTerms,
  freshDealSteps,
  salesperson,
  type DealStep,
} from '@/constants/mock-data';

import type { DealServerState, DealSignal, DealSyncBackend } from './types';

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
 * while that step is the current one AND it's "waiting on you". */
const SIGNAL_COMPLETES: Record<DealSignal['type'], (step: DealStep) => boolean> = {
  'intake-submitted': (s) => s.id === 'matched' || s.id === 'application',
  'deposit-paid': (s) => s.id === 'matched',
  'documents-updated': (s) => s.id === 'documents',
};

export class MockDealSync implements DealSyncBackend {
  private steps: DealStep[] = demoStartSteps;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  // Memoized so useSyncExternalStore doesn't see a fresh object on every
  // call and re-render forever — cleared on every mutation by emit().
  private cachedState: DealServerState | null = null;

  getState(): DealServerState {
    if (!this.cachedState) {
      const financingApproved = this.steps.find((s) => s.id === 'financing')?.status === 'done';
      this.cachedState = {
        steps: this.steps,
        financingTerms: financingApproved ? demoFinancingTerms : null,
        salesperson,
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
    const step = this.steps[currentIndex(this.steps)];
    if (step && step.waitingOn === 'you' && SIGNAL_COMPLETES[signal.type]?.(step)) {
      this.advance();
    }
  }

  reset(): void {
    this.clearTimer();
    this.steps = freshDealSteps;
    this.emit();
    this.scheduleAutoAdvance();
  }

  jumpToStep(index: number): void {
    // Manual override — stop pretending the back office is working so the
    // tester's chosen step doesn't move out from under them.
    this.clearTimer();
    this.steps = stepsAtIndex(index);
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

  private emit(): void {
    this.cachedState = null;
    this.listeners.forEach((l) => l());
  }
}

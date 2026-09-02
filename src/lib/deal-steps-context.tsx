import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { dealSteps as defaultDealSteps, freshDealSteps, type DealStep } from '@/constants/mock-data';

/**
 * Makes the My Deal timeline's steps resettable. `dealSteps` in
 * mock-data.ts is a further-along demo default on purpose (see the
 * comment there); this context holds that as the *starting* state so
 * nothing changes for a first launch, but lets "Reset Test Data" (Account
 * tab) actually reset it to a fresh, just-matched deal — which testers
 * reasonably expect "reset" to do, even though this timeline isn't tied
 * to any account (there's no backend yet — see
 * docs/backend-and-ai-agent-plan.md for what eventually replaces this).
 *
 * `setDealStepIndex` is a testing-only addition (Sept 2, Terry: "I need
 * to test each step") — jumps straight to any of the 7 states so each
 * one's detail panel/road position can be checked without a real backend
 * to actually advance a deal over days. Not something a real customer
 * ever triggers; see the "Testing: Jump to Step" row on the My Deal
 * screen, clearly marked as a dev aid, not a real feature.
 */
interface DealStepsContextValue {
  dealSteps: DealStep[];
  resetDealSteps: () => void;
  setDealStepIndex: (index: number) => void;
}

const DealStepsContext = createContext<DealStepsContextValue | null>(null);

/** Real titles/waitingOn per step come from the mock data's full 7-step
 * list — this only recomputes status (and drops `detail` for anything
 * not actually "done", matching how freshDealSteps already reads). */
function stepsAtIndex(index: number): DealStep[] {
  return defaultDealSteps.map((step, i) => ({
    ...step,
    status: i < index ? 'done' : i === index ? 'current' : 'upcoming',
    detail: i < index ? step.detail : undefined,
  }));
}

export function DealStepsProvider({ children }: { children: ReactNode }) {
  const [dealSteps, setDealSteps] = useState<DealStep[]>(defaultDealSteps);
  const value = useMemo(
    () => ({
      dealSteps,
      resetDealSteps: () => setDealSteps(freshDealSteps),
      setDealStepIndex: (index: number) => setDealSteps(stepsAtIndex(index)),
    }),
    [dealSteps],
  );
  return <DealStepsContext.Provider value={value}>{children}</DealStepsContext.Provider>;
}

export function useDealSteps() {
  const ctx = useContext(DealStepsContext);
  if (!ctx) {
    throw new Error('useDealSteps must be used within a DealStepsProvider');
  }
  return ctx;
}

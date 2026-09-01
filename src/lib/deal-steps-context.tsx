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
 */
interface DealStepsContextValue {
  dealSteps: DealStep[];
  resetDealSteps: () => void;
}

const DealStepsContext = createContext<DealStepsContextValue | null>(null);

export function DealStepsProvider({ children }: { children: ReactNode }) {
  const [dealSteps, setDealSteps] = useState<DealStep[]>(defaultDealSteps);
  const value = useMemo(
    () => ({ dealSteps, resetDealSteps: () => setDealSteps(freshDealSteps) }),
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

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { DealIntake } from '@/constants/mock-data';

/**
 * Holds what the customer entered on the deal-intake screen (payment
 * method, base, license status, etc.) once they submit it — a stand-in for
 * the record a salesperson would actually be building in Dealer Team
 * (Salesforce) at this point. Same in-memory-only pattern as deal-context:
 * this should become a real, server-side deal record once accounts + the
 * Dealer Team API exist, not local state that resets on app restart.
 */
interface DealIntakeContextValue {
  intake: DealIntake | null;
  submitIntake: (intake: DealIntake) => void;
}

const DealIntakeContext = createContext<DealIntakeContextValue | null>(null);

export function DealIntakeProvider({ children }: { children: ReactNode }) {
  const [intake, setIntake] = useState<DealIntake | null>(null);
  const value = useMemo(() => ({ intake, submitIntake: setIntake }), [intake]);
  return <DealIntakeContext.Provider value={value}>{children}</DealIntakeContext.Provider>;
}

export function useDealIntake() {
  const ctx = useContext(DealIntakeContext);
  if (!ctx) {
    throw new Error('useDealIntake must be used within a DealIntakeProvider');
  }
  return ctx;
}

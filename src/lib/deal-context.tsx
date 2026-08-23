import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { InventoryDetail } from '@/lib/ucg-inventory';

/**
 * Tracks the car the customer actually chose, so the salesperson-match,
 * timeline, and documents screens can reference the real car instead of a
 * hardcoded placeholder once someone taps "Choose This Car".
 *
 * This is intentionally just in-memory React state, not persisted — once
 * there's a real backend/auth, "the customer's active deal" should come
 * from the server (tied to their account), not local state that resets on
 * app restart. This is a stand-in for that until then.
 */
interface DealContextValue {
  car: InventoryDetail | null;
  chooseCar: (car: InventoryDetail) => void;
}

const DealContext = createContext<DealContextValue | null>(null);

export function DealProvider({ children }: { children: ReactNode }) {
  const [car, setCar] = useState<InventoryDetail | null>(null);
  const value = useMemo(() => ({ car, chooseCar: setCar }), [car]);
  return <DealContext.Provider value={value}>{children}</DealContext.Provider>;
}

export function useDeal() {
  const ctx = useContext(DealContext);
  if (!ctx) {
    throw new Error('useDeal must be used within a DealProvider');
  }
  return ctx;
}

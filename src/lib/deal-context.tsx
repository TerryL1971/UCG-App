import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { InventoryDetail } from '@/lib/ucg-inventory';

/**
 * Tracks the car the customer actually chose, so the salesperson-match,
 * timeline, and documents screens can reference the real car instead of a
 * hardcoded placeholder once someone taps "Choose This Car".
 *
 * Persisted to AsyncStorage now (Terry, 2026-10-15, catching a real gap)
 * — this used to be pure in-memory state while deal-intake-context.tsx and
 * warranty-context.tsx both already persisted, so a force-quit mid-deal
 * left a customer's intake/warranty choice looking intact while the car
 * itself (and, since mock-deal-sync.ts derives its own 'financing'/isDen
 * logic from signals keyed off that car, the whole timeline) silently
 * vanished — and for a DEN customer specifically, every screen would
 * start reading `isDenStock(undefined)` as false and show "Deposit"
 * instead of "Reservation Fee," the exact legal-wording violation the
 * rest of the app is careful to avoid. Once there's a real backend/auth,
 * "the customer's active deal" should come from the server (tied to their
 * account) instead — this is a stand-in for that until then, same as
 * every other AsyncStorage-backed context in this app.
 */
interface DealContextValue {
  car: InventoryDetail | null;
  chooseCar: (car: InventoryDetail) => void;
  /** Available for a full test-data reset (see Account tab). */
  clearCar: () => void;
}

const DealContext = createContext<DealContextValue | null>(null);

const STORAGE_KEY = 'ucg.dealCar';

export function DealProvider({ children }: { children: ReactNode }) {
  const [car, setCarState] = useState<InventoryDetail | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setCarState(JSON.parse(raw));
      })
      .catch(() => {
        // Corrupt or inaccessible storage — start clean rather than crash.
      });
  }, []);

  const chooseCar = useCallback((next: InventoryDetail) => {
    setCarState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const clearCar = useCallback(() => {
    setCarState(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const value = useMemo(() => ({ car, chooseCar, clearCar }), [car, chooseCar, clearCar]);
  return <DealContext.Provider value={value}>{children}</DealContext.Provider>;
}

export function useDeal() {
  const ctx = useContext(DealContext);
  if (!ctx) {
    throw new Error('useDeal must be used within a DealProvider');
  }
  return ctx;
}

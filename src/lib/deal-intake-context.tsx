import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { DealIntake } from '@/constants/mock-data';

/**
 * Holds what the customer entered on the deal-intake screen (payment
 * method, base, license status, etc.) once they submit it — a stand-in for
 * the record a salesperson would actually be building in Dealer Team
 * (Salesforce) at this point. This should still become a real, server-side
 * deal record once the Dealer Team API exists — but "resets on app
 * restart" was a real, reported problem in the meantime (Terry, Sept 2:
 * "my phone number disappears... I have to reenter it every time"), so
 * this now persists to AsyncStorage the same way auth-context.tsx already
 * does, rather than staying in-memory-only until the real backend lands.
 */
interface DealIntakeContextValue {
  intake: DealIntake | null;
  submitIntake: (intake: DealIntake) => void;
  /** Clears any submitted intake — called when a new car is chosen (a
   * previous car's intake shouldn't linger and look "submitted" for a
   * car it was never about), and available for a full data reset. */
  clearIntake: () => void;
}

const STORAGE_KEY = 'ucg.dealIntake';

const DealIntakeContext = createContext<DealIntakeContextValue | null>(null);

export function DealIntakeProvider({ children }: { children: ReactNode }) {
  const [intake, setIntakeState] = useState<DealIntake | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setIntakeState(JSON.parse(raw));
      })
      .catch(() => {
        // Corrupt or inaccessible storage — fall back to no saved intake
        // rather than crash on startup.
      });
  }, []);

  const persist = (next: DealIntake | null) => {
    setIntakeState(next);
    if (next) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  };

  const value = useMemo(
    () => ({ intake, submitIntake: persist, clearIntake: () => persist(null) }),
    [intake],
  );

  return <DealIntakeContext.Provider value={value}>{children}</DealIntakeContext.Provider>;
}

export function useDealIntake() {
  const ctx = useContext(DealIntakeContext);
  if (!ctx) {
    throw new Error('useDealIntake must be used within a DealIntakeProvider');
  }
  return ctx;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * The customer's explicit accept/decline on the 2-Year Premium Protection
 * Plan (docs/deal-flow-roadmap.md: it has to be a real yes/no, and a
 * decline has to capture *why*). Device-local and AsyncStorage-persisted,
 * same as deal-intake-context — it's customer input, not back-office
 * state, so it lives here until there's a real backend to hold it (at
 * which point it'd move into the deal-sync module as an add-on selection;
 * see src/lib/deal-sync/README.md).
 */
export interface WarrantyChoice {
  decision: 'accepted' | 'declined';
  /** One of `warrantyDeclineReasons` or free text — only set when declined. */
  declineReason?: string;
  /** Optional extra detail the customer typed. */
  declineNote?: string;
  /** ISO timestamp. */
  decidedAt: string;
}

interface WarrantyContextValue {
  choice: WarrantyChoice | null;
  setChoice: (choice: WarrantyChoice) => void;
  clearChoice: () => void;
}

const STORAGE_KEY = 'ucg.warrantyChoice';

const WarrantyContext = createContext<WarrantyContextValue | null>(null);

export function WarrantyProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<WarrantyChoice | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setChoiceState(JSON.parse(raw));
      })
      .catch(() => {
        // Corrupt/inaccessible storage — start with no choice on file.
      });
  }, []);

  const persist = (next: WarrantyChoice | null) => {
    setChoiceState(next);
    if (next) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  };

  const value = useMemo(
    () => ({ choice, setChoice: persist, clearChoice: () => persist(null) }),
    [choice],
  );

  return <WarrantyContext.Provider value={value}>{children}</WarrantyContext.Provider>;
}

export function useWarranty() {
  const ctx = useContext(WarrantyContext);
  if (!ctx) {
    throw new Error('useWarranty must be used within a WarrantyProvider');
  }
  return ctx;
}

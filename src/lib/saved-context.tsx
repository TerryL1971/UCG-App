import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { InventoryListItem } from '@/lib/ucg-inventory';

/**
 * Shared "saved cars" list so the heart button on a car card and the Saved
 * tab actually agree with each other. In-memory only for the same reason
 * as deal-context.tsx — this should move to a real account-backed store
 * once auth exists, not persist locally forever.
 */
interface SavedContextValue {
  savedCars: InventoryListItem[];
  isSaved: (slug: string) => boolean;
  toggleSaved: (car: InventoryListItem) => void;
  /** Available for a full test-data reset (see Account tab). */
  clearSaved: () => void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedCars, setSavedCars] = useState<InventoryListItem[]>([]);

  const value = useMemo<SavedContextValue>(
    () => ({
      savedCars,
      isSaved: (slug) => savedCars.some((c) => c.slug === slug),
      toggleSaved: (car) =>
        setSavedCars((cars) =>
          cars.some((c) => c.slug === car.slug) ? cars.filter((c) => c.slug !== car.slug) : [...cars, car],
        ),
      clearSaved: () => setSavedCars([]),
    }),
    [savedCars],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) {
    throw new Error('useSaved must be used within a SavedProvider');
  }
  return ctx;
}

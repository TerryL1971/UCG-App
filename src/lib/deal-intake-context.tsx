import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { DealIntake } from '@/constants/mock-data';

/**
 * Holds what the customer entered on the deal-intake screen — a stand-in
 * for the record a salesperson would build in Dealer Team at this point.
 *
 * Two layers, because the customer's own details (name, WhatsApp, base,
 * APO address, license) are about *them*, not about a specific car, and
 * kept vanishing on people (Terry, twice):
 *
 *  - `intake` — a *submitted* intake, for the car currently being pursued.
 *  - `draft` — field values saved continuously as the customer types, so
 *    navigating away before hitting Submit doesn't lose everything. When a
 *    customer picks a different car, the submitted intake is *demoted* to
 *    a draft (their info carries over; the "submitted" status doesn't).
 *
 * Both persist to AsyncStorage the same way auth-context.tsx does. This
 * still ought to become a real server-side deal record once the Dealer
 * Team API exists — see src/lib/deal-sync/README.md.
 */
interface DealIntakeContextValue {
  /** The submitted intake for the current car, or null if nothing's been
   * submitted for it yet. */
  intake: DealIntake | null;
  /** Continuously-saved field values — survives navigating away mid-fill,
   * and carries the customer's details across a change of car. */
  draft: Partial<DealIntake> | null;
  /** Save the current form state as a draft (called as the customer edits). */
  saveDraft: (patch: Partial<DealIntake>) => void;
  /** Record a completed submission (also clears the draft). */
  submitIntake: (intake: DealIntake) => void;
  /** Keep the customer's answers but drop the "submitted" status — used
   * when they choose a different car, so their info pre-fills the fresh
   * form instead of vanishing. */
  demoteIntakeToDraft: () => void;
  /** Wipe both submitted intake and draft — a full reset (Account tab). */
  clearIntake: () => void;
}

const STORAGE_KEY = 'ucg.dealIntake';
const DRAFT_KEY = 'ucg.dealIntakeDraft';

const DealIntakeContext = createContext<DealIntakeContextValue | null>(null);

export function DealIntakeProvider({ children }: { children: ReactNode }) {
  const [intake, setIntakeState] = useState<DealIntake | null>(null);
  const [draft, setDraftState] = useState<Partial<DealIntake> | null>(null);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(DRAFT_KEY)])
      .then(([rawIntake, rawDraft]) => {
        if (rawIntake) setIntakeState(JSON.parse(rawIntake));
        if (rawDraft) setDraftState(JSON.parse(rawDraft));
      })
      .catch(() => {
        // Corrupt or inaccessible storage — start clean rather than crash.
      });
  }, []);

  const saveDraft = useCallback((patch: Partial<DealIntake>) => {
    setDraftState(patch);
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(patch)).catch(() => {});
  }, []);

  const submitIntake = useCallback((next: DealIntake) => {
    setIntakeState(next);
    setDraftState(null);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  }, []);

  const demoteIntakeToDraft = useCallback(() => {
    if (!intake) return;
    setDraftState(intake);
    setIntakeState(null);
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(intake)).catch(() => {});
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, [intake]);

  const clearIntake = useCallback(() => {
    setIntakeState(null);
    setDraftState(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ intake, draft, saveDraft, submitIntake, demoteIntakeToDraft, clearIntake }),
    [intake, draft, saveDraft, submitIntake, demoteIntakeToDraft, clearIntake],
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

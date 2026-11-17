import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth-context';
import { fetchMyDeals, subscribeToDealChanges, type DealBundle } from '@/lib/deals';
import { DEMO_CUSTOMER_ID, useDemoMode } from '@/lib/demo-mode';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * The signed-in customer's deals (usually one; two when they're buying
 * one car and selling another to UCG — always separate deals). The
 * customer sets them up and ticks their steps (deal-setup.tsx).
 */
interface MyDealsValue {
  /** False when there's no account or no Supabase — nothing to load. */
  available: boolean;
  isLoading: boolean;
  loadFailed: boolean;
  deals: DealBundle[];
  selected: DealBundle | null;
  selectDeal: (dealId: string) => void;
  refresh: () => Promise<void>;
}

const MyDealsContext = createContext<MyDealsValue | null>(null);

const SELECTED_KEY = 'ucg.selectedDealId';

export function MyDealsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Demo mode works without logging in (lib/demo-mode.ts).
  const demo = useDemoMode();
  const userId = demo ? (user?.id ?? DEMO_CUSTOMER_ID) : user?.id;
  const available = demo || (isSupabaseConfigured && Boolean(userId));
  // Deals belong to an account AND a mode — flipping Demo Mode reloads.
  const loadKey = `${demo ? 'demo' : 'live'}:${userId ?? ''}`;
  const [deals, setDeals] = useState<DealBundle[]>([]);
  // Which account the current `deals` belong to — loading is simply
  // "haven't finished a load for this account yet", so switching accounts
  // shows a spinner instead of the previous account's deals.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const isLoading = available && loadedFor !== loadKey;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SELECTED_KEY)
      .then((id) => id && setSelectedId(id))
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    if (!available || !userId) return;
    try {
      const rows = await fetchMyDeals(userId);
      setDeals(rows);
      setLoadFailed(false);
    } catch (error) {
      console.error('Loading deals failed:', error);
      setLoadFailed(true);
    } finally {
      setLoadedFor(loadKey);
    }
  }, [available, userId, loadKey]);

  // First load for this account. (Inline rather than calling refresh(),
  // so a stale response can be ignored after switching accounts.)
  useEffect(() => {
    if (!available || !userId) return;
    let cancelled = false;
    fetchMyDeals(userId)
      .then((rows) => {
        if (cancelled) return;
        setDeals(rows);
        setLoadFailed(false);
      })
      .catch((error) => {
        console.error('Loading deals failed:', error);
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoadedFor(loadKey);
      });
    return () => {
      cancelled = true;
    };
  }, [available, userId, loadKey]);

  useEffect(() => {
    if (!available || !userId) return;
    return subscribeToDealChanges(`customer-${userId}`, () => {
      refresh();
    });
  }, [available, userId, refresh, demo]);

  const selectDeal = useCallback((dealId: string) => {
    setSelectedId(dealId);
    AsyncStorage.setItem(SELECTED_KEY, dealId).catch(() => {});
  }, []);

  // Never show another account's deals (e.g. right after logging out).
  const visibleDeals = useMemo(() => (available && loadedFor === loadKey ? deals : []), [available, loadedFor, loadKey, deals]);
  const selected = useMemo(
    () => visibleDeals.find((b) => b.deal.id === selectedId) ?? visibleDeals[0] ?? null,
    [visibleDeals, selectedId],
  );

  const value = useMemo<MyDealsValue>(
    () => ({ available, isLoading, loadFailed, deals: visibleDeals, selected, selectDeal, refresh }),
    [available, isLoading, loadFailed, visibleDeals, selected, selectDeal, refresh],
  );

  return <MyDealsContext.Provider value={value}>{children}</MyDealsContext.Provider>;
}

export function useMyDeals() {
  const ctx = useContext(MyDealsContext);
  if (!ctx) throw new Error('useMyDeals must be used within a MyDealsProvider');
  return ctx;
}

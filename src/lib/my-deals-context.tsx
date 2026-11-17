import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth-context';
import { fetchMyDeals, linkMyDeal, subscribeToDealChanges, type DealBundle, type LinkResult } from '@/lib/deals';
import { DEMO_CUSTOMER_ID, DEMO_MODE } from '@/lib/demo-mode';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * The signed-in customer's deals (usually one; two when they're buying
 * one car and selling another to UCG — always separate deals). Kept live:
 * when a salesperson taps "Paid in Full" or uploads a scan, the customer's
 * screen updates without a refresh.
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
  connectDeal: (dealNumber: string, lastName: string) => Promise<LinkResult>;
}

const MyDealsContext = createContext<MyDealsValue | null>(null);

const SELECTED_KEY = 'ucg.selectedDealId';

export function MyDealsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Demo mode works without logging in (lib/demo-mode.ts).
  const userId = DEMO_MODE ? (user?.id ?? DEMO_CUSTOMER_ID) : user?.id;
  const available = DEMO_MODE || (isSupabaseConfigured && Boolean(userId));
  const [deals, setDeals] = useState<DealBundle[]>([]);
  // Which account the current `deals` belong to — loading is simply
  // "haven't finished a load for this account yet", so switching accounts
  // shows a spinner instead of the previous account's deals.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const isLoading = available && loadedFor !== userId;
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
      setLoadedFor(userId);
    }
  }, [available, userId]);

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
        if (!cancelled) setLoadedFor(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [available, userId]);

  useEffect(() => {
    if (!available || !userId) return;
    return subscribeToDealChanges(`customer-${userId}`, () => {
      refresh();
    });
  }, [available, userId, refresh]);

  const selectDeal = useCallback((dealId: string) => {
    setSelectedId(dealId);
    AsyncStorage.setItem(SELECTED_KEY, dealId).catch(() => {});
  }, []);

  const connectDeal = useCallback(
    async (dealNumber: string, lastName: string) => {
      const result = await linkMyDeal(dealNumber, lastName);
      if (result.ok) {
        selectDeal(result.deal.id);
        await refresh();
      }
      return result;
    },
    [refresh, selectDeal],
  );

  // Never show another account's deals (e.g. right after logging out).
  const visibleDeals = useMemo(() => (available && loadedFor === userId ? deals : []), [available, loadedFor, userId, deals]);
  const selected = useMemo(
    () => visibleDeals.find((b) => b.deal.id === selectedId) ?? visibleDeals[0] ?? null,
    [visibleDeals, selectedId],
  );

  const value = useMemo<MyDealsValue>(
    () => ({ available, isLoading, loadFailed, deals: visibleDeals, selected, selectDeal, refresh, connectDeal }),
    [available, isLoading, loadFailed, visibleDeals, selected, selectDeal, refresh, connectDeal],
  );

  return <MyDealsContext.Provider value={value}>{children}</MyDealsContext.Provider>;
}

export function useMyDeals() {
  const ctx = useContext(MyDealsContext);
  if (!ctx) throw new Error('useMyDeals must be used within a MyDealsProvider');
  return ctx;
}

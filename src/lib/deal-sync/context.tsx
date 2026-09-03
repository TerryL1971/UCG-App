import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { createDealSync } from './factory';
import type { DealServerState, DealSignal, DealSyncBackend } from './types';

/**
 * React binding for the deal-sync backend. Holds one backend instance for
 * the app's lifetime, subscribes to it via `useSyncExternalStore` (the
 * right API for an external mutable store — no tearing, works with static
 * web export's prerender), and exposes it through `useDealSync()`.
 *
 * Replaces the old `deal-steps-context.tsx`: `state.steps` is what
 * `dealSteps` used to be, `jumpToStep` replaces `setDealStepIndex`, and
 * `reset` replaces `resetDealSteps`.
 */
interface DealSyncContextValue {
  state: DealServerState;
  send: (signal: DealSignal) => void;
  reset: () => void;
  jumpToStep: (index: number) => void;
}

const DealSyncContext = createContext<DealSyncContextValue | null>(null);

export function DealSyncProvider({ children }: { children: ReactNode }) {
  const backendRef = useRef<DealSyncBackend | null>(null);
  if (!backendRef.current) {
    backendRef.current = createDealSync();
  }
  const backend = backendRef.current;

  const state = useSyncExternalStore(
    (onChange) => backend.subscribe(onChange),
    () => backend.getState(),
    () => backend.getState(),
  );

  const value = useMemo(
    () => ({
      state,
      send: (signal: DealSignal) => backend.send(signal),
      reset: () => backend.reset(),
      jumpToStep: (index: number) => backend.jumpToStep(index),
    }),
    [state, backend],
  );

  return <DealSyncContext.Provider value={value}>{children}</DealSyncContext.Provider>;
}

export function useDealSync() {
  const ctx = useContext(DealSyncContext);
  if (!ctx) {
    throw new Error('useDealSync must be used within a DealSyncProvider');
  }
  return ctx;
}

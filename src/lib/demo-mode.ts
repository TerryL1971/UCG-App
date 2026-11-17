import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Demo mode (Terry, 2026-11-17: "I need mock data until this app is
 * ready for deployment").
 *
 * When ON, deals, status marks and documents come from a mock store on
 * the phone (lib/deals-demo.ts) instead of Supabase: no login and no
 * network needed, and one phone can play both the customer and the
 * salesperson. Chat and log-in always use the real backend.
 *
 * Account → Demo Mode switches it on the phone itself — on to show the
 * app, off to go through it like a real customer against Supabase. The
 * choice is remembered on that phone.
 *
 * For launch, add this to .env and restart Expo:
 *
 *   EXPO_PUBLIC_DEMO_MODE=false
 *
 * That forces it OFF everywhere and hides the switch.
 */
const ENV_ALLOWS_DEMO = process.env.EXPO_PUBLIC_DEMO_MODE !== 'false';

/** Whether the Account screen shows the Demo Mode switch. */
export const DEMO_SWITCH_AVAILABLE = ENV_ALLOWS_DEMO;

const STORAGE_KEY = 'ucg.demoMode';
let current = ENV_ALLOWS_DEMO;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

if (ENV_ALLOWS_DEMO) {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((saved) => {
      if (saved === 'on' || saved === 'off') {
        current = saved === 'on';
        emit();
      }
    })
    .catch(() => {});
}

/** For non-React code (lib/deals.ts). */
export function isDemoMode(): boolean {
  return current;
}

export function setDemoMode(on: boolean) {
  if (!ENV_ALLOWS_DEMO) return;
  current = on;
  AsyncStorage.setItem(STORAGE_KEY, on ? 'on' : 'off').catch(() => {});
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** For components — re-renders when the switch is flipped. */
export function useDemoMode(): boolean {
  return useSyncExternalStore(subscribe, isDemoMode, isDemoMode);
}

/** Stands in for the signed-in account in demo mode. */
export const DEMO_CUSTOMER_ID = 'demo-customer';
export const DEMO_STAFF_ID = 'demo-staff';
export const DEMO_STAFF_NAME = 'Demo Salesperson';

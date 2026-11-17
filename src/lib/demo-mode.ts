/**
 * Demo mode (Terry, 2026-11-17: "I need mock data until this app is
 * ready for deployment").
 *
 * ON by default. Deals, status marks and documents then come from a mock
 * store on the phone (lib/deals-demo.ts) instead of Supabase: no
 * migration, no login and no network needed, and one phone can play both
 * the customer and the salesperson. Chat and log-in still use the real
 * backend.
 *
 * Switch it OFF for launch by adding this line to .env and restarting
 * Expo:
 *
 *   EXPO_PUBLIC_DEMO_MODE=false
 *
 * Everything then reads and writes the real Supabase tables
 * (supabase/migrations/20261117120000_deals.sql).
 */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE !== 'false';

/** Stands in for the signed-in account in demo mode. */
export const DEMO_CUSTOMER_ID = 'demo-customer';
export const DEMO_STAFF_ID = 'demo-staff';
export const DEMO_STAFF_NAME = 'Demo Salesperson';

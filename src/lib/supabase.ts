import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Real backend, Sept 2 decision: Supabase (see docs/backend-and-ai-agent-plan.md,
 * "Recommended backend"). Account currently lives as a project under
 * Terry's existing "European Living" org — treated as UCG's in practice,
 * to be transferred to a real UCG business account once they're ready to
 * own it directly (same shape as the ANTHROPIC_API_KEY decision).
 *
 * `EXPO_PUBLIC_*` env vars ARE meant to ship inside the client bundle —
 * unlike `ANTHROPIC_API_KEY`/`PAYPAL_CLIENT_SECRET` (server-only, read in
 * `+api.ts` routes and never prefixed `EXPO_PUBLIC_`), the Supabase
 * "anon" key is a public, RLS-restricted key by design: Supabase's own
 * security model assumes this key is visible to end users and enforces
 * access at the database level (Row Level Security policies), not by
 * keeping the key secret. Never put the Supabase *service role* key
 * (bypasses RLS entirely) in an `EXPO_PUBLIC_*` var or anywhere in this
 * app — that one stays server-only, for whenever a real `+api.ts` route
 * needs elevated access.
 *
 * Same "fake the APIs we don't control yet, real ones we do" strategy as
 * `chat+api.ts`/`paypal-server.ts`: `isSupabaseConfigured` is false until
 * real project credentials exist, and every consumer (starting with
 * `auth-context.tsx`) is expected to fall back to today's local-only
 * behavior when it is. Nothing breaks for Terry testing in Expo Go
 * without a `.env` entry yet.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Mobile apps don't receive OAuth redirects the way a browser
        // tab does — this is the React-Native-specific setting, not web's
        // default of `true`.
        detectSessionInUrl: false,
      },
    })
  : null;

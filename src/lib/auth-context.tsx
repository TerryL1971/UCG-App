import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * Real auth once `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`
 * are set (see supabase.ts) — Supabase's own email/password auth, a real
 * account that survives a reinstall and works across devices. Until then,
 * this is the same STAND-IN it always was: signUp/logIn accept whatever's
 * typed and "succeed" as long as it's well-formed, with the session
 * persisted to AsyncStorage so people aren't retyping on every restart —
 * that part was always real, just not backed by a real check. Every
 * screen that calls `useAuth()` works unchanged either way; only this
 * file knows which mode it's in.
 */
export interface AuthUser {
  name: string;
  email: string;
}

export interface AuthResult {
  error: string | null;
  /** Only meaningful in real-Supabase mode: true when Supabase requires
   * confirming the email address before a session exists yet, so the
   * caller knows to show "check your email" instead of navigating in as
   * if already logged in. Always false in stand-in mode. */
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  logIn: (email: string, password: string) => Promise<AuthResult>;
  logOut: () => void;
}

const STORAGE_KEY = 'ucg.auth.user';

const AuthContext = createContext<AuthContextValue | null>(null);

/** Supabase doesn't have a first-class "name" field on `auth.users` —
 * the standard place for it is `user_metadata`, set via `signUp`'s
 * `options.data` and read back off `user.user_metadata`. Falls back to
 * the email's local part if somehow missing (shouldn't happen through
 * this app's own signUp, but a user created another way — e.g. directly
 * in the Supabase dashboard — wouldn't have it set). */
function authUserFromSupabase(user: { email?: string | null; user_metadata?: Record<string, unknown> }): AuthUser {
  const email = user.email ?? '';
  const metaName = typeof user.user_metadata?.name === 'string' ? (user.user_metadata.name as string) : undefined;
  return { name: metaName ?? email.split('@')[0], email };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // onAuthStateChange fires once immediately with `INITIAL_SESSION`
      // (the current session, restored from AsyncStorage if one exists)
      // and again on every real change (SIGNED_IN, SIGNED_OUT, a
      // background token refresh) — this one subscription covers both
      // "what's the session on app start" and "keep it live" without a
      // separate getSession() call.
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ? authUserFromSupabase(session.user) : null);
        setIsLoading(false);
      });
      return () => subscription.unsubscribe();
    }

    // Stand-in mode — unchanged from before Supabase existed.
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw));
      })
      .catch(() => {
        // Corrupt or inaccessible storage — fall back to logged-out rather
        // than crash on startup.
      })
      .finally(() => setIsLoading(false));
  }, []);

  const persistLocal = (next: AuthUser | null) => {
    setUser(next);
    if (next) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signUp: async (name, email, password) => {
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          });
          if (error) return { error: error.message };
          // A project with "Confirm email" turned on (Supabase's default
          // for a new project) returns a user but no session until the
          // confirmation link is clicked — onAuthStateChange won't fire
          // SIGNED_IN yet, so the caller needs to know not to treat this
          // as "logged in now."
          if (!data.session) return { error: null, needsEmailConfirmation: true };
          return { error: null };
        }
        persistLocal({ name, email });
        return { error: null };
      },
      logIn: async (email, password) => {
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          return { error: error?.message ?? null };
        }
        persistLocal({ name: email.split('@')[0], email });
        return { error: null };
      },
      logOut: () => {
        if (isSupabaseConfigured && supabase) {
          supabase.auth.signOut();
          return;
        }
        persistLocal(null);
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

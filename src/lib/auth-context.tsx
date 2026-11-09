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
  /** The Supabase `auth.users` id — only present in real-Supabase mode.
   * Stand-in mode has no real account behind it, so features that need
   * a server-side identity (the private in-app chat, chat.ts) check for
   * this rather than for `user` alone. */
  id?: string;
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
  /** Email confirmation and password reset by 6-digit code typed into
   * the app, not by a link (Terry, 2026-11-09: a link opens a browser and
   * takes the customer out of the app — "anything that takes the customer
   * out of the app needs to be redone"). Needs the Supabase "Confirm
   * signup" and "Reset password" email templates to include
   * `{{ .Token }}` — see docs/private-chat.md. */
  verifyEmailCode: (email: string, code: string) => Promise<AuthResult>;
  resendEmailCode: (email: string) => Promise<AuthResult>;
  sendPasswordResetCode: (email: string) => Promise<AuthResult>;
  resetPasswordWithCode: (email: string, code: string, newPassword: string) => Promise<AuthResult>;
}

const STORAGE_KEY = 'ucg.auth.user';

const AuthContext = createContext<AuthContextValue | null>(null);

/** Supabase doesn't have a first-class "name" field on `auth.users` —
 * the standard place for it is `user_metadata`, set via `signUp`'s
 * `options.data` and read back off `user.user_metadata`. Falls back to
 * the email's local part if somehow missing (shouldn't happen through
 * this app's own signUp, but a user created another way — e.g. directly
 * in the Supabase dashboard — wouldn't have it set). */
function authUserFromSupabase(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): AuthUser {
  const email = user.email ?? '';
  const metaName = typeof user.user_metadata?.name === 'string' ? (user.user_metadata.name as string) : undefined;
  return { id: user.id, name: metaName ?? email.split('@')[0], email };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Safety net: index.tsx renders nothing at all while isLoading is
    // true, so a startup auth check that never resolves (a slow or
    // momentarily unreachable network on a real device — unlike the
    // near-instant local storage read in stand-in mode below) leaves the
    // whole app on a blank white screen with no error, indefinitely.
    // Stop waiting after a few seconds and treat it as logged-out; a real
    // session that resolves after that still updates `user` normally.
    const timeoutId = setTimeout(() => setIsLoading(false), 4000);

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
        clearTimeout(timeoutId);
        setUser(session?.user ? authUserFromSupabase(session.user) : null);
        setIsLoading(false);
      });
      return () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
      };
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
      .finally(() => {
        clearTimeout(timeoutId);
        setIsLoading(false);
      });
    return () => clearTimeout(timeoutId);
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
      // Stand-in mode never asks for a code (signUp succeeds immediately),
      // so these only do real work against Supabase.
      verifyEmailCode: async (email, code) => {
        if (!isSupabaseConfigured || !supabase) return { error: null };
        // A successful verify also signs the customer in —
        // onAuthStateChange picks up the new session like a normal log-in.
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
        return { error: error?.message ?? null };
      },
      resendEmailCode: async (email) => {
        if (!isSupabaseConfigured || !supabase) return { error: null };
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        return { error: error?.message ?? null };
      },
      sendPasswordResetCode: async (email) => {
        if (!isSupabaseConfigured || !supabase) return { error: null };
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return { error: error?.message ?? null };
      },
      resetPasswordWithCode: async (email, code, newPassword) => {
        if (!isSupabaseConfigured || !supabase) return { error: null };
        const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
        if (verifyError) return { error: verifyError.message };
        // verifyOtp opened a session as that user; updateUser sets the new
        // password on it, leaving them logged in.
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return { error: error?.message ?? null };
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Supabase's own `error.message` strings are backend-grade English, not
 * copy written for a stressed, possibly non-native-English customer
 * (Terry/David pre-launch UX pass: "Invalid login credentials" doesn't
 * even say which field is wrong). Maps the known cases to plain language;
 * anything unrecognized falls through unchanged rather than hiding a real,
 * unanticipated error behind a vague catch-all. */
export function friendlyAuthError(message: string): string {
  const known: Record<string, string> = {
    'Invalid login credentials': "That email or password doesn't match our records — double-check both.",
    'User already registered': 'That email is already registered — try logging in instead.',
    'Password should be at least 6 characters': 'Use a password with at least 6 characters.',
    'Email not confirmed': 'Your email isn’t confirmed yet — enter the 6-digit code we emailed you.',
    'Token has expired or is invalid': 'That code is wrong or has expired — check it, or send a new one.',
    'email rate limit exceeded': 'Too many emails sent in the last hour — wait a little while, then try again.',
  };
  // Supabase's resend cooldown message includes a live seconds count
  // ("…only request this after 42 seconds."), so it can't be an exact key.
  if (message.startsWith('For security purposes')) return 'Please wait a minute before asking for another code.';
  return known[message] ?? message;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

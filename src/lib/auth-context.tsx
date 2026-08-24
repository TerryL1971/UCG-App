import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * STAND-IN auth — there's no real backend yet, so signUp/logIn accept
 * whatever's typed and "succeed" as long as it's well-formed. This exists
 * so the onboarding flow has real screens with real validation instead of
 * a dead bypass, not because it's actually secure.
 *
 * The session IS genuinely persisted (AsyncStorage) so people aren't
 * retyping their info every time the app restarts — that part is real.
 * What's not real is what's being persisted: there's no password check and
 * no server-issued token, just the name/email typed in. Swap signUp/logIn
 * for real API calls once there's a backend, and swap this storage for a
 * real session token at the same time — the screens that call these
 * shouldn't need to change either way.
 */
export interface AuthUser {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signUp: (name: string, email: string, password: string) => void;
  logIn: (email: string, password: string) => void;
  logOut: () => void;
}

const STORAGE_KEY = 'ucg.auth.user';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

  const persist = (next: AuthUser | null) => {
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
      signUp: (name, email) => persist({ name, email }),
      logIn: (email) => persist({ name: email.split('@')[0], email }),
      logOut: () => persist(null),
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

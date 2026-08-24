import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * STAND-IN auth — there's no real backend yet, so signUp/logIn accept
 * whatever's typed and "succeed" as long as it's well-formed. This exists
 * so the onboarding flow has real screens with real validation instead of
 * a dead bypass, not because it's actually secure or persisted anywhere.
 * Swap the two methods below for real API calls once there's a backend;
 * the screens that call them shouldn't need to change.
 */
export interface AuthUser {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  signUp: (name: string, email: string, password: string) => void;
  logIn: (email: string, password: string) => void;
  logOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signUp: (name, email) => setUser({ name, email }),
      logIn: (email) => setUser({ name: email.split('@')[0], email }),
      logOut: () => setUser(null),
    }),
    [user],
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

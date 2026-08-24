import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Hands a scanned VIN back from the full-screen scanner to whichever form
 * pushed it, without losing whatever else the user already typed on that
 * form (a route-param approach would remount the screen and lose that).
 * The scanning screen sets this and pops itself; the form screen reads it
 * on focus and clears it so it doesn't get reapplied later.
 */
interface VinScanContextValue {
  lastScannedVin: string | null;
  setLastScannedVin: (vin: string) => void;
  clearLastScannedVin: () => void;
}

const VinScanContext = createContext<VinScanContextValue | null>(null);

export function VinScanProvider({ children }: { children: ReactNode }) {
  const [lastScannedVin, setVin] = useState<string | null>(null);

  const value = useMemo<VinScanContextValue>(
    () => ({
      lastScannedVin,
      setLastScannedVin: setVin,
      clearLastScannedVin: () => setVin(null),
    }),
    [lastScannedVin],
  );

  return <VinScanContext.Provider value={value}>{children}</VinScanContext.Provider>;
}

export function useVinScan() {
  const ctx = useContext(VinScanContext);
  if (!ctx) {
    throw new Error('useVinScan must be used within a VinScanProvider');
  }
  return ctx;
}

/** VINs are 17 chars, A-Z (no I/O/Q) and 0-9. */
export function isPlausibleVin(value: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(value.toUpperCase());
}

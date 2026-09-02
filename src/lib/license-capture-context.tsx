import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Same handoff pattern as vin-scan-context.tsx: the full-screen camera
 * (capture-license.tsx) sets this and pops itself; deal-intake.tsx reads
 * it on the next render and clears it, rather than losing whatever else
 * was already typed on the form via a route-param remount.
 */
export type LicenseSide = 'front' | 'back';

interface CapturedLicensePhoto {
  side: LicenseSide;
  uri: string;
}

interface LicenseCaptureContextValue {
  lastCapturedLicensePhoto: CapturedLicensePhoto | null;
  setLastCapturedLicensePhoto: (side: LicenseSide, uri: string) => void;
  clearLastCapturedLicensePhoto: () => void;
}

const LicenseCaptureContext = createContext<LicenseCaptureContextValue | null>(null);

export function LicenseCaptureProvider({ children }: { children: ReactNode }) {
  const [lastCapturedLicensePhoto, setPhoto] = useState<CapturedLicensePhoto | null>(null);

  const value = useMemo<LicenseCaptureContextValue>(
    () => ({
      lastCapturedLicensePhoto,
      setLastCapturedLicensePhoto: (side, uri) => setPhoto({ side, uri }),
      clearLastCapturedLicensePhoto: () => setPhoto(null),
    }),
    [lastCapturedLicensePhoto],
  );

  return <LicenseCaptureContext.Provider value={value}>{children}</LicenseCaptureContext.Provider>;
}

export function useLicenseCapture() {
  const ctx = useContext(LicenseCaptureContext);
  if (!ctx) {
    throw new Error('useLicenseCapture must be used within a LicenseCaptureProvider');
  }
  return ctx;
}

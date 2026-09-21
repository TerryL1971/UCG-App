import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Same handoff pattern as vin-scan-context.tsx: the full-screen camera
 * (capture-license.tsx) sets this and pops itself; deal-intake.tsx reads
 * it on the next render and clears it, rather than losing whatever else
 * was already typed on the form via a route-param remount.
 */
export type LicenseSide = 'front' | 'back';

/** Which screen asked for this capture — deal-intake.tsx (the original
 * caller) or deal/documents.tsx (added later, so the "Driver's License"
 * document card can use the same overlay-guided camera instead of a bare
 * OS camera with nothing to line the card up against). Expo Router's
 * native stack keeps a pushed screen mounted (just covered) rather than
 * unmounting it, so without this tag, capturing from Documents while
 * deal-intake was still paused underneath it would silently also fill in
 * deal-intake's front/back slots — both screens' effects need to ignore a
 * capture that wasn't meant for them. */
export type LicenseCaptureTarget = 'intake' | 'documents';

interface CapturedLicensePhoto {
  side: LicenseSide;
  uri: string;
  for: LicenseCaptureTarget;
}

interface LicenseCaptureContextValue {
  lastCapturedLicensePhoto: CapturedLicensePhoto | null;
  setLastCapturedLicensePhoto: (side: LicenseSide, uri: string, target: LicenseCaptureTarget) => void;
  clearLastCapturedLicensePhoto: () => void;
}

const LicenseCaptureContext = createContext<LicenseCaptureContextValue | null>(null);

export function LicenseCaptureProvider({ children }: { children: ReactNode }) {
  const [lastCapturedLicensePhoto, setPhoto] = useState<CapturedLicensePhoto | null>(null);

  const value = useMemo<LicenseCaptureContextValue>(
    () => ({
      lastCapturedLicensePhoto,
      setLastCapturedLicensePhoto: (side, uri, target) => setPhoto({ side, uri, for: target }),
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

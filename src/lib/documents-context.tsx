import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { dealDocuments, type DealDocument } from '@/constants/mock-data';
import { uploadDocumentPhoto, uploadLicenseScan, type DealDocumentContext } from '@/lib/document-storage';
import { isSupabaseConfigured } from '@/lib/supabase';

// Must match LICENSE_DOC_ID in deal/documents.tsx — the one document this
// screen captures multiple pages for, and the one that needs its pages
// combined into a single PDF rather than uploaded as separate photos.
const LICENSE_DOC_ID = 'license';

/** `uris` holds every locally-captured page for this document, in order —
 * real capture via expo-image-picker/expo-camera (deal/documents.tsx).
 * These are always local file:// uris, used for instant on-screen
 * thumbnails; addDocumentPage below also fires off a real upload
 * (document-storage.ts) so the photo isn't ONLY on this one phone.
 * Plural and an array (not a single `uri`), matching the "1-x pages"
 * flow Terry originally asked for (Sept 2) for whatever document needs
 * it — today that's just the license (front + back), but the shape
 * doesn't assume a fixed count.
 *
 * `backendStatus` tracks the DURABLE copy specifically — separate from
 * `status` ("needed"/"uploaded"/"approved"), which only ever reflected
 * whether a photo was captured locally, not whether it actually reached
 * Storage (Terry, 2026-10-15, catching a real gap: every Storage write
 * was fire-and-forget, so the UI showed "Uploaded" confidently even on a
 * genuine network failure, indistinguishable from real success). `null`
 * means "nothing to report" — Supabase isn't configured at all, which is
 * a normal, expected state in dev, not a failure worth alarming over. */
export type DocumentBackendStatus = 'uploading' | 'synced' | 'failed' | null;
export type DocumentState = DealDocument & { uris: string[]; backendStatus: DocumentBackendStatus };

/**
 * Shared so the real Documents screen (deal/documents.tsx, where pages
 * actually get captured) and the read-only "Documents Uploaded" summary
 * on My Deal (deal/index.tsx) always agree — they used to be two separate
 * pieces of state (one local to each screen), so replacing a document on
 * the real screen never showed up in the My Deal summary, which kept
 * reading the original, never-updated mock data directly. Same fix shape
 * as deal-intake-context.tsx and the deal-sync module: one source, every
 * consumer reads the same thing.
 */
interface DealDocumentsContextValue {
  documents: DocumentState[];
  /** Appends one more page to a document (the "1-x pages" flow — front
   * and back of a license, or anything else that ever needs more than
   * one photo). `context` is whatever the caller already knows about the
   * customer/car (deal-intake, the chosen car) — passed through to the
   * real backend row (document-storage.ts) so a salesperson can actually
   * tell whose document this is; the local uri/UI update doesn't need it. */
  addDocumentPage: (id: string, uri: string, context?: DealDocumentContext) => void;
  /** Drops one page by index — lets a customer remove a bad page without
   * losing the rest of an already multi-page upload. */
  removeDocumentPage: (id: string, pageIndex: number) => void;
  resetDocuments: () => void;
}

const DealDocumentsContext = createContext<DealDocumentsContextValue | null>(null);

// `dealDocuments` seeds every document "approved" (mock-data.ts's own
// comment: matching `dealSteps`' "Documents" step being marked done for
// the demo). That was fine as long as "approved" meant something — it
// doesn't here: this always sets `uris: []`, i.e. no real file was ever
// captured through this screen. A status of "Approved" (or "Uploaded")
// with nothing behind it is the exact self-contradiction the "all
// approved" fix was originally trying to close, one level deeper (Terry,
// testing, 2026-09: "without an image, approved should not be there
// either"). No file always means "needed," full stop — the same
// invariant addDocumentPage/removeDocumentPage already enforce on every
// later change, just applied to the starting state too.
function withNoPages(): DocumentState[] {
  return dealDocuments.map((d) => ({ ...d, status: 'needed', uris: [], backendStatus: null }));
}

export function DealDocumentsProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<DocumentState[]>(withNoPages);
  // Doesn't cancel the underlying network request — this is still a plain
  // fetch() with no AbortController plumbed through document-storage.ts —
  // but it does stop an upload that was already in flight when "Reset
  // Test Data" fired from writing its result back into a document array
  // that's already been reset out from under it (Terry, 2026-10-15,
  // catching a real gap). A ref, not state: it has to be read synchronously
  // inside closures captured before a reset, not trigger its own re-render.
  const generationRef = useRef(0);

  const value = useMemo(
    () => ({
      documents,
      // A fresh upload goes back to "uploaded," not "approved" — a real
      // salesperson/backend would need to actually review the new file(s),
      // so leaving it marked "approved" after adding a page would be
      // dishonest about what's actually happened.
      addDocumentPage: (id: string, uri: string, context?: DealDocumentContext) => {
        setDocuments((docs) =>
          docs.map((d) =>
            d.id === id
              ? { ...d, status: 'uploaded', uris: [...d.uris, uri], backendStatus: isSupabaseConfigured ? 'uploading' : null }
              : d,
          ),
        );
        // Not fire-and-forget anymore (Terry, 2026-10-15, catching a real
        // gap) — the local uri above still lands instantly either way, but
        // backendStatus now actually reflects whether the durable copy
        // (Terry, 2026-09-21: "how will a salesperson see and retrieve any
        // of the scanned docs?") really made it, instead of the UI just
        // assuming success the moment a photo was taken. Still silent
        // (no alert) when Supabase just isn't configured at all — a
        // normal, expected state in dev, not a failure.
        //
        // The license doc is special-cased: each side uploads as its own
        // single-page PDF (Terry, 2026-10-14), not a loose jpg — but still
        // one upload per side, independent of the other, same as every
        // other document here. Front and back stay two separate files.
        const generation = generationRef.current;
        const upload = id === LICENSE_DOC_ID ? uploadLicenseScan(id, uri, context) : uploadDocumentPhoto(id, uri, context);
        upload
          .then((path) => {
            if (!isSupabaseConfigured || generation !== generationRef.current) return;
            setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, backendStatus: path ? 'synced' : 'failed' } : d)));
          })
          .catch(() => {
            if (generation !== generationRef.current) return;
            setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, backendStatus: 'failed' } : d)));
          });
      },
      // Same honesty rule as addDocumentPage, the other direction: removing
      // a page changes what's actually on file, so a prior "uploaded"/
      // "approved" status can't just sit there unchanged (Terry, testing,
      // 2026-09: deleted the only page and the card kept reading "Uploaded"
      // with nothing behind it). Empty goes back to "needed"; anything
      // left still needs a fresh look, same as a brand-new upload does.
      removeDocumentPage: (id: string, pageIndex: number) =>
        setDocuments((docs) =>
          docs.map((d) => {
            if (d.id !== id) return d;
            const uris = d.uris.filter((_, i) => i !== pageIndex);
            return {
              ...d,
              uris,
              status: uris.length === 0 ? 'needed' : 'uploaded',
              backendStatus: uris.length === 0 ? null : d.backendStatus,
            };
          }),
        ),
      resetDocuments: () => {
        generationRef.current += 1;
        setDocuments(withNoPages());
      },
    }),
    [documents],
  );

  return <DealDocumentsContext.Provider value={value}>{children}</DealDocumentsContext.Provider>;
}

export function useDealDocuments() {
  const ctx = useContext(DealDocumentsContext);
  if (!ctx) {
    throw new Error('useDealDocuments must be used within a DealDocumentsProvider');
  }
  return ctx;
}

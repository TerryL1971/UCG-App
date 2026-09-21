import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { dealDocuments, type DealDocument } from '@/constants/mock-data';
import { uploadDocumentPhoto, type DealDocumentContext } from '@/lib/document-storage';

/** `uris` holds every locally-captured page for this document, in order —
 * real capture via expo-image-picker/expo-camera (deal/documents.tsx).
 * These are always local file:// uris, used for instant on-screen
 * thumbnails; addDocumentPage below also fires off a real upload
 * (document-storage.ts) so the photo isn't ONLY on this one phone.
 * Plural and an array (not a single `uri`), matching the "1-x pages"
 * flow Terry originally asked for (Sept 2) for whatever document needs
 * it — today that's just the license (front + back), but the shape
 * doesn't assume a fixed count. */
export type DocumentState = DealDocument & { uris: string[] };

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
  return dealDocuments.map((d) => ({ ...d, status: 'needed', uris: [] }));
}

export function DealDocumentsProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<DocumentState[]>(withNoPages);

  const value = useMemo(
    () => ({
      documents,
      // A fresh upload goes back to "uploaded," not "approved" — a real
      // salesperson/backend would need to actually review the new file(s),
      // so leaving it marked "approved" after adding a page would be
      // dishonest about what's actually happened.
      addDocumentPage: (id: string, uri: string, context?: DealDocumentContext) => {
        setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, status: 'uploaded', uris: [...d.uris, uri] } : d)));
        // Fire-and-forget: the real, durable copy (Terry, 2026-09-21:
        // "how will a salesperson see and retrieve any of the scanned
        // docs?"). The UI above already has what it needs — the local
        // uri — so this doesn't block or need to succeed for the screen
        // to work; it silently no-ops if Supabase isn't configured or
        // the bucket isn't set up yet, same as every other Supabase
        // integration point in this app.
        uploadDocumentPhoto(id, uri, context).catch(() => {});
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
            return { ...d, uris, status: uris.length === 0 ? 'needed' : 'uploaded' };
          }),
        ),
      resetDocuments: () => setDocuments(withNoPages()),
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

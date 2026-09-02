import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { dealDocuments, type DealDocument } from '@/constants/mock-data';

/** `uris` holds every locally-captured page for this document, in order —
 * real capture via expo-image-picker/expo-camera (deal/documents.tsx),
 * still no real file storage backend. Plural and an array (not a single
 * `uri`) since Terry asked for "1-x pages" per document (Sept 2): Proof of
 * Insurance, Orders, and Proof of Residence can each run multiple pages,
 * not just one photo. */
export type DocumentState = DealDocument & { uris: string[] };

/**
 * Shared so the real Documents screen (deal/documents.tsx, where pages
 * actually get captured) and the read-only "Documents Uploaded" summary
 * on My Deal (deal/index.tsx) always agree — they used to be two separate
 * pieces of state (one local to each screen), so replacing a document on
 * the real screen never showed up in the My Deal summary, which kept
 * reading the original, never-updated mock data directly. Same fix shape
 * as deal-steps-context.tsx and deal-intake-context.tsx: one context,
 * every consumer reads the same thing.
 */
interface DealDocumentsContextValue {
  documents: DocumentState[];
  /** Appends one more page to a document (the "1-x pages" flow — Insurance,
   * Orders, and Proof of Residence can be more than a single photo). */
  addDocumentPage: (id: string, uri: string) => void;
  /** Drops one page by index — lets a customer remove a bad page without
   * losing the rest of an already multi-page upload. */
  removeDocumentPage: (id: string, pageIndex: number) => void;
  resetDocuments: () => void;
}

const DealDocumentsContext = createContext<DealDocumentsContextValue | null>(null);

function withNoPages(): DocumentState[] {
  return dealDocuments.map((d) => ({ ...d, uris: [] }));
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
      addDocumentPage: (id: string, uri: string) =>
        setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, status: 'uploaded', uris: [...d.uris, uri] } : d))),
      removeDocumentPage: (id: string, pageIndex: number) =>
        setDocuments((docs) =>
          docs.map((d) => (d.id === id ? { ...d, uris: d.uris.filter((_, i) => i !== pageIndex) } : d)),
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

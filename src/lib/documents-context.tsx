import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { dealDocuments, type DealDocument } from '@/constants/mock-data';

/** `uri` is the locally-captured replacement image, if the customer has
 * uploaded one — real capture via expo-image-picker (deal/documents.tsx),
 * still no real file storage backend. */
export type DocumentState = DealDocument & { uri?: string };

/**
 * Shared so the real Documents screen (deal/documents.tsx, where a
 * replacement actually gets captured) and the read-only "Documents
 * Uploaded" summary on My Deal (deal/index.tsx) always agree — they used
 * to be two separate pieces of state (one local to each screen), so
 * replacing a document on the real screen never showed up in the My Deal
 * summary, which kept reading the original, never-updated mock data
 * directly. Same fix shape as deal-steps-context.tsx and
 * deal-intake-context.tsx: one context, every consumer reads the same
 * thing.
 */
interface DealDocumentsContextValue {
  documents: DocumentState[];
  replaceDocument: (id: string, uri: string) => void;
  resetDocuments: () => void;
}

const DealDocumentsContext = createContext<DealDocumentsContextValue | null>(null);

export function DealDocumentsProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<DocumentState[]>(dealDocuments);

  const value = useMemo(
    () => ({
      documents,
      // A fresh upload goes back to "uploaded," not "approved" — a real
      // salesperson/backend would need to actually review the new file,
      // so leaving it marked "approved" after replacing it would be
      // dishonest about what's actually happened.
      replaceDocument: (id: string, uri: string) =>
        setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, status: 'uploaded', uri } : d))),
      resetDocuments: () => setDocuments(dealDocuments),
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

import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * The real backend copy of a scanned document — the piece that was
 * entirely missing until now (Terry, 2026-09-21: "How will a salesperson
 * see and retrieve any of the scanned docs?"). Before this, a captured
 * photo lived only in `documents-context.tsx`'s React state: gone on app
 * restart, never transmitted anywhere. This uploads it to a private
 * Supabase Storage bucket instead, so it's a real file that outlives the
 * app session.
 *
 * This is real customer PII (a driver's license) now sitting in real
 * cloud storage, not just a local photo on one phone — exactly the kind
 * of thing docs/pre-launch-checklist.md's bucket E ("blocked on legal
 * counsel") already flagged as needing a real GDPR answer before it's
 * genuinely live for real customers. Safe for Terry's own testing; treat
 * that checklist item as more urgent, not less, now that this exists.
 *
 * No admin/salesperson-facing screen exists in this app yet — retrieval
 * for now means opening this bucket directly in the Supabase dashboard's
 * Storage browser, grouped by the ownerId folder below. A real internal
 * dashboard is future work (see docs/backend-and-ai-agent-plan.md).
 *
 * Requires one-time setup Terry has to do himself in the Supabase
 * dashboard (no service-role key lives in this app, so nothing here can
 * create the bucket or its policies) — see the setup note this was
 * introduced with. Until that's done, uploads just fail silently and the
 * app behaves exactly as it did before: local-only, no error shown.
 */
const BUCKET = 'documents';
const ANON_ID_KEY = 'ucg.document-storage.anon-owner-id';

let cachedOwnerId: string | null = null;

/** A stable per-install id to group a customer's uploads under in the
 * bucket, independent of whether they ever create a real account —
 * "Browse without an account" is a normal, supported path through this
 * app (see auth-context.tsx), so this can't require a real Supabase Auth
 * session to work. Not a security boundary — see the file comment on
 * what that tradeoff means with the anon key. */
async function getOwnerId(): Promise<string> {
  if (cachedOwnerId) return cachedOwnerId;
  try {
    const stored = await AsyncStorage.getItem(ANON_ID_KEY);
    if (stored) {
      cachedOwnerId = stored;
      return stored;
    }
    const fresh = `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(ANON_ID_KEY, fresh);
    cachedOwnerId = fresh;
    return fresh;
  } catch {
    // AsyncStorage unavailable for some reason — fall back to a
    // per-session-only id rather than failing the upload outright.
    return `anon-${Date.now().toString(36)}`;
  }
}

/** Whatever the app already knows about who/what this document belongs
 * to at the moment it's captured — from deal-intake and the chosen car.
 * Recorded alongside the file (see `deal_documents`, the migration this
 * shipped with) since a file sitting alone in a Storage folder named
 * after an anonymous id told a salesperson nothing (Terry, 2026-09-21:
 * "There is no table for the documents to match them with a customer,
 * car, deal number, etc???"). All optional — an intake-less/car-less
 * upload (shouldn't normally happen, but nothing here assumes it can't)
 * still uploads the file, just with less context attached. */
export interface DealDocumentContext {
  customerName?: string | null;
  customerContact?: string | null;
  carStockNumber?: string | null;
  carTitle?: string | null;
  base?: string | null;
}

export type DealDocumentKind = 'scan' | 'generated' | 'signed';

/**
 * Uploads one local file (a `file://` uri — a compressed photo, or a PDF
 * expo-print just wrote to disk) to the private `documents` bucket, then
 * records a row for it in `deal_documents` with whatever context was
 * passed in. Fire-and-forget by design — the caller already has what it
 * needs for its own UI (the local uri); this just makes a second,
 * durable, findable copy. Returns the storage path on success, null on
 * any failure (Supabase not configured, bucket doesn't exist yet,
 * network, etc.) — callers should treat null as "fine, nothing to do,"
 * not an error to surface to the customer.
 */
async function uploadDealDocument(
  docId: string,
  localUri: string,
  kind: DealDocumentKind,
  contentType: string,
  extension: string,
  context: DealDocumentContext = {},
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const ownerId = await getOwnerId();
    const path = `${ownerId}/${docId}-${kind}-${Date.now()}.${extension}`;

    // React Native's fetch(uri) → arrayBuffer() is the documented way to
    // read a local file:// uri into something Storage's upload() accepts
    // — a plain Blob doesn't behave reliably here the way it does on web.
    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });
    if (error) {
      console.error('Document upload to Supabase Storage failed:', error.message);
      return null;
    }

    // The file itself is the part that can't be redone if this fails
    // (re-running the upload would just create a duplicate) — a failed
    // row insert here is logged, not retried, and doesn't undo the
    // upload above. Worth revisiting once this matters enough to need
    // real reliability (a queue, a retry, a backend job) rather than a
    // best-effort fire-and-forget call from the client.
    const { error: rowError } = await supabase.from('deal_documents').insert({
      owner_id: ownerId,
      doc_id: docId,
      kind,
      storage_path: path,
      customer_name: context.customerName ?? null,
      customer_contact: context.customerContact ?? null,
      car_stock_number: context.carStockNumber ?? null,
      car_title: context.carTitle ?? null,
      base: context.base ?? null,
    });
    if (rowError) {
      console.error('deal_documents row insert failed (file still uploaded):', rowError.message);
    }

    return path;
  } catch (err) {
    console.error('Document upload to Supabase Storage failed:', err);
    return null;
  }
}

/** A photographed identity document — the license front/back flow
 * (deal/documents.tsx). Unchanged behavior/signature from before `kind`
 * existed; just routes through the shared uploader now. */
export function uploadDocumentPhoto(docId: string, localUri: string, context: DealDocumentContext = {}) {
  return uploadDealDocument(docId, localUri, 'scan', 'image/jpeg', 'jpg', context);
}

/** An app-generated sample PDF (Cost Estimate, Purchase Order, Bill of
 * Sale — deal-paperwork.tsx), uploaded the moment a customer actually
 * saves/shares it — not proactively on every screen view, since that
 * would upload a fresh duplicate every time the pricing hasn't even
 * changed. This is what makes "the document a customer looked at" a real,
 * retrievable artifact instead of something only ever regenerated live
 * from whatever the deal's numbers happen to be today (Terry, 2026-09-21:
 * "when documents are produced, they need to be loaded to the app"). */
export function uploadGeneratedDocument(docId: string, localPdfUri: string, context: DealDocumentContext = {}) {
  return uploadDealDocument(docId, localPdfUri, 'generated', 'application/pdf', 'pdf', context);
}

/** A photographed/scanned copy of the actual signed physical paperwork
 * (Terry, 2026-09-21: "a salesperson needs to sign and scan the document
 * back into the app"). Captured from the same screen/device the customer
 * already has the app open on — there's no separate salesperson-facing
 * screen in this app, see the migration comment this shipped with for
 * why that's a deliberate scope choice, not an oversight. */
export function uploadSignedDocument(docId: string, localImageUri: string, context: DealDocumentContext = {}) {
  return uploadDealDocument(docId, localImageUri, 'signed', 'image/jpeg', 'jpg', context);
}

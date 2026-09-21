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

/**
 * Uploads one already-captured, already-compressed photo (a local file://
 * uri from compressPhoto) to the private `documents` bucket. Fire-and-
 * forget by design — the caller (documents-context.tsx) already has what
 * it needs for the UI (the local uri); this just makes a second, durable
 * copy. Returns the storage path on success, null on any failure
 * (Supabase not configured, bucket doesn't exist yet, network, etc.) —
 * callers should treat null as "fine, nothing to do," not an error to
 * surface to the customer.
 */
export async function uploadDocumentPhoto(docId: string, localUri: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const ownerId = await getOwnerId();
    const path = `${ownerId}/${docId}-${Date.now()}.jpg`;

    // React Native's fetch(uri) → arrayBuffer() is the documented way to
    // read a local file:// uri into something Storage's upload() accepts
    // — a plain Blob doesn't behave reliably here the way it does on web.
    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) {
      console.error('Document upload to Supabase Storage failed:', error.message);
      return null;
    }
    return path;
  } catch (err) {
    console.error('Document upload to Supabase Storage failed:', err);
    return null;
  }
}

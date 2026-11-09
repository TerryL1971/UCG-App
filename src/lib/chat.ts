import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * Private in-app chat between a customer and their salesperson — the
 * data layer for supabase/migrations/20261109120000_private_chat.sql.
 * Read that migration's header for the why; the short version: the
 * customer stays inside the app (wa.me links can't do that), and a
 * claimed conversation is private to that one salesperson + customer
 * (Trengo's shared inbox can't do that), enforced by RLS rather than by
 * which screen happens to show what.
 *
 * Every function here assumes `supabase` is non-null and a real session
 * exists — callers gate on `useChat().available` / `isStaff` first
 * (chat-context.tsx), the same "real backend when configured, today's
 * fallback otherwise" pattern auth-context.tsx uses.
 */

export type ChatSenderRole = 'customer' | 'staff';

export interface ChatThread {
  id: string;
  customer_id: string;
  customer_name: string | null;
  car_label: string | null;
  salesperson_id: string | null;
  salesperson_name: string | null;
  claimed_at: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: ChatSenderRole;
  body: string;
  created_at: string;
}

export interface StaffProfile {
  user_id: string;
  display_name: string;
  location: string | null;
  is_manager: boolean;
}

/** Mirrors the `char_length(btrim(body)) between 1 and 2000` check in the
 * migration, so the input can stop the customer before the server would
 * reject the message. */
export const CHAT_MAX_MESSAGE_LENGTH = 2000;

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Null for every non-staff account — RLS only lets a user read their
 * own staff_members row, so this is also exactly the "am I staff?" check. */
export async function fetchMyStaffProfile(userId: string): Promise<StaffProfile | null> {
  const { data, error } = await client()
    .from('staff_members')
    .select('user_id, display_name, location, is_manager')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMyCustomerThread(userId: string): Promise<ChatThread | null> {
  const { data, error } = await client().from('chat_threads').select('*').eq('customer_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

/** One thread per customer (unique customer_id). Returns the existing
 * one if a race or an earlier session already created it. */
export async function getOrCreateCustomerThread(
  userId: string,
  details: { customerName: string | null; carLabel: string | null },
): Promise<ChatThread> {
  const existing = await fetchMyCustomerThread(userId);
  if (existing) return existing;
  const { data, error } = await client()
    .from('chat_threads')
    .insert({ customer_id: userId, customer_name: details.customerName, car_label: details.carLabel })
    .select('*')
    .single();
  if (error) {
    // 23505 = unique_violation: another tap/device created it first.
    if (error.code === '23505') {
      const raced = await fetchMyCustomerThread(userId);
      if (raced) return raced;
    }
    throw error;
  }
  return data;
}

export async function fetchThread(threadId: string): Promise<ChatThread | null> {
  const { data, error } = await client().from('chat_threads').select('*').eq('id', threadId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Everything a staff member's inbox shows: the shared waiting list
 * (unclaimed) plus their own claimed customers. RLS already limits the
 * rows to exactly those two groups — no client-side filtering needed
 * for privacy, only for splitting them into the two lists. */
export async function fetchStaffThreads(): Promise<ChatThread[]> {
  const { data, error } = await client()
    .from('chat_threads')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await client()
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function sendChatMessage(
  threadId: string,
  senderId: string,
  role: ChatSenderRole,
  body: string,
): Promise<ChatMessage> {
  const { data, error } = await client()
    .from('chat_messages')
    .insert({ thread_id: threadId, sender_id: senderId, sender_role: role, body: body.trim() })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export type ClaimResult = { ok: true; thread: ChatThread } | { ok: false; reason: 'already_claimed' | 'not_staff' | 'error' };

export async function claimThread(threadId: string): Promise<ClaimResult> {
  const { data, error } = await client().rpc('claim_chat_thread', { p_thread_id: threadId });
  if (error) {
    if (error.message.includes('already_claimed')) return { ok: false, reason: 'already_claimed' };
    if (error.message.includes('not_staff')) return { ok: false, reason: 'not_staff' };
    return { ok: false, reason: 'error' };
  }
  return { ok: true, thread: data as ChatThread };
}

/** Live new messages for one thread. Realtime applies the same RLS as a
 * normal SELECT, so a subscriber only ever receives messages they could
 * already read. Returns the unsubscribe function. */
export function subscribeToMessages(threadId: string, onInsert: (message: ChatMessage) => void): () => void {
  const channel: RealtimeChannel = client()
    .channel(`chat-messages-${threadId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
      (payload) => onInsert(payload.new as ChatMessage),
    )
    .subscribe();
  return () => {
    client().removeChannel(channel);
  };
}

/** Any thread change the current user can see (new customer waiting, a
 * thread getting claimed, a new last message). The staff inbox just
 * refetches on each event rather than patching its lists by hand —
 * simpler, and a claimed-by-someone-else thread simply drops out of the
 * refetched result because RLS stops returning it. */
export function subscribeToThreadChanges(key: string, onChange: () => void): () => void {
  const channel = client()
    .channel(`chat-threads-${key}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, () => onChange())
    .subscribe();
  return () => {
    client().removeChannel(channel);
  };
}

/** Merges a message into a list by id, keeping created_at order — the
 * sender sees their own message twice (the insert's return value AND
 * the realtime echo), so every add goes through this. */
export function mergeMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (list.some((m) => m.id === message.id)) return list;
  return [...list, message].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

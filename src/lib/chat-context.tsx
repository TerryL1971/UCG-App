import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { SUPPORT_WHATSAPP, whatsappChatUrl } from '@/constants/ucg-info';
import { useAuth } from '@/lib/auth-context';
import { fetchMyStaffProfile, getOrCreateCustomerThread, sendChatMessage, type StaffProfile } from '@/lib/chat';
import { vehicleLabel } from '@/lib/deal-flow';
import { openUrlWithFeedback } from '@/lib/linking';
import { useMyDeals } from '@/lib/my-deals-context';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Decides, in one place, where a customer's "message my salesperson" goes
 * (Terry, 2026-11-09: the customer stays inside the app):
 *
 *  - Signed in with Supabase → the private in-app chat. Connecting a deal
 *    hands that chat straight to the deal's salesperson (link_my_deal in
 *    the deals migration).
 *  - No Supabase configured (local testing only) → UCG's WhatsApp inbox,
 *    since there's no in-app chat to use.
 */
interface ChatContextValue {
  /** True when this user can use the in-app chat as a customer. */
  available: boolean;
  /** Non-null when the signed-in account is active UCG staff. */
  staffProfile: StaffProfile | null;
  /** The customer's name/car snapshot written onto a new thread. */
  threadDetails: { customerName: string | null; carLabel: string | null };
  messageSpecialist: (text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { selected } = useMyDeals();
  const userId = user?.id;
  const available = isSupabaseConfigured && Boolean(userId);
  // Keyed by the user it was fetched for, so logging out (or switching
  // accounts) drops staff access immediately, without waiting on a fetch.
  const [staffLookup, setStaffLookup] = useState<{ userId: string; profile: StaffProfile | null } | null>(null);
  const staffProfile = available && staffLookup && staffLookup.userId === userId ? staffLookup.profile : null;

  useEffect(() => {
    if (!available || !userId) return;
    let cancelled = false;
    fetchMyStaffProfile(userId)
      .then((profile) => {
        if (!cancelled) setStaffLookup({ userId, profile });
      })
      .catch(() => {
        // Table missing (migration not applied yet) or offline — treat as
        // a normal customer account rather than blocking the app.
        if (!cancelled) setStaffLookup({ userId, profile: null });
      });
    return () => {
      cancelled = true;
    };
  }, [available, userId]);

  const deal = selected?.deal;
  const threadDetails = useMemo(
    () => ({
      customerName: deal?.customer_name || user?.name || null,
      carLabel: deal ? vehicleLabel(deal) : null,
    }),
    [deal, user?.name],
  );

  const openWhatsApp = useCallback(
    (text: string) =>
      openUrlWithFeedback(
        whatsappChatUrl(SUPPORT_WHATSAPP, text),
        "Couldn't open WhatsApp — make sure it's installed, then try again. Your message wasn't sent.",
      ),
    [],
  );

  const messageSpecialist = useCallback(
    async (text: string) => {
      if (!available || !userId) {
        await openWhatsApp(text);
        return;
      }
      try {
        const thread = await getOrCreateCustomerThread(userId, threadDetails);
        await sendChatMessage(thread.id, userId, 'customer', text);
        router.push('/salesperson');
      } catch (error) {
        console.error('In-app chat send failed:', error);
        Alert.alert("Couldn't send that", 'Check your connection and try again.');
      }
    },
    [available, userId, threadDetails, openWhatsApp],
  );

  const value = useMemo<ChatContextValue>(
    () => ({ available, staffProfile, threadDetails, messageSpecialist }),
    [available, staffProfile, threadDetails, messageSpecialist],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return ctx;
}

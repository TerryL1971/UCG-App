import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { specialistWhatsapp, whatsappChatUrl } from '@/constants/mock-data';
import { useAuth } from '@/lib/auth-context';
import { fetchMyStaffProfile, getOrCreateCustomerThread, sendChatMessage, type StaffProfile } from '@/lib/chat';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';
import { useDealSync } from '@/lib/deal-sync';
import { openUrlWithFeedback } from '@/lib/linking';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Decides, in one place, where a customer's "message my specialist" goes
 * (Terry, 2026-11-09: the customer should stay inside the app until they
 * pick up their car):
 *
 *  - Logged in with a real Supabase account → the private in-app chat
 *    (chat.ts / the private_chat migration). The message is posted into
 *    their thread and they land on the chat screen — they never leave
 *    the app.
 *  - Guest browsing, or no Supabase configured → today's WhatsApp
 *    hand-off, unchanged (Trengo by default, the specialist's own number
 *    once `onPersonalWhatsapp` is set — see specialistWhatsapp()).
 *
 * Every screen that used to build its own wa.me link (insurance, winter
 * tires, PPF, deposit trouble, documents code) calls `messageSpecialist`
 * instead, so the routing rule can't drift between screens.
 */
interface ChatContextValue {
  /** True when this user can use the in-app chat as a customer. */
  available: boolean;
  /** Non-null when the logged-in account is active UCG staff. */
  staffProfile: StaffProfile | null;
  /** The customer's name/car snapshot written onto a new thread. */
  threadDetails: { customerName: string | null; carLabel: string | null };
  messageSpecialist: (text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { car } = useDeal();
  const { intake } = useDealIntake();
  const { state: dealState } = useDealSync();
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

  const threadDetails = useMemo(
    () => ({
      customerName: intake?.fullName?.trim() || user?.name || null,
      carLabel: car ? `${car.year} ${car.title}` : null,
    }),
    [intake?.fullName, user?.name, car],
  );

  const openWhatsApp = useCallback(
    (text: string) =>
      openUrlWithFeedback(
        whatsappChatUrl(specialistWhatsapp(dealState.salesperson, dealState.onPersonalWhatsapp), text),
        "Couldn't open WhatsApp — make sure it's installed, then try again. Your message wasn't sent.",
      ),
    [dealState.salesperson, dealState.onPersonalWhatsapp],
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
        // Never strand the customer: offer the old path rather than just
        // saying "failed" (matters most in a live demo or on base Wi-Fi).
        Alert.alert("Couldn't send that in the app", 'Check your connection and try again, or send it on WhatsApp instead.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send on WhatsApp', onPress: () => openWhatsApp(text) },
        ]);
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

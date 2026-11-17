import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockIcon } from '@/components/icons';
import { ChatConversation } from '@/components/chat-conversation';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { fetchThread, getOrCreateCustomerThread, subscribeToThreadChanges, type ChatThread } from '@/lib/chat';
import { useChat } from '@/lib/chat-context';

/**
 * The customer's private in-app chat with their salesperson (Terry,
 * 2026-11-09: the customer stays inside the app). Connecting a deal hands
 * the chat straight to that deal's salesperson (link_my_deal in the deals
 * migration); until then it sits on every staff member's "Waiting for a
 * salesperson" list, and once taken only the two of them can read it.
 */
export default function SalespersonScreen() {
  const { user } = useAuth();
  const { available, threadDetails } = useChat();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Your Salesperson" />
      {available && user?.id ? (
        <InAppChat userId={user.id} threadDetails={threadDetails} />
      ) : (
        <Text style={styles.note}>Log in to chat with your UCG salesperson.</Text>
      )}
    </SafeAreaView>
  );
}

function InAppChat({
  userId,
  threadDetails,
}: {
  userId: string;
  threadDetails: { customerName: string | null; carLabel: string | null };
}) {
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getOrCreateCustomerThread(userId, threadDetails)
      .then((t) => {
        if (cancelled) return;
        setThread(t);
        setFailed(false);
      })
      .catch((error) => {
        console.error('Opening in-app chat failed:', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per user (and per retry); threadDetails is only a creation-time snapshot
  }, [userId, attempt]);

  const threadId = thread?.id;
  useEffect(() => {
    if (!threadId) return;
    // Picks up the moment a salesperson takes this customer, so the
    // header changes from "waiting" to their name without a refresh.
    return subscribeToThreadChanges(`customer-${threadId}`, () => {
      fetchThread(threadId)
        .then((t) => t && setThread(t))
        .catch(() => {});
    });
  }, [threadId]);

  const salespersonName = thread?.salesperson_name ?? 'UCG';

  return (
    <>
      <View style={styles.headerRow}>
        <View style={styles.avatarWrap}>
          <LockIcon color="#fff" size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{thread?.salesperson_name ?? 'Your UCG Salesperson'}</Text>
          <Text style={styles.title}>
            {thread?.salesperson_name
              ? `Private chat — only you and ${thread.salesperson_name} can see it`
              : 'A UCG salesperson will pick this up shortly'}
          </Text>
        </View>
      </View>

      {failed ? (
        <View style={styles.chatWrap}>
          <Text style={styles.note}>Couldn&apos;t open the chat — check your connection.</Text>
          <Button label="Try Again" variant="secondary" onPress={() => setAttempt((n) => n + 1)} />
        </View>
      ) : !thread ? (
        <View style={styles.chatWrap}>
          <ActivityIndicator color={Colors.navy} style={{ marginTop: 24 }} />
        </View>
      ) : (
        <ChatConversation
          threadId={thread.id}
          viewerId={userId}
          viewerRole="customer"
          otherPartyLabel={salespersonName}
          placeholder="Message your salesperson…"
          emptyNote="Say hi — your message goes straight to your UCG salesperson, right here in the app."
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 6,
    paddingBottom: 10,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: Fonts.display, fontSize: 19, color: Colors.text },
  title: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  chatWrap: { flex: 1, paddingHorizontal: Spacing.xxl, paddingBottom: 10 },
  note: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, textAlign: 'center', margin: Spacing.xxl },
});

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatConversation } from '@/components/chat-conversation';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { claimThread, fetchThread, subscribeToThreadChanges, type ChatThread } from '@/lib/chat';
import { useChat } from '@/lib/chat-context';

/**
 * One customer conversation, seen from the salesperson's side. A
 * waiting-list thread is readable but not writable until the salesperson
 * taps "Take this customer" (claim_chat_thread) — the in-app equivalent
 * of moving the conversation to their own WhatsApp. If a colleague takes
 * it first, RLS stops returning the thread and this screen says so.
 */
export default function StaffThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { user } = useAuth();
  const { staffProfile } = useChat();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'gone' | 'error'>('loading');
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    const load = () =>
      fetchThread(threadId)
        .then((t) => {
          if (cancelled) return;
          // null = RLS no longer returns it: a colleague took this customer.
          setThread(t);
          setStatus(t ? 'ready' : 'gone');
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });
    load();
    const unsubscribe = subscribeToThreadChanges(`staff-thread-${threadId}`, load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [threadId]);

  const take = async () => {
    if (!threadId) return;
    setIsClaiming(true);
    const result = await claimThread(threadId);
    setIsClaiming(false);
    if (result.ok) {
      setThread(result.thread);
      return;
    }
    if (result.reason === 'already_claimed') {
      Alert.alert('Already taken', 'Another salesperson took this customer a moment ago.', [
        { text: 'Back to Inbox', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Couldn't take this customer", 'Check your connection and try again.');
    }
  };

  if (!staffProfile || !user?.id) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Customer Chat" />
        <Text style={styles.note}>This screen is only for UCG staff accounts.</Text>
      </SafeAreaView>
    );
  }

  if (status !== 'ready' || !thread) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Customer Chat" />
        {status === 'loading' ? (
          <ActivityIndicator color={Colors.navy} style={{ marginTop: 32 }} />
        ) : (
          <Text style={styles.note}>
            {status === 'gone'
              ? 'Another salesperson has taken this customer, so this chat is now private to them.'
              : "Couldn't load this chat — check your connection."}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  const isMine = thread.salesperson_id === user.id;
  const customerName = thread.customer_name || 'App customer';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={customerName} subtitle={thread.car_label ?? undefined} />

      {!isMine && (
        <View style={styles.claimCard}>
          <Text style={styles.claimTitle}>Waiting for a salesperson</Text>
          <Text style={styles.claimBody}>
            Take this customer to reply. From then on the chat is private — only you and {customerName} can see it.
          </Text>
          <Button label={isClaiming ? 'Taking…' : 'Take This Customer'} onPress={take} disabled={isClaiming} />
        </View>
      )}

      <ChatConversation
        threadId={thread.id}
        viewerId={user.id}
        viewerRole="staff"
        otherPartyLabel={customerName}
        canSend={isMine}
        disabledNote="Take this customer to reply."
        placeholder={`Message ${customerName}…`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  note: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center', margin: Spacing.xxl, lineHeight: 20 },
  claimCard: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.sm,
    padding: 14,
    gap: 8,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.amber,
    backgroundColor: Colors.amberTint,
  },
  claimTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  claimBody: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
});

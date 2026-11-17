import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatTime } from '@/components/chat-conversation';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { fetchStaffThreads, subscribeToThreadChanges, type ChatThread } from '@/lib/chat';
import { useChat } from '@/lib/chat-context';

/**
 * A salesperson's inbox — the staff half of the private in-app chat
 * (Terry, 2026-11-09). Same app, same login screen; an account an admin
 * has added to `staff_members` (see the private_chat migration) gets
 * this screen from the Account tab.
 *
 * Two lists, matching how UCG already works:
 *  - "Waiting for a salesperson" — new app customers nobody has taken
 *    yet. Every staff member sees these, like the shared Trengo inbox.
 *  - "My customers" — only the ones THIS salesperson has taken. Other
 *    salespeople's customers never appear here at all: RLS doesn't
 *    return them, so there's nothing to hide client-side.
 */
export default function StaffInboxScreen() {
  const { user } = useAuth();
  const { staffProfile } = useChat();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(() => {
    return fetchStaffThreads()
      .then((rows) => {
        setThreads(rows);
        setLoadFailed(false);
      })
      .catch((error) => {
        console.error('Loading staff inbox failed:', error);
        setLoadFailed(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Refetch whenever the inbox comes back into view (e.g. after replying
  // in a thread) and live on any thread change — a new customer waiting,
  // or a colleague taking one off the waiting list.
  useFocusEffect(
    useCallback(() => {
      if (staffProfile) load();
    }, [staffProfile, load]),
  );
  useEffect(() => {
    if (!staffProfile) return;
    return subscribeToThreadChanges('staff-inbox', () => {
      load();
    });
  }, [staffProfile, load]);

  const refresh = () => {
    setIsRefreshing(true);
    load().finally(() => setIsRefreshing(false));
  };

  if (!staffProfile || !user?.id) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Staff" />
        <Text style={styles.note}>This screen is only for UCG staff accounts.</Text>
      </SafeAreaView>
    );
  }

  // A thread only exists once the customer opens the chat; hide ones
  // where they haven't actually said anything yet.
  const withMessages = threads.filter((t) => t.last_message_preview);
  const waiting = withMessages.filter((t) => !t.salesperson_id);
  const mine = withMessages.filter((t) => t.salesperson_id === user.id);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Staff" subtitle={`${staffProfile.display_name}${staffProfile.location ? ` · ${staffProfile.location}` : ''}`} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.navy} />}>
        <Pressable style={({ pressed }) => [styles.dealsCard, pressed && { opacity: 0.8 }]} onPress={() => router.push('/staff/deals')}>
          <Text style={styles.dealsTitle}>Deals  →</Text>
          <Text style={styles.dealsBody}>Open a deal for a customer, tap Retail Ready / Paid in Full / Delivered, and add scans.</Text>
        </Pressable>
        {isLoading ? (
          <ActivityIndicator color={Colors.navy} style={{ marginTop: 32 }} />
        ) : loadFailed ? (
          <Text style={styles.note}>Couldn&apos;t load your inbox — pull down to try again.</Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Waiting for a salesperson ({waiting.length})</Text>
            <Text style={styles.sectionHint}>New app customers. Take one to start a private chat — after that, only you can see it.</Text>
            {waiting.length === 0 ? (
              <Text style={styles.empty}>No one waiting right now.</Text>
            ) : (
              waiting.map((t) => <ThreadRow key={t.id} thread={t} waiting />)
            )}

            <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>My customers ({mine.length})</Text>
            {mine.length === 0 ? (
              <Text style={styles.empty}>Customers you take will show up here.</Text>
            ) : (
              mine.map((t) => <ThreadRow key={t.id} thread={t} />)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ThreadRow({ thread, waiting }: { thread: ChatThread; waiting?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, waiting && styles.rowWaiting, pressed && { opacity: 0.7 }]}
      onPress={() => router.push({ pathname: '/staff/[threadId]', params: { threadId: thread.id } })}>
      <View style={styles.rowTop}>
        <Text style={styles.rowName} numberOfLines={1}>
          {thread.customer_name || 'App customer'}
        </Text>
        <Text style={styles.rowTime}>{formatTime(thread.last_message_at)}</Text>
      </View>
      {thread.car_label ? <Text style={styles.rowCar}>{thread.car_label}</Text> : null}
      <Text style={styles.rowPreview} numberOfLines={2}>
        {thread.last_message_preview}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  note: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center', margin: Spacing.xxl },
  dealsCard: { backgroundColor: Colors.navy, borderRadius: Radius.lg, padding: 16, marginTop: Spacing.sm },
  dealsTitle: { fontFamily: Fonts.display, fontSize: 19, color: '#fff' },
  dealsBody: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 18 },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text, marginTop: Spacing.md },
  sectionHint: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2, marginBottom: Spacing.sm },
  empty: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textFaint, marginVertical: Spacing.sm },
  row: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginTop: Spacing.sm,
  },
  rowWaiting: { borderColor: Colors.amber, backgroundColor: Colors.amberTint },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  rowTime: { fontFamily: Fonts.bodyMedium, fontSize: 11.5, color: Colors.textFaint },
  rowCar: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.navy, marginTop: 2 },
  rowPreview: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
});

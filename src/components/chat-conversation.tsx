import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
} from 'react-native';

import { SendIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  CHAT_MAX_MESSAGE_LENGTH,
  fetchMessages,
  mergeMessage,
  sendChatMessage,
  subscribeToMessages,
  type ChatMessage,
  type ChatSenderRole,
} from '@/lib/chat';

/**
 * The live message list + input, shared by the customer's chat
 * (salesperson.tsx) and a salesperson's view of the same thread
 * (staff/[threadId].tsx) — same bubbles on both phones, just mirrored:
 * whoever is looking sees their own messages on the right.
 *
 * Bubble styling deliberately matches salesperson.tsx's existing chat
 * (navy for "me", white for the other side) so switching that screen
 * from the WhatsApp hand-off to this looks like the same screen working
 * for real, not a different feature.
 */
export function ChatConversation({
  threadId,
  viewerId,
  viewerRole,
  otherPartyLabel,
  canSend = true,
  disabledNote,
  initialDraft = '',
  placeholder = 'Type a message…',
  emptyNote,
  footer,
}: {
  threadId: string;
  viewerId: string;
  viewerRole: ChatSenderRole;
  /** Label above the other side's bubbles, e.g. "John Smith" or the
   * customer's name. */
  otherPartyLabel: string;
  /** False for a salesperson viewing a waiting-list thread they haven't
   * taken yet — RLS would reject the insert anyway; this just explains
   * why instead of showing a broken send button. */
  canSend?: boolean;
  disabledNote?: string;
  /** Pre-filled text for a brand-new conversation only — cleared once
   * existing messages load, if the person hasn't edited it. Read once on
   * mount, so callers resolve it before rendering this. */
  initialDraft?: string;
  placeholder?: string;
  emptyNote?: string;
  /** Rendered under the input (e.g. the customer's deposit/warranty CTAs). */
  footer?: ReactNode;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [input, setInput] = useState(initialDraft);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    let cancelled = false;
    // Subscribe first, then fetch — a message arriving between the two
    // is caught by the subscription, and mergeMessage dedupes any overlap.
    const unsubscribe = subscribeToMessages(threadId, (message) => {
      if (!cancelled) setMessages((prev) => mergeMessage(prev, message));
    });
    fetchMessages(threadId)
      .then((loaded) => {
        if (cancelled) return;
        setMessages((prev) => loaded.reduce(mergeMessage, prev));
        setLoadFailed(false);
        if (loaded.length > 0) {
          setInput((current) => (current === initialDraft ? '' : current));
        }
      })
      .catch((error) => {
        console.error('Loading chat messages failed:', error);
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialDraft is only meaningful on first load; re-running on draft changes would refetch and fight the person's own edits
  }, [threadId]);

  const dismissKeyboard = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isSending || !canSend) return;
    setIsSending(true);
    setSendError(null);
    try {
      const sent = await sendChatMessage(threadId, viewerId, viewerRole, text);
      setMessages((prev) => mergeMessage(prev, sent));
      setInput('');
    } catch (error) {
      console.error('Sending chat message failed:', error);
      // Keep the typed text in the box so nothing is lost.
      setSendError("Couldn't send — check your connection and tap send again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.chatWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
        {isLoading && <ActivityIndicator color={Colors.navy} style={styles.loading} />}
        {loadFailed && (
          <Text style={styles.note}>Couldn&apos;t load earlier messages — check your connection. New messages still arrive here.</Text>
        )}
        {!isLoading && !loadFailed && messages.length === 0 && emptyNote ? <Text style={styles.note}>{emptyNote}</Text> : null}
        {messages.map((m) => {
          const mine = m.sender_id === viewerId;
          return (
            <View key={m.id} style={mine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs}>
              {!mine && <Text style={styles.senderLabel}>{otherPartyLabel}</Text>}
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.body}</Text>
              </View>
              <Text style={[styles.time, mine && styles.timeMine]}>{formatTime(m.created_at)}</Text>
            </View>
          );
        })}
      </ScrollView>

      {canSend ? (
        <>
          {sendError && <Text style={styles.sendError}>{sendError}</Text>}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={placeholder}
              placeholderTextColor={Colors.textFaint}
              style={styles.input}
              multiline
              maxLength={CHAT_MAX_MESSAGE_LENGTH}
              blurOnSubmit={false}
              onSubmitEditing={send}
            />
            <Pressable
              style={[styles.sendButton, (isSending || !input.trim()) && styles.sendButtonIdle]}
              onPress={send}
              disabled={isSending}
              hitSlop={8}
              accessibilityLabel="Send message">
              {isSending ? <ActivityIndicator color="#fff" size="small" /> : <SendIcon color="#fff" />}
            </Pressable>
          </View>
          <Pressable style={styles.doneRow} onPress={dismissKeyboard} hitSlop={8}>
            <Text style={styles.doneRowText}>Hide Keyboard</Text>
          </Pressable>
        </>
      ) : (
        disabledNote && <Text style={styles.disabledNote}>{disabledNote}</Text>
      )}

      {footer}
    </KeyboardAvoidingView>
  );
}

/** Today → "14:05"; earlier → "4 Nov, 14:05". 24-hour on purpose: the
 * customers are Americans in Germany, but every clock, appointment and
 * DealerTeam timestamp around them is 24-hour. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return time;
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${d.getDate()} ${month}, ${time}`;
}

const styles = StyleSheet.create({
  chatWrap: { flex: 1, paddingHorizontal: Spacing.xxl, paddingBottom: 10 },
  messageList: { flex: 1 },
  messageListContent: { paddingVertical: 8, gap: 8 },
  loading: { marginTop: 24 },
  note: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginVertical: 16,
    paddingHorizontal: 12,
  },
  bubbleWrapTheirs: { alignSelf: 'flex-start', maxWidth: '85%' },
  bubbleWrapMine: { alignSelf: 'flex-end', maxWidth: '85%' },
  senderLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.textMuted, marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleTheirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border },
  bubbleMine: { backgroundColor: Colors.navy },
  bubbleText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  time: { fontFamily: Fonts.bodyMedium, fontSize: 10.5, color: Colors.textFaint, marginTop: 3, marginLeft: 4 },
  timeMine: { alignSelf: 'flex-end', marginRight: 4 },
  sendError: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.red, marginTop: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Fonts.body,
    fontSize: 14.5,
    color: Colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonIdle: { opacity: 0.6 },
  doneRow: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14 },
  doneRowText: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted },
  disabledNote: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
});

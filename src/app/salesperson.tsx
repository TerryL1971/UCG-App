import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SendIcon, StarIcon } from '@/components/icons';
import { SalespersonAvatarFull } from '@/components/salesperson-avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { SUPPORT_WHATSAPP, ucgAssistant, whatsappChatUrl } from '@/constants/mock-data';
import { parseJsonResponse } from '@/lib/api-fetch';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';
import { useWarranty } from '@/lib/warranty-context';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * The AI assistant chat — the "UCG Assistant" guides the customer through
 * buying or selling, start to finish (Terry, Sept 3). It is NOT a person
 * and NOT the assigned salesperson; a real human takes over logistics
 * after a deposit (that person shows up on My Deal, not here). Backend is
 * src/app/api/chat+api.ts (a server route, so the Anthropic API key never
 * ships in the app).
 *
 * The "can't move forward?" link at the bottom is the last-resort escape
 * hatch to a real UCG agent over WhatsApp — meant for a genuinely stuck
 * customer, not a primary path. It points at `SUPPORT_WHATSAPP`
 * (mock-data.ts), which is still a stand-in until Terry provides the
 * Trengo-connected number.
 */
export default function SalespersonScreen() {
  const { car } = useDeal();
  const { intake } = useDealIntake();
  const { choice: warrantyChoice } = useWarranty();
  const carLabel = car ? `${car.year} ${car.title}` : 'your next car';
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Keyboard.dismiss() alone is unreliable here — it asks the OS to hide
  // the keyboard without necessarily releasing the TextInput's own focus,
  // and if focus never actually leaves the input, iOS can just show the
  // keyboard again. Explicitly blurring the input first is what actually
  // gets rid of it reliably; Keyboard.dismiss() is kept as a fallback for
  // any focus this doesn't already cover.
  const dismissKeyboard = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'assistant',
      content: intake
        ? `Hi! I'm the UCG Assistant. I've got what you sent — ${intake.base}, ${
            intake.paymentMethod === 'cash' ? 'paying cash' : 'financing'
          } — for the ${carLabel}. I'll walk you through the whole process — ask me anything.`
        : `Hi! I'm the UCG Assistant, here to walk you through ${carLabel} start to finish. What can I answer for you?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          context: {
            carLabel,
            base: intake?.base,
            paymentMethod: intake?.paymentMethod,
            apoAddressStatus: intake?.apoAddressStatus,
            warranty: warrantyChoice?.decision,
          },
        }),
      });
      const data = await parseJsonResponse<{ reply: string }>(res);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      // Shown to the customer stays friendly on purpose — but log the
      // real cause (e.g. a non-JSON response, same class of bug as the
      // deposit flow's "Unexpected character: N" crash) so it's
      // diagnosable from device logs instead of only "something broke."
      console.error('AI agent chat request failed:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong reaching the AI agent — try again in a moment.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="UCG Assistant" />

      <Pressable style={styles.headerRow} onPress={dismissKeyboard}>
        <View style={styles.avatarWrap}>
          <SalespersonAvatarFull size={56} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{ucgAssistant.name}</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>
          <Text style={styles.title}>
            <StarIcon size={12} /> {ucgAssistant.title}
          </Text>
        </View>
        {intake && (
          <Pressable hitSlop={8} onPress={() => router.push('/deal-intake')} style={styles.editLink}>
            <Text style={styles.editLinkText}>Edit My Info</Text>
          </Pressable>
        )}
      </Pressable>

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
          {messages.map((m, i) => (
            <View key={i} style={m.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAssistant}>
              {m.role === 'assistant' && <Text style={styles.senderLabel}>{ucgAssistant.name}</Text>}
              <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>{m.content}</Text>
              </View>
            </View>
          ))}
          {isSending && (
            <View style={styles.bubbleWrapAssistant}>
              <Text style={styles.senderLabel}>{ucgAssistant.name}</Text>
              <View style={[styles.bubble, styles.bubbleAssistant]}>
                <ActivityIndicator color={Colors.navy} size="small" />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about financing, licensing, warranty…"
            placeholderTextColor={Colors.textFaint}
            style={styles.input}
            multiline
            blurOnSubmit={false}
            onSubmitEditing={() => sendMessage()}
          />
          <Pressable style={styles.sendButton} onPress={sendMessage} disabled={isSending} hitSlop={8}>
            <SendIcon color="#fff" />
          </Pressable>
        </View>

        {/* An explicit, always-reachable way to close the keyboard —
            tap-outside-to-dismiss isn't reliable enough on its own to be
            the only way to get back to the buttons below, which sit
            outside this KeyboardAvoidingView and could otherwise end up
            stuck behind an open keyboard with no way to reach them. */}
        <Pressable style={styles.doneRow} onPress={dismissKeyboard} hitSlop={8}>
          <Text style={styles.doneRowText}>Done ⌄</Text>
        </Pressable>

        <Pressable
          style={styles.stuckRow}
          hitSlop={6}
          onPress={() =>
            Linking.openURL(
              whatsappChatUrl(
                SUPPORT_WHATSAPP,
                `Hi UCG — I'm stuck in the app on ${carLabel} and need a hand.`,
              ),
            ).catch(() => {})
          }>
          <Text style={styles.stuckText}>Stuck and can&apos;t move forward? Message a UCG specialist  →</Text>
        </Pressable>

        <View style={styles.ctaWrap}>
          <Button
            label="Hold This Car — Make a Deposit"
            variant="secondary"
            style={styles.depositButton}
            onPress={() => router.push('/deposit')}
          />
          <Button
            label={
              warrantyChoice
                ? warrantyChoice.decision === 'accepted'
                  ? 'Premium Protection — Added ✓'
                  : 'Premium Protection — Declined'
                : 'Premium Protection Plan'
            }
            variant="secondary"
            style={styles.depositButton}
            onPress={() => router.push('/warranty')}
          />
          <Button label="View My Timeline  →" onPress={() => router.push('/(tabs)/deal')} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    backgroundColor: Colors.navyTint,
    overflow: 'hidden',
    alignItems: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: Fonts.display, fontSize: 19, color: Colors.text },
  editLink: { paddingVertical: 4, paddingHorizontal: 6 },
  editLinkText: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 12.5,
    color: Colors.red,
    textDecorationLine: 'underline',
  },
  aiBadge: { backgroundColor: Colors.navy, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  aiBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 9.5, color: '#fff', letterSpacing: 0.5 },
  title: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  chatWrap: { flex: 1, paddingHorizontal: Spacing.xxl, paddingBottom: 10 },
  messageList: { flex: 1 },
  messageListContent: { paddingVertical: 8, gap: 8 },
  bubbleWrapAssistant: { alignSelf: 'flex-start', maxWidth: '85%' },
  bubbleWrapUser: { alignSelf: 'flex-end', maxWidth: '85%' },
  senderLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.textMuted, marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleAssistant: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border },
  bubbleUser: { backgroundColor: Colors.navy },
  bubbleText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 8,
  },
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
  doneRow: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14 },
  doneRowText: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted },
  stuckRow: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 14 },
  stuckText: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 11.5,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  ctaWrap: { paddingHorizontal: Spacing.xxl, paddingTop: 4, paddingBottom: 8, gap: 10 },
  depositButton: { marginBottom: 0 },
});

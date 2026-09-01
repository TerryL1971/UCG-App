import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SendIcon, StarIcon } from '@/components/icons';
import { SalespersonAvatarFull } from '@/components/salesperson-avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { salesperson, whatsappChatUrl } from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * "Meet Your Specialist" now means an AI agent, not a human you call or
 * text — so this screen's main action is a real in-app chat, not the
 * WhatsApp Call/Text row it used to have. The agent's backend is
 * src/app/api/chat+api.ts (a server route, so the Anthropic API key never
 * ships in the app). "Talk to a Human" stays as a real fallback via
 * WhatsApp — the agent's own system prompt tells it to point customers
 * there for anything account-specific or that it can't answer, matching
 * docs/backend-and-ai-agent-plan.md's Tier 1 design.
 */
export default function SalespersonScreen() {
  const { car } = useDeal();
  const { intake } = useDealIntake();
  const carLabel = car ? `${car.year} ${car.title}` : 'your next car';

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'assistant',
      content: intake
        ? `Hi! I'm your AI agent here at Used Car Guys. I've got what you sent — ${intake.base}, ${
            intake.paymentMethod === 'cash' ? 'paying cash' : 'financing'
          } — for the ${carLabel}. Ask me anything about the process, or say the word and I'll get a real person for you.`
        : `Hi! I'm your AI agent here at Used Car Guys, ready to help with the ${carLabel}. What can I answer for you?`,
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
          context: { carLabel, base: intake?.base, paymentMethod: intake?.paymentMethod },
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong reaching the AI agent — tap "Talk to a Human" below.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Meet Your Specialist" />

      <View style={styles.headerRow}>
        <View style={styles.avatarWrap}>
          <SalespersonAvatarFull size={56} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{salesperson.name}</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI AGENT</Text>
            </View>
          </View>
          <Text style={styles.title}>
            <StarIcon size={12} /> {salesperson.title}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() => {}}>
          {messages.map((m, i) => (
            <View
              key={i}
              style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
              <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>{m.content}</Text>
            </View>
          ))}
          {isSending && (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <ActivityIndicator color={Colors.navy} size="small" />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about financing, licensing, warranty…"
            placeholderTextColor={Colors.textFaint}
            style={styles.input}
            multiline
            onSubmitEditing={sendMessage}
          />
          <Pressable style={styles.sendButton} onPress={sendMessage} disabled={isSending} hitSlop={8}>
            <SendIcon color="#fff" />
          </Pressable>
        </View>

        <Text style={styles.humanLink} onPress={() => Linking.openURL(whatsappChatUrl(salesperson.whatsapp))}>
          Talk to a Human →
        </Text>
      </KeyboardAvoidingView>

      <View style={styles.ctaWrap}>
        <Button label="View My Timeline  →" onPress={() => router.push('/(tabs)/deal')} />
      </View>
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
  aiBadge: { backgroundColor: Colors.navy, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  aiBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 9.5, color: '#fff', letterSpacing: 0.5 },
  title: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  chatWrap: { flex: 1, paddingHorizontal: Spacing.xxl },
  messageList: { flex: 1 },
  messageListContent: { paddingVertical: 8, gap: 8 },
  bubble: { maxWidth: '85%', borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleAssistant: { backgroundColor: '#fff', alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.border },
  bubbleUser: { backgroundColor: Colors.navy, alignSelf: 'flex-end' },
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
  humanLink: {
    textAlign: 'center',
    fontFamily: Fonts.bodySemibold,
    fontSize: 12.5,
    color: Colors.textMuted,
    paddingVertical: 10,
  },
  ctaWrap: { paddingHorizontal: Spacing.xxl, paddingTop: 4, paddingBottom: 8 },
});

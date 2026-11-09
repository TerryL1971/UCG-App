import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockIcon, SendIcon, ShieldIcon, StarIcon, UmbrellaIcon, WhatsAppIcon } from '@/components/icons';
import { ChatConversation } from '@/components/chat-conversation';
import { SalespersonAvatarFull } from '@/components/salesperson-avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  AI_CHAT_ENABLED,
  AI_CHAT_HISTORY_WINDOW,
  AI_CHAT_MAX_MESSAGE_LENGTH,
  AI_CHAT_MAX_USER_MESSAGES,
} from '@/constants/ai-chat';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { specialistWhatsapp, ucgAssistant, whatsappChatUrl } from '@/constants/mock-data';
import { isDenStock } from '@/constants/vro-checklists';
import { parseJsonResponse } from '@/lib/api-fetch';
import { useAuth } from '@/lib/auth-context';
import { fetchThread, getOrCreateCustomerThread, subscribeToThreadChanges, type ChatThread } from '@/lib/chat';
import { useChat } from '@/lib/chat-context';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';
import { useDealSync } from '@/lib/deal-sync';
import { getOwnerId } from '@/lib/document-storage';
import { openUrlWithFeedback } from '@/lib/linking';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useWarranty } from '@/lib/warranty-context';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Dev/test only — same rationale as My Deal's "Jump to Step" row and
 * wire-instructions.tsx's "Payment Status" row: lets `onPersonalWhatsapp`
 * be flipped directly without a real trigger to drive it yet (see
 * DealServerState's doc comment). __DEV__ is false in a real release
 * build, so this can't reach a real customer. Forces a specialist to be
 * assigned when flipping to "Specialist's Personal #" — same override
 * behavior as Jump to Step, works from any state without first walking
 * through the deposit flow. */
function WhatsAppRoutingTestRow() {
  const { state: dealState, setPersonalWhatsapp } = useDealSync();
  if (!__DEV__) return null;
  return (
    <View style={styles.testingRow}>
      <Text style={styles.testingLabel}>TESTING — WhatsApp Routing:</Text>
      <View style={styles.testingChips}>
        <Pressable
          onPress={() => setPersonalWhatsapp(false)}
          style={[styles.testingChip, !dealState.onPersonalWhatsapp && styles.testingChipActive]}>
          <Text style={[styles.testingChipText, !dealState.onPersonalWhatsapp && styles.testingChipTextActive]}>
            Trengo
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPersonalWhatsapp(true)}
          style={[styles.testingChip, dealState.onPersonalWhatsapp && styles.testingChipActive]}>
          <Text style={[styles.testingChipText, dealState.onPersonalWhatsapp && styles.testingChipTextActive]}>
            Specialist&apos;s Personal #
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * The private in-app chat with a real salesperson (Terry, 2026-11-09:
 * the customer stays inside the app until they pick up their car). Shown
 * instead of the WhatsApp hand-off whenever the customer is logged in to
 * a real account — see chat-context.tsx for the routing rule and the
 * private_chat migration for who can see what.
 *
 * Until a salesperson takes the conversation it sits on every staff
 * member's "Waiting for a salesperson" list; once taken, the header
 * switches to that salesperson's name live (thread realtime), and from
 * then on only the two of them can read it.
 */
function InAppSpecialistChat({
  userId,
  composeDraft,
  footer,
}: {
  userId: string;
  composeDraft: (code: string | null) => string;
  footer: ReactNode;
}) {
  const { threadDetails } = useChat();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Thread and documents code together, so the draft is final before
    // ChatConversation mounts (it only reads initialDraft once).
    Promise.all([getOrCreateCustomerThread(userId, threadDetails), getOwnerId().catch(() => null)])
      .then(([t, code]) => {
        if (cancelled) return;
        setDraft(t.last_message_preview ? '' : composeDraft(code));
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

  const specialistName = thread?.salesperson_name ?? 'Your UCG Specialist';

  return (
    <>
      <View style={styles.headerRow}>
        <View style={[styles.avatarWrap, styles.inAppAvatarWrap]}>
          <LockIcon color="#fff" size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{specialistName}</Text>
          <Text style={styles.title}>
            {thread?.salesperson_name
              ? `Private chat — only you and ${thread.salesperson_name} can see it`
              : 'A UCG specialist will pick this up shortly'}
          </Text>
        </View>
      </View>

      {failed ? (
        <View style={styles.chatWrap}>
          <Text style={styles.inAppNote}>Couldn&apos;t open the chat — check your connection.</Text>
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
          otherPartyLabel={specialistName}
          initialDraft={draft}
          placeholder="Message your UCG specialist…"
          emptyNote="Say hi — your message goes straight to a UCG specialist, right here in the app."
          footer={footer}
        />
      )}
    </>
  );
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
 * customer, not a primary path. It opens `SUPPORT_WHATSAPP` (mock-data.ts),
 * the shared Trengo inbox — still a stand-in until Terry provides the
 * Trengo-connected number — unless the assigned specialist has actually
 * asked to move this deal to their own personal WhatsApp
 * (`dealState.onPersonalWhatsapp`), in which case `specialistWhatsapp()`
 * switches this to that number instead, invisibly to the customer. Being
 * assigned a specialist and being on their personal WhatsApp are two
 * separate facts — a deposit alone doesn't imply the second one.
 */
export default function SalespersonScreen() {
  const { car } = useDeal();
  const { intake } = useDealIntake();
  const { choice: warrantyChoice } = useWarranty();
  const { state: dealState } = useDealSync();
  const { user } = useAuth();
  const { available: inAppChatAvailable } = useChat();
  const carLabel = car ? `${car.year} ${car.title}` : 'your next car';
  // Never "Deposit" on a DEN-stock car — see isDenStock's doc comment
  // (vro-checklists.ts). Matches deposit.tsx's own "Pay Reservation Fee
  // with PayPal" wording rather than inventing a new phrase for the same
  // concept.
  const holdButtonLabel = isDenStock(car?.stockNumber) ? 'Hold This Car — Pay Reservation Fee' : 'Hold This Car — Make a Deposit';
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

  // Pre-fills the WhatsApp message box with a real summary — name, base,
  // payment, license status, and the documents code — instead of
  // launching WhatsApp automatically the moment intake is submitted
  // (Terry, 2026-09-21: submitting shouldn't bounce the customer out of
  // the app). This still gets the same information to a salesperson,
  // just via one deliberate tap of the (already-visible) send button
  // instead of a surprise app-switch. A function declaration, not a
  // const — needs to be usable both in `input`'s own useState initializer
  // below AND in the effect after it, so it has to be hoisted.
  function composeWhatsAppDraft(code: string | null) {
    if (!intake || AI_CHAT_ENABLED) return '';
    const licenseLine = intake.licenseStatus === 'have' ? 'Has a USAREUR license already' : 'Still needs a USAREUR license';
    return [
      `Hi! I'm starting a deal on the ${carLabel}.`,
      `Name: ${intake.fullName}`,
      `Base: ${intake.base}`,
      `Contact: ${intake.contact}`,
      `Payment: ${intake.paymentMethod === 'cash' ? 'Cash' : 'Financing'}`,
      intake.paymentMethod === 'financing' && intake.financingDownPayment.trim()
        ? `Planned down payment: ${intake.financingDownPayment.trim()}`
        : '',
      licenseLine,
      intake.notes.trim() ? `Notes: ${intake.notes.trim()}` : '',
      code ? `Documents code: ${code}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'assistant',
      content: AI_CHAT_ENABLED
        ? intake
          ? `Hi! I'm the UCG Assistant. I've got what you sent — ${intake.base}, ${
              intake.paymentMethod === 'cash' ? 'paying cash' : 'financing'
            } — for the ${carLabel}. I'll walk you through the whole process — ask me anything.`
          : `Hi! I'm the UCG Assistant, here to walk you through ${carLabel} start to finish. What can I answer for you?`
        : intake
          ? `Hi! I'm your UCG specialist. I've got what you sent — ${intake.base}, ${
              intake.paymentMethod === 'cash' ? 'paying cash' : 'financing'
            } — for the ${carLabel}. Send a message below any time and it'll open WhatsApp so we can talk directly.`
          : `Hi! I'm your UCG specialist, here to help with ${carLabel}. Send a message below any time and it'll open WhatsApp so we can talk directly.`,
    },
  ]);
  const [input, setInput] = useState(() => composeWhatsAppDraft(null));
  const [isSending, setIsSending] = useState(false);

  // Code loads async (AsyncStorage) — appended to the draft once ready,
  // but only if the box still holds exactly what was auto-composed
  // without it. If the customer already started typing over the draft,
  // this leaves their edit alone rather than clobbering it.
  useEffect(() => {
    if (AI_CHAT_ENABLED) return;
    getOwnerId().then((code) => {
      setInput((current) => (current === composeWhatsAppDraft(null) ? composeWhatsAppDraft(code) : current));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- composeWhatsAppDraft closes over intake/carLabel, which don't change mid-session; re-running this on every render would re-fight the customer's own edits
  }, []);

  // Cost guard (src/constants/ai-chat.ts): past this many customer
  // messages, stop calling the API and hand off to a human instead —
  // re-enforced server-side too, this is just what stops the UI from ever
  // offering another API call once the limit's reached.
  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const reachedLimit = userMessageCount >= AI_CHAT_MAX_USER_MESSAGES;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending || reachedLimit) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Only the recent window is actually sent — see
          // AI_CHAT_HISTORY_WINDOW's doc comment for why (resending full
          // history every turn is the biggest cost driver in a chat UI).
          // The customer's own screen (`messages` state) keeps everything.
          messages: nextMessages.slice(-AI_CHAT_HISTORY_WINDOW),
          context: {
            carLabel,
            base: intake?.base,
            paymentMethod: intake?.paymentMethod,
            apoAddressStatus: intake?.apoAddressStatus,
            warranty: warrantyChoice?.decision,
            notes: intake?.notes,
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

  const messageASpecialist = () =>
    openUrlWithFeedback(
      whatsappChatUrl(
        specialistWhatsapp(dealState.salesperson, dealState.onPersonalWhatsapp),
        `Hi UCG — I'm stuck in the app on ${carLabel} and need a hand.`,
      ),
      "Couldn't open WhatsApp — make sure it's installed, then try again.",
    );

  // The owner's kill switch (src/constants/ai-chat.ts) — flip
  // AI_CHAT_ENABLED to false and this screen stops calling the AI
  // entirely. This is the *real* screen now, not a bare fallback: same
  // chat-bubble layout as the AI version, but "send" opens WhatsApp with
  // whatever was typed instead of calling Anthropic — there's no real
  // reply bubble because the actual conversation continues in WhatsApp,
  // outside the app. Everything else the AI chat would otherwise gate
  // (deposit, warranty, insurance, timeline) stays reachable exactly as
  // before — only the chat mechanism changes.
  // Shared by the in-app chat and the WhatsApp hand-off below — the same
  // next steps either way, only the conversation mechanism differs.
  const dealCtas = (
    <View style={styles.ctaWrap}>
      <Button
        label={holdButtonLabel}
        variant="secondary"
        style={styles.depositButton}
        icon={<LockIcon color={Colors.navy} />}
        onPress={() => router.push('/deposit')}
      />
      <Text style={styles.ctaCaption}>Refundable — holds the car while we finish your paperwork.</Text>
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
        icon={<ShieldIcon color={Colors.navy} />}
        onPress={() => router.push('/warranty')}
      />
      <Text style={styles.ctaCaption}>Our extended warranty, beyond the 1-year standard coverage.</Text>
      <Button
        label="Insurance — First Month Paid"
        variant="secondary"
        style={styles.depositButton}
        icon={<UmbrellaIcon color={Colors.navy} />}
        onPress={() => router.push('/insurance')}
      />
      <Text style={styles.ctaCaption}>Add a German policy — UCG covers your first month.</Text>
      <Button label="View My Timeline  →" onPress={() => router.push('/(tabs)/deal')} />
    </View>
  );

  if (!AI_CHAT_ENABLED) {
    if (inAppChatAvailable && user?.id) {
      return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
          <ScreenHeader title="UCG Specialist" />
          <InAppSpecialistChat userId={user.id} composeDraft={composeWhatsAppDraft} footer={dealCtas} />
        </SafeAreaView>
      );
    }

    const sendToWhatsApp = () => {
      const text = input.trim();
      if (!text) return;
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setInput('');
      dismissKeyboard();
      openUrlWithFeedback(
        whatsappChatUrl(specialistWhatsapp(dealState.salesperson, dealState.onPersonalWhatsapp), text),
        "Couldn't open WhatsApp — make sure it's installed, then try again. Your message wasn't sent.",
      );
    };

    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScreenHeader title="UCG Specialist" />

        <Pressable style={styles.headerRow} onPress={dismissKeyboard}>
          <View style={[styles.avatarWrap, styles.whatsappAvatarWrap]}>
            <WhatsAppIcon size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>Your UCG Specialist</Text>
            </View>
            <Text style={styles.title}>
              <StarIcon size={12} /> Used Car Guys
            </Text>
          </View>
          {intake && (
            <Pressable hitSlop={8} onPress={() => router.push('/deal-intake')} style={styles.editLink}>
              <Text style={styles.editLinkText}>Edit My Info</Text>
            </Pressable>
          )}
        </Pressable>

        {/* Guests still get the WhatsApp hand-off; a real account is what
            makes the private in-app chat possible (it needs to know who's
            on each end), so say so rather than leaving it undiscoverable. */}
        {isSupabaseConfigured && !user && (
          <Pressable style={styles.loginHint} onPress={() => router.push('/log-in')} hitSlop={6}>
            <Text style={styles.loginHintText}>Log in to chat privately with your specialist right here in the app  →</Text>
          </Pressable>
        )}

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
                {m.role === 'assistant' && <Text style={styles.senderLabel}>Your UCG Specialist</Text>}
                <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                  <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>{m.content}</Text>
                </View>
                {m.role === 'user' && (
                  <View style={styles.sentViaRow}>
                    <WhatsAppIcon size={11} color={Colors.textFaint} />
                    <Text style={styles.sentViaText}>Sent via WhatsApp</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message — opens WhatsApp to send"
              placeholderTextColor={Colors.textFaint}
              style={styles.input}
              multiline
              maxLength={AI_CHAT_MAX_MESSAGE_LENGTH}
              blurOnSubmit={false}
              onSubmitEditing={sendToWhatsApp}
            />
            <Pressable style={styles.whatsappSendButton} onPress={sendToWhatsApp} hitSlop={8}>
              <WhatsAppIcon color="#fff" size={26} />
            </Pressable>
          </View>

          <Pressable style={styles.doneRow} onPress={dismissKeyboard} hitSlop={8}>
            <Text style={styles.doneRowText}>Hide Keyboard</Text>
          </Pressable>

          {dealCtas}

          <WhatsAppRoutingTestRow />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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

        {reachedLimit ? (
          // Cost guard (ai-chat.ts) — past AI_CHAT_MAX_USER_MESSAGES, the
          // input is replaced outright rather than just letting one more
          // send fail, so it's obvious this is a deliberate handoff, not
          // a broken chat.
          <View style={styles.limitRow}>
            <Text style={styles.limitText}>
              We&apos;ve covered a lot here — let&apos;s continue with a real specialist.
            </Text>
            <Button label="Message a UCG Specialist" onPress={messageASpecialist} style={styles.limitButton} />
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about financing, licensing, warranty…"
              placeholderTextColor={Colors.textFaint}
              style={styles.input}
              multiline
              maxLength={AI_CHAT_MAX_MESSAGE_LENGTH}
              blurOnSubmit={false}
              onSubmitEditing={() => sendMessage()}
            />
            <Pressable style={styles.sendButton} onPress={sendMessage} disabled={isSending} hitSlop={8}>
              <SendIcon color="#fff" />
            </Pressable>
          </View>
        )}

        {/* An explicit, always-reachable way to close the keyboard —
            tap-outside-to-dismiss isn't reliable enough on its own to be
            the only way to get back to the buttons below, which sit
            outside this KeyboardAvoidingView and could otherwise end up
            stuck behind an open keyboard with no way to reach them. */}
        <Pressable style={styles.doneRow} onPress={dismissKeyboard} hitSlop={8}>
          <Text style={styles.doneRowText}>Hide Keyboard</Text>
        </Pressable>

        <Pressable style={styles.stuckRow} hitSlop={6} onPress={messageASpecialist}>
          <Text style={styles.stuckText}>Stuck and can&apos;t move forward? Message a UCG specialist  →</Text>
        </Pressable>

        <View style={styles.ctaWrap}>
          <Button
            label={holdButtonLabel}
            variant="secondary"
            style={styles.depositButton}
            icon={<LockIcon color={Colors.navy} />}
            onPress={() => router.push('/deposit')}
          />
          <Text style={styles.ctaCaption}>Refundable — holds the car while we finish your paperwork.</Text>
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
            icon={<ShieldIcon color={Colors.navy} />}
            onPress={() => router.push('/warranty')}
          />
          <Text style={styles.ctaCaption}>Our extended warranty, beyond the 1-year standard coverage.</Text>
          <Button
            label="Insurance — First Month Paid"
            variant="secondary"
            style={styles.depositButton}
            icon={<UmbrellaIcon color={Colors.navy} />}
            onPress={() => router.push('/insurance')}
          />
          <Text style={styles.ctaCaption}>Add a German policy — UCG covers your first month.</Text>
          <Button label="View My Timeline  →" onPress={() => router.push('/(tabs)/deal')} />
        </View>

        <WhatsAppRoutingTestRow />
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
  stuckRow: {
    alignSelf: 'center',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    backgroundColor: Colors.navyTint,
  },
  stuckText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    color: Colors.navy,
  },
  ctaWrap: { paddingHorizontal: Spacing.xxl, paddingTop: 4, paddingBottom: 8, gap: 10 },
  depositButton: { marginBottom: 0 },
  ctaCaption: {
    fontFamily: Fonts.body,
    fontSize: 11.5,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: -4,
  },
  whatsappAvatarWrap: { backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  inAppAvatarWrap: { backgroundColor: Colors.navy, justifyContent: 'center' },
  inAppNote: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginVertical: 16 },
  loginHint: {
    marginHorizontal: Spacing.xxl,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.navyTint,
  },
  loginHintText: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.navy, textAlign: 'center' },
  whatsappSendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentViaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, marginRight: 4, alignSelf: 'flex-end' },
  sentViaText: { fontFamily: Fonts.bodyMedium, fontSize: 10.5, color: Colors.textFaint },
  limitRow: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  limitText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19 },
  limitButton: { marginBottom: 0 },
  testingRow: {
    marginHorizontal: Spacing.xxl,
    marginTop: 10,
    marginBottom: 4,
    padding: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C9CDD9',
  },
  testingLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9.5,
    color: Colors.textFaint,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  testingChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  testingChip: {
    paddingHorizontal: 9,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testingChipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  testingChipText: { fontFamily: Fonts.bodySemibold, fontSize: 10.5, color: Colors.textMuted },
  testingChipTextActive: { color: '#fff' },
});

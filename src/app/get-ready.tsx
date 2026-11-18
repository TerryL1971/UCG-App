import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WhatsAppIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { baseName } from '@/constants/bases';
import { DEALERSHIPS, normalizeWhatsapp, SALESPEOPLE } from '@/constants/salespeople';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { openUrlWithFeedback } from '@/lib/linking';
import { messageWhatsapp } from '@/lib/whatsapp';
import { EMPTY_WISH_LIST, loadWishList, saveWishList, wishListMessage, type WishList } from '@/lib/wish-list';

/**
 * Get Ready — before the $300 deposit (Terry, 2026-11-18). In real
 * conversations most of the talking happens before the customer even
 * lands: when they arrive, what they're looking for, how they'll pay. The
 * wish list is saved here (WhatsApp chats can disappear) and sent to the
 * salesperson in one tap. Customers who've already paid their deposit
 * skip all this and go straight to "Start My Car Plan".
 */
const WEBSITE = 'https://www.usedcarguys.net/';

export default function GetReadyScreen() {
  const { user, base } = useAuth();
  const [list, setList] = useState<WishList>(EMPTY_WISH_LIST);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWishList()
      .then(setList)
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof WishList>(key: K, value: WishList[K]) => setList((l) => ({ ...l, [key]: value }));
  const salespeople = SALESPEOPLE.filter((p) => !p.role || p.role === 'Sales');

  const persist = async (): Promise<boolean> => {
    if (list.arrival.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(list.arrival.trim())) {
      Alert.alert('Check the date', 'Use YYYY-MM-DD for your arrival date, e.g. 2027-08-24.');
      return false;
    }
    setSaving(true);
    try {
      await saveWishList({ ...list, salespersonWhatsapp: normalizeWhatsapp(list.salespersonWhatsapp) ?? '' });
      return true;
    } catch {
      Alert.alert("Couldn't save", 'Check your connection and try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (!(await persist())) return;
    const number = normalizeWhatsapp(list.salespersonWhatsapp);
    messageWhatsapp(number, wishListMessage(list, baseName(base), user?.name ?? null), list.salespersonName || 'your salesperson');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Get Ready" subtitle="Before your $300 deposit" />
      {loading ? (
        <ActivityIndicator color={Colors.navy} style={{ marginTop: 32 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.intro}>
              Tell UCG what you&apos;re looking for. Your wish list is saved here, so it never gets lost in a chat, and
              your salesperson gets it on WhatsApp in one tap.
            </Text>

            <Field
              label="Arriving in Germany (YYYY-MM-DD)"
              value={list.arrival}
              onChangeText={(v) => set('arrival', v)}
              placeholder="e.g. 2027-08-24, or leave empty if you're here"
              autoCorrect={false}
            />
            <Pressable onPress={() => router.push('/choose-base')} style={styles.baseRow}>
              <Text style={styles.baseText}>{base ? `Stationed at ${baseName(base)}` : 'Where will you be stationed?'}</Text>
              <Text style={styles.change}>{base ? 'Change' : 'Choose'}</Text>
            </Pressable>

            <Text style={styles.section}>What you&apos;re looking for</Text>
            <Text style={styles.label}>Transmission</Text>
            <Chips
              options={[
                { value: 'automatic', label: 'Automatic' },
                { value: 'manual', label: 'Manual' },
                { value: 'either', label: 'Either' },
              ]}
              value={list.transmission}
              onChange={(v) => set('transmission', v as WishList['transmission'])}
            />
            <Field label="Budget" value={list.budget} onChangeText={(v) => set('budget', v)} placeholder="e.g. around $350/month, or $20,000" />
            <Field
              label="Size / type"
              value={list.size}
              onChangeText={(v) => set('size', v)}
              placeholder="e.g. small SUV, like a VW Tiguan"
            />
            <Field
              label="Must have"
              value={list.needs}
              onChangeText={(v) => set('needs', v)}
              placeholder="e.g. room for a toddler car seat"
            />
            <Text style={styles.label}>Paying</Text>
            <Chips
              options={[
                { value: 'cash', label: 'Myself' },
                { value: 'loan', label: 'With a loan' },
                { value: 'unsure', label: 'Not sure yet' },
              ]}
              value={list.payment}
              onChange={(v) => set('payment', v as WishList['payment'])}
            />
            <Field label="Anything else" value={list.notes} onChangeText={(v) => set('notes', v)} multiline style={{ height: 80 }} />

            <Text style={styles.section}>Who you&apos;re talking to</Text>
            <Text style={styles.label}>UCG location</Text>
            <Chips
              options={DEALERSHIPS.map((d) => ({ value: d, label: d }))}
              value={list.dealership ?? ''}
              onChange={(v) => set('dealership', v)}
            />
            {salespeople.length > 0 && (
              <Chips
                options={salespeople.map((p) => ({ value: p.name, label: `${p.name} · ${p.dealership}` }))}
                value={list.salespersonName}
                onChange={(v) => {
                  const p = salespeople.find((x) => x.name === v);
                  if (p) setList((l) => ({ ...l, salespersonName: p.name, salespersonWhatsapp: p.whatsapp, dealership: p.dealership }));
                }}
              />
            )}
            <Field label="Salesperson's name (if you have one)" value={list.salespersonName} onChangeText={(v) => set('salespersonName', v)} />
            <Field
              label="Their WhatsApp"
              value={list.salespersonWhatsapp}
              onChangeText={(v) => set('salespersonWhatsapp', v)}
              keyboardType="phone-pad"
              placeholder="Leave empty to send to UCG"
            />

            <Pressable style={({ pressed }) => [styles.send, pressed && { opacity: 0.85 }]} onPress={send} disabled={saving}>
              <WhatsAppIcon size={18} color="#fff" />
              <Text style={styles.sendLabel}>{saving ? 'Saving…' : 'Save & Send My Wish List'}</Text>
            </Pressable>
            <Text
              style={styles.link}
              onPress={async () => {
                if (await persist()) Alert.alert('Saved', 'Your wish list is saved.');
              }}>
              Just save it for now
            </Text>

            <View style={styles.next}>
              <Text style={styles.nextTitle}>Found your car?</Text>
              <Text style={styles.nextBody}>
                Reserve it on the UCG website with a $300 deposit (under the pictures: “Reserve this car”), or with your
                salesperson. Then start your car plan here.
              </Text>
              <Button label="Browse UCG's Cars" variant="secondary" onPress={() => openUrlWithFeedback(WEBSITE)} />
              <Button label="I've Paid My Deposit: Start My Car Plan" onPress={() => router.push('/deal-setup')} />
              <Text style={styles.link} onPress={() => router.push('/good-to-know')}>
                Questions? See Good to Know
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 19, marginBottom: 16 },
  section: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text, marginTop: Spacing.md, marginBottom: 10 },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  baseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
  },
  baseText: { fontFamily: Fonts.bodySemibold, fontSize: 14, color: Colors.text },
  change: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.red },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.text },
  chipLabelActive: { color: '#fff' },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#25D366',
    borderRadius: Radius.lg,
    minHeight: 54,
    marginTop: 8,
  },
  sendLabel: { fontFamily: Fonts.displaySemibold, fontSize: 18, color: '#fff' },
  link: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.navy,
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 12,
  },
  next: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, gap: 10, marginTop: Spacing.xl },
  nextTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  nextBody: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 19 },
});

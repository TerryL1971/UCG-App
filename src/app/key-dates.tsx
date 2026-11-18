import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeadlineBanner } from '@/components/deal-ui';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { addDays, currentDeadline, formatDate, parseDate, vehicleLabel } from '@/lib/deal-flow';
import { updateDealDates } from '@/lib/deals';
import { useMyDeals } from '@/lib/my-deals-context';

/**
 * Every date that matters for the customer's cars — like the Boris PCS
 * app's "Document Dates", for the car. Deadlines from the plan show
 * automatically; registration expiry, the 550-175B issue date and the
 * USAREUR license expiry are entered here. The app reminds the customer
 * before each one (lib/reminders.ts).
 */
export default function KeyDatesScreen() {
  const { deals, refresh } = useMyDeals();
  const { licenseExpires, setLicenseExpires } = useAuth();

  const saveDealDate = async (dealId: string, field: 'registration_expires' | 'ae550b_issued', value: string | null) => {
    const result = await updateDealDates(dealId, { [field]: value });
    if (!result.ok) {
      Alert.alert("Couldn't save", 'Check your connection and try again.');
      return false;
    }
    await refresh();
    return true;
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Key Dates" subtitle="With reminders before each one" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.car}>You</Text>
          <DateField
            label="USAREUR driver's license expires"
            value={licenseExpires}
            hint="Reminders 30 and 7 days before."
            onSave={async (v) => !(await setLicenseExpires(v)).error}
          />
        </View>

        {deals.length === 0 ? (
          <Text style={styles.note}>Start your car plan on My Deal and its deadlines will show up here too.</Text>
        ) : (
          deals.map(({ deal, milestones, files }) => {
            const deadline = currentDeadline(deal, milestones, undefined, files);
            return (
              <View key={deal.id} style={styles.card}>
                <Text style={styles.car}>{vehicleLabel(deal)}</Text>
                <Text style={styles.meta}>
                  Deal #{deal.deal_number} · {deal.kind === 'sale' ? 'Selling to UCG' : 'Buying from UCG'}
                </Text>
                {deadline ? (
                  <View style={{ marginTop: 10 }}>
                    <DeadlineBanner deadline={deadline} />
                  </View>
                ) : (
                  <Text style={styles.none}>No deadline in your plan right now.</Text>
                )}
                {deal.kind === 'purchase' && deal.is_den && (
                  <Text style={styles.line}>
                    Cost Estimate dated {formatDate(parseDate(deal.document_date))} (prices valid until{' '}
                    {formatDate(addDays(parseDate(deal.document_date), 30))}).
                  </Text>
                )}
                {deal.kind === 'purchase' ? (
                  <DateField
                    label="Registration expires"
                    value={deal.registration_expires}
                    hint={'From your TT Doc ("Expires"). Reminders 30 and 7 days before.'}
                    onSave={(v) => saveDealDate(deal.id, 'registration_expires', v)}
                  />
                ) : (
                  <DateField
                    label="AE Form 550-175B issued on"
                    value={deal.ae550b_issued}
                    hint={'"Date issued", top right of the form. It is valid for 90 days.'}
                    onSave={(v) => saveDealDate(deal.id, 'ae550b_issued', v)}
                  />
                )}
              </View>
            );
          })
        )}
        <Text style={styles.note}>
          You get a reminder the day before and on the day of each deadline. Allow notifications when your phone asks.
          German public holidays aren&apos;t counted, so confirm close deadlines with your salesperson.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DateField({
  label,
  value,
  hint,
  onSave,
}: {
  label: string;
  value: string | null | undefined;
  hint: string;
  onSave: (value: string | null) => Promise<boolean>;
}) {
  const [text, setText] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = text.trim() !== (value ?? '');

  const save = async () => {
    const v = text.trim();
    if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(parseDate(v).getTime()))) {
      Alert.alert('Check the date', 'Use YYYY-MM-DD, e.g. 2027-12-12.');
      return;
    }
    setSaving(true);
    await onSave(v || null);
    setSaving(false);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.fieldRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textFaint}
          style={styles.input}
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
        />
        {dirty && (
          <Pressable style={styles.save} onPress={save} disabled={saving}>
            <Text style={styles.saveLabel}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        )}
      </View>
      {value ? <Text style={styles.hint}>{formatDate(parseDate(value))} · {hint}</Text> : <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: Spacing.md },
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg },
  car: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  meta: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  none: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textFaint, marginTop: 10 },
  line: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 10, lineHeight: 18 },
  note: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 18 },
  field: { marginTop: 14 },
  label: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    fontFamily: Fonts.bodySemibold,
    fontSize: 14.5,
    color: Colors.text,
    backgroundColor: '#fff',
  },
  save: { height: 44, paddingHorizontal: 16, borderRadius: Radius.md, backgroundColor: Colors.navy, justifyContent: 'center' },
  saveLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: '#fff' },
  hint: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginTop: 5, lineHeight: 17 },
});

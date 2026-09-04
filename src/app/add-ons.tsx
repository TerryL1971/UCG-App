import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { FINANCE_APPLICATION_URL } from '@/constants/mock-data';
import { computeDealPricing, money } from '@/lib/deal-documents';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';
import { useWarranty } from '@/lib/warranty-context';

/**
 * "A 'Service' button on a bottom row of options, before a final pricing
 * summary" (Terry, docs/deal-flow-roadmap.md) — the combined add-ons hub
 * + running total that doc flagged as "sounds like one screen... nothing
 * built here yet." Four add-ons, each with its own screen: the 2-Year PPP
 * (priced, real accept/decline state), American Auto Nation insurance,
 * Winter Tires, and PPF (the latter three have no in-app price — no
 * dollar figure is invented for them, same rule as Sell It Back's offer).
 * The total below only ever includes what's actually priced.
 */
export default function AddOnsScreen() {
  const { car } = useDeal();
  const { intake } = useDealIntake();
  const { choice: warrantyChoice } = useWarranty();

  const carLabel = car ? `${car.year} ${car.title}` : 'your car';
  const hasPpp = warrantyChoice?.decision === 'accepted';
  const pricing = computeDealPricing(car, hasPpp);

  const pppStatus =
    warrantyChoice?.decision === 'accepted'
      ? `Added — ${money(pricing.pppAmount)}`
      : warrantyChoice?.decision === 'declined'
        ? 'Declined'
        : 'Not decided yet';

  const continueToPayment = () => {
    if (intake?.paymentMethod === 'financing') {
      Linking.openURL(FINANCE_APPLICATION_URL).catch(() => {});
    } else {
      router.push('/wire-instructions');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Add-Ons" subtitle={carLabel} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          Review your add-ons — your total below updates as you decide. Nothing here charges you; it records
          what your salesperson finalizes on your paperwork.
        </Text>

        <AddOnRow
          title="2-Year Premium Protection Plan"
          status={pppStatus}
          statusTone={warrantyChoice?.decision === 'accepted' ? 'green' : warrantyChoice?.decision === 'declined' ? 'muted' : 'amber'}
          onPress={() => router.push('/warranty')}
        />
        <AddOnRow
          title="American Auto Nation Insurance"
          status="Explore"
          statusTone="muted"
          onPress={() => router.push('/insurance')}
        />
        <AddOnRow
          title="Winter Tire Program"
          status="Ask salesperson"
          statusTone="muted"
          onPress={() => router.push('/winter-tires')}
        />
        <AddOnRow
          title="Paint Protection Film"
          status="Ask salesperson"
          statusTone="muted"
          onPress={() => router.push('/paint-protection')}
        />

        <View style={styles.totalsCard}>
          <Text style={styles.totalsTitle}>Price Summary</Text>
          <Row label="Vehicle Price" value={money(pricing.vehiclePrice)} />
          {hasPpp && <Row label="2-Year Premium Protection Plan" value={money(pricing.pppAmount)} />}
          <Row label="Subtotal" value={money(pricing.subtotal)} bold />
          <Row label="Deposit Paid" value={`-${money(pricing.holdAmount)}`} />
          <Row label="Balance Due" value={money(pricing.balanceAfterHold)} bold red />
        </View>
        <Text style={styles.totalsNote}>
          Insurance, Winter Tires, and PPF pricing isn&apos;t included above — your salesperson quotes those
          separately once you ask.
        </Text>

        <Button label="Continue to Payment" onPress={continueToPayment} style={styles.button} />
        <Button
          label="Back to My Deal"
          variant="secondary"
          onPress={() => router.replace('/(tabs)/deal')}
          style={styles.button}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function AddOnRow({
  title,
  status,
  statusTone,
  onPress,
}: {
  title: string;
  status: string;
  statusTone: 'green' | 'amber' | 'muted';
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.addOnRow} onPress={onPress}>
      <Text style={styles.addOnTitle}>{title}</Text>
      <View
        style={[
          styles.statusChip,
          statusTone === 'green' && styles.statusChipGreen,
          statusTone === 'amber' && styles.statusChipAmber,
        ]}>
        <Text
          style={[
            styles.statusChipText,
            statusTone === 'green' && styles.statusChipTextGreen,
            statusTone === 'amber' && styles.statusChipTextAmber,
          ]}>
          {status}
        </Text>
      </View>
    </Pressable>
  );
}

function Row({ label, value, bold, red }: { label: string; value: string; bold?: boolean; red?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold, red && styles.rowValueRed]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xl, paddingTop: 4 },
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20, marginTop: 4, marginBottom: 14 },
  addOnRow: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    ...Shadow.card,
  },
  addOnTitle: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusChipGreen: { backgroundColor: Colors.greenTint, borderColor: Colors.greenTint },
  statusChipAmber: { backgroundColor: Colors.amberTint, borderColor: Colors.amberTint },
  statusChipText: { fontFamily: Fonts.bodySemibold, fontSize: 11.5, color: Colors.textMuted },
  statusChipTextGreen: { color: Colors.green },
  statusChipTextAmber: { color: Colors.amber },
  totalsCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    marginTop: 8,
  },
  totalsTitle: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.navy, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },
  rowLabelBold: { fontFamily: Fonts.bodyBold, color: Colors.text },
  rowValue: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.text },
  rowValueBold: { fontFamily: Fonts.display, fontSize: 15 },
  rowValueRed: { color: Colors.red },
  totalsNote: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textFaint, lineHeight: 16, marginTop: 8 },
  button: { marginTop: 14 },
});

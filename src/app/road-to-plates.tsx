import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { baseName } from '@/constants/bases';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { computeSteps, flowOf, vehicleLabel, waitingOnLabel, type FlowStep } from '@/lib/deal-flow';
import { useAuth } from '@/lib/auth-context';
import { useMyDeals } from '@/lib/my-deals-context';

/**
 * Every step of the customer's deal, explained in one list — the same
 * step definitions My Deal tracks live (lib/deal-flow.ts), so the
 * explainer and the tracker can never disagree.
 */
export default function RoadToPlatesScreen() {
  const { selected } = useMyDeals();
  const { base } = useAuth();

  if (!selected) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScreenHeader title="Every Step" />
        <Text style={styles.note}>Start your car plan on My Deal to see its steps.</Text>
      </SafeAreaView>
    );
  }

  const { deal, milestones, files } = selected;
  const flow = flowOf(deal);
  const steps = computeSteps(deal, milestones, files, base);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={flow === 'sale' ? 'Selling Your Car' : 'Your Road to Plates'} subtitle={`${vehicleLabel(deal)}${base ? ` · ${baseName(base)}` : ''}`} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          {flow === 'purchase_den'
            ? 'This car has never been on the USAREUR system, so it goes through the VAT form process on the way to plates.'
            : flow === 'sale'
              ? 'Everything that happens between signing your Bill of Sale and getting paid.'
              : 'Everything that happens between your deposit and driving away with plates on.'}
        </Text>

        <View>
          {steps.map((step, i) => (
            <StepRow key={step.id} step={step} index={i} isLast={i === steps.length - 1} />
          ))}
        </View>

        {flow !== 'sale' && (
          <Pressable style={[styles.linkCard, Shadow.card]} onPress={() => router.push('/vro-checklist')}>
            <Text style={styles.linkTitle}>Exactly what to bring to the VRO  →</Text>
            <Text style={styles.linkSubtitle}>What UCG puts in your packet, and what you bring yourself.</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StepRow({ step, index, isLast }: { step: FlowStep; index: number; isLast: boolean }) {
  const done = step.status === 'done';
  const current = step.status === 'current';
  return (
    <View style={styles.stepRow}>
      <View style={styles.markerCol}>
        <View style={[styles.circle, done && styles.circleDone, current && styles.circleCurrent]}>
          {done ? <CheckIcon size={14} color="#fff" /> : <Text style={styles.number}>{index + 1}</Text>}
        </View>
        {!isLast && <View style={styles.connector} />}
      </View>
      <View style={styles.stepCard}>
        <View style={styles.headRow}>
          <Text style={[styles.stepTitle, done && { color: Colors.textMuted }]}>{step.title}</Text>
          <View style={[styles.chip, done && styles.chipDone]}>
            <Text style={[styles.chipText, done && styles.chipTextDone]}>{done ? 'Done' : waitingOnLabel[step.waitingOn]}</Text>
          </View>
        </View>
        <Text style={styles.detail}>{step.explainer}</Text>
        {step.baseNote && <Text style={styles.baseNote}>{step.baseNote}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  note: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center', margin: Spacing.xxl },
  body: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xl, paddingTop: 4, gap: 18 },
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20, marginTop: 4 },
  stepRow: { flexDirection: 'row', gap: 12 },
  markerCol: { alignItems: 'center', width: 28 },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: Colors.green },
  circleCurrent: { backgroundColor: Colors.red },
  number: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: '#fff' },
  connector: { flex: 1, width: 2, backgroundColor: Colors.border, marginVertical: 2, minHeight: 20 },
  stepCard: { flex: 1, paddingBottom: 18 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  stepTitle: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 14.5, color: Colors.text },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: Colors.redTint },
  chipDone: { backgroundColor: Colors.greenTint },
  chipText: { fontFamily: Fonts.bodyBold, fontSize: 10.5, color: Colors.red },
  chipTextDone: { color: Colors.green },
  detail: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 18, marginTop: 4 },
  baseNote: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.navy, lineHeight: 17, marginTop: 6 },
  linkCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14 },
  linkTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.navy },
  linkSubtitle: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});

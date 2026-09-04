import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { waitingOnLabel } from '@/constants/mock-data';
import { roadToPlatesDe, roadToPlatesDen, type RoadStep } from '@/constants/road-to-plates';
import { isDenStock } from '@/constants/vro-checklists';
import { useDeal } from '@/lib/deal-context';

/**
 * "What happens after I pay" — the gap flagged directly against the deal
 * flyer/roadmap: customs → TÜV → VAT/VRO → plates, personalized to
 * DEN vs DE (see docs/purchase-paperwork.md and end-to-end-flow.md
 * Phases 7-9). A narrative walk-through, not a live tracker — every step
 * here is done by UCG or a German office, not tapped through in the app
 * (still `GAP` per end-to-end-flow.md), so there's nothing interactive
 * except the link out to the real VRO checklist at the end.
 */
export default function RoadToPlatesScreen() {
  const { car } = useDeal();
  const carLabel = car ? `${car.year} ${car.title}` : 'your car';
  const isDen = isDenStock(car?.stockNumber);
  const steps = isDen ? roadToPlatesDen : roadToPlatesDe;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Your Road to Plates" subtitle={carLabel} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          {isDen
            ? 'This EU-spec car has never been on the USAREUR system, so it goes through the VAT Form process on the way to plates.'
            : 'Here’s everything that happens between paying for your car and driving it away with plates on it.'}
        </Text>

        <View style={styles.list}>
          {steps.map((step, i) => (
            <StepRow key={step.id} step={step} index={i} isLast={i === steps.length - 1} />
          ))}
        </View>

        <Pressable style={styles.linkCard} onPress={() => router.push('/vro-checklist')}>
          <Text style={styles.linkTitle}>Exactly what to bring to the VRO  →</Text>
          <Text style={styles.linkSubtitle}>The full UCG-provides / you-bring packet, for your base.</Text>
        </Pressable>

        <Text style={styles.footNote}>
          Besides the VRO visit itself, every step above is handled by UCG or a German office — nothing here to
          tap through, just what to expect and roughly the order it happens in. Your salesperson can tell you
          exactly where you are in it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepRow({ step, index, isLast }: { step: RoadStep; index: number; isLast: boolean }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepMarkerCol}>
        <View style={styles.stepCircle}>
          <Text style={styles.stepNumber}>{index + 1}</Text>
        </View>
        {!isLast && <View style={styles.stepConnector} />}
      </View>
      <View style={styles.stepCard}>
        <View style={styles.stepHeadRow}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <View style={styles.waitingChip}>
            <Text style={styles.waitingChipText}>{waitingOnLabel[step.waitingOn]}</Text>
          </View>
        </View>
        <Text style={styles.stepDetail}>{step.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xl, paddingTop: 4 },
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20, marginTop: 4, marginBottom: 18 },
  list: { gap: 0 },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepMarkerCol: { alignItems: 'center', width: 28 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: '#fff' },
  stepConnector: { flex: 1, width: 2, backgroundColor: Colors.border, marginVertical: 2, minHeight: 20 },
  stepCard: { flex: 1, paddingBottom: 18 },
  stepHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  stepTitle: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 14.5, color: Colors.text },
  waitingChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.redTint,
  },
  waitingChipText: { fontFamily: Fonts.bodyBold, fontSize: 10.5, color: Colors.red },
  stepDetail: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 18, marginTop: 4 },
  linkCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 6,
    ...Shadow.card,
  },
  linkTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.navy },
  linkSubtitle: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  footNote: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textFaint, lineHeight: 17, marginTop: 18 },
});

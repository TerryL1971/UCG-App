import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { UmbrellaIcon } from '@/components/icons';
import { americanAutoNation as AAN } from '@/constants/american-auto-nation';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { toIsoDate, vehicleLabel } from '@/lib/deal-flow';
import { setMilestone, type Deal } from '@/lib/deals';
import { messageSalesperson } from '@/lib/whatsapp';

/**
 * American Auto Nation — UCG's own insurance — as a major suggestion
 * (Terry, 2026-11-17): the customer starts insurance as soon as they send
 * the wire or their loan is complete, and the VRO won't register the car
 * without it. Shown from the payment step until the "Insure Your Car"
 * roadmap step is done ("I already have insurance" ticks it).
 */

/** Steps where insurance should be front and centre: from paying until
 * the car is registered. */
export const INSURANCE_STEPS = ['payment', 'vat_office', 'paid', 'insurance', 'customs_office', 'zollamt', 'tuv', 'registration'];

export function requestAanQuote(deal: Deal | null | undefined) {
  const car = deal ? `my ${vehicleLabel(deal)} (VIN ${deal.vin})` : 'my car';
  return messageSalesperson(deal, `I'd like an American Auto Nation insurance quote for ${car}, starting as soon as possible.`);
}

export function InsurancePrompt({ deal, userId, onChanged }: { deal: Deal; userId: string; onChanged?: () => void }) {
  const markInsured = async () => {
    try {
      await setMilestone(deal.id, 'insured', true, userId, toIsoDate(new Date()));
      onChanged?.();
    } catch {
      Alert.alert("Couldn't save that", 'Check your connection and try again.');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <UmbrellaIcon size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Next: insure your car</Text>
          <Text style={styles.title}>Start your insurance now</Text>
        </View>
      </View>
      <Text style={styles.body}>
        Start your insurance as soon as you send your wire or your loan is complete. The VRO won&apos;t register your car
        until your insurance company sends it proof of insurance. {AAN.name} is UCG&apos;s own insurance for USAREUR
        drivers, and{' '}
        <Text style={styles.bold}>your first month&apos;s premium is on us</Text>.
      </Text>
      <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]} onPress={() => requestAanQuote(deal)}>
        <Text style={styles.primaryLabel}>Get My {AAN.name} Quote</Text>
      </Pressable>
      <View style={styles.links}>
        <Text style={styles.link} onPress={() => router.push('/insurance')}>
          About {AAN.name}
        </Text>
        <Text style={styles.linkMuted} onPress={markInsured}>
          I already have insurance
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.navy, borderRadius: Radius.lg, padding: 16, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontFamily: Fonts.bodyBold, fontSize: 11, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontFamily: Fonts.display, fontSize: 21, color: '#fff' },
  body: { fontFamily: Fonts.body, fontSize: 13.5, color: 'rgba(255,255,255,0.92)', lineHeight: 20 },
  bold: { fontFamily: Fonts.bodyBold, color: '#fff' },
  primary: { backgroundColor: Colors.red, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  primaryLabel: { fontFamily: Fonts.displaySemibold, fontSize: 18, color: '#fff' },
  links: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  link: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: '#fff', textDecorationLine: 'underline' },
  linkMuted: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: 'rgba(255,255,255,0.65)', textDecorationLine: 'underline' },
});

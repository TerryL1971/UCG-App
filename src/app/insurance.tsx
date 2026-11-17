import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { americanAutoNation as AAN } from '@/constants/american-auto-nation';
import { baseName } from '@/constants/bases';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { vehicleLabel } from '@/lib/deal-flow';
import { openUrlWithFeedback } from '@/lib/linking';
import { useMyDeals } from '@/lib/my-deals-context';
import { messageSalesperson } from '@/lib/whatsapp';

/**
 * American Auto Nation — UCG's own car insurance (Terry, 2026-11-17: "Add
 * American Auto Nation car insurance as UCG owns it"). There's no quoting
 * API, so "Request a Quote" goes to the salesperson on WhatsApp with the
 * car and base filled in, as the flyer says ("through your sales person").
 */
export default function InsuranceScreen() {
  const { selected } = useMyDeals();
  const { base } = useAuth();
  const deal = selected?.deal;

  const requestQuote = () => {
    const car = deal ? `my ${vehicleLabel(deal)} (VIN ${deal.vin})` : 'my car';
    const where = baseName(base) ? `, stationed at ${baseName(base)}` : '';
    messageSalesperson(deal, `I'd like an American Auto Nation insurance quote for ${car}${where}.`);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={AAN.name} subtitle="Used Car Guys' own insurance" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.offerCard}>
          <Text style={styles.offerKicker}>The offer</Text>
          <Text style={styles.offerHead}>{AAN.firstMonthOffer.headline}</Text>
          <Text style={styles.offerBody}>{AAN.firstMonthOffer.body}</Text>
        </View>

        <Text style={styles.tagline}>{AAN.tagline}.</Text>
        <View style={{ gap: 8 }}>
          {AAN.points.map((p) => (
            <View key={p} style={styles.pointRow}>
              <CheckCircleIcon size={15} color={Colors.green} />
              <Text style={styles.pointText}>{p}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.why}>
          You need a German insurance card (eVB) to register your car anyway, and the policyholder has to be at the
          registration office in person, so it&apos;s worth sorting early.
        </Text>

        <Button label="Request a Quote on WhatsApp" onPress={requestQuote} />
        <Button
          label="Visit americanautonation.com"
          variant="secondary"
          onPress={() => openUrlWithFeedback(AAN.url, "Couldn't open that site. Check your connection and try again.")}
        />
        <Text style={styles.terms}>{AAN.firstMonthOffer.terms}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: 16 },
  offerCard: { backgroundColor: Colors.navy, borderRadius: Radius.lg, padding: 16 },
  offerKicker: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
  },
  offerHead: { fontFamily: Fonts.display, fontSize: 24, color: '#fff', marginTop: 4, lineHeight: 26 },
  offerBody: { fontFamily: Fonts.body, fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 20, marginTop: 8 },
  tagline: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.text, lineHeight: 22 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pointText: { fontFamily: Fonts.bodySemibold, fontSize: 14, color: Colors.text },
  why: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, lineHeight: 19 },
  terms: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textFaint, lineHeight: 16 },
});

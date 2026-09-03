import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { americanAutoNation as AAN } from '@/constants/american-auto-nation';
import { SUPPORT_WHATSAPP, whatsappChatUrl } from '@/constants/mock-data';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';

/**
 * American Auto Nation — UCG's own insurance. Pushed deliberately (see
 * src/constants/american-auto-nation.ts): it was the owner's late
 * brother's company. There's no quoting API, so "Request a Quote" is a
 * WhatsApp handoff to UCG carrying the car + base, the way the flyer
 * describes ("through your sales person").
 */
export default function InsuranceScreen() {
  const { car } = useDeal();
  const { intake } = useDealIntake();
  const carLabel = car ? `${car.year} ${car.title}` : 'my car';

  const requestQuote = () => {
    const msg = `Hi UCG — I'd like an American Auto Nation insurance quote for ${carLabel}${
      intake?.base ? `, headed to ${intake.base}` : ''
    }.`;
    Linking.openURL(whatsappChatUrl(SUPPORT_WHATSAPP, msg)).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={AAN.name} subtitle="Used Car Guys’ own insurance" />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.offerCard}>
          <Text style={styles.offerKicker}>The offer</Text>
          <Text style={styles.offerHead}>{AAN.firstMonthOffer.headline}</Text>
          <Text style={styles.offerBody}>{AAN.firstMonthOffer.body}</Text>
        </View>

        <Text style={styles.tagline}>{AAN.tagline}.</Text>
        <View style={styles.points}>
          {AAN.points.map((p) => (
            <View key={p} style={styles.pointRow}>
              <CheckCircleIcon size={15} color={Colors.green} />
              <Text style={styles.pointText}>{p}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.whyText}>
          You&apos;ll need a German insurance card to register the car anyway &mdash; the policyholder is listed as
          an owner and has to be at the registration office in person, so it&apos;s worth sorting early.
        </Text>

        <View style={styles.actions}>
          <Button label="Request a Quote" onPress={requestQuote} />
          <Button
            label="Visit americanautonation.com"
            variant="secondary"
            style={styles.secondaryBtn}
            onPress={() => Linking.openURL(AAN.url).catch(() => {})}
          />
          <Pressable style={styles.skipRow} onPress={() => router.back()} hitSlop={6}>
            <Text style={styles.skipText}>Not now</Text>
          </Pressable>
        </View>

        <Text style={styles.terms}>{AAN.firstMonthOffer.terms}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, paddingHorizontal: Spacing.xxl },
  bodyContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xxl, gap: 16 },

  offerCard: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    padding: 16,
  },
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
  points: { gap: 8 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pointText: { fontFamily: Fonts.bodySemibold, fontSize: 13.5, color: Colors.textMuted },

  whyText: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 18 },

  actions: { gap: 10 },
  secondaryBtn: { marginBottom: 0 },
  skipRow: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14 },
  skipText: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted },

  terms: { fontFamily: Fonts.body, fontSize: 10.5, color: Colors.textFaint, lineHeight: 15 },
});

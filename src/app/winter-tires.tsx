import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckCircleIcon, ShieldIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { SUPPORT_WHATSAPP, whatsappChatUrl } from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';

/**
 * One of the two add-ons flagged as empty rows (docs/deal-flow-roadmap.md's
 * "Add-on upsells: Service (winter tires), PPF — content pending"). Still
 * no flyer/pricing from Terry, so — same rule as Sell It Back's offer
 * price — no dollar figure is invented here. What IS real and worth
 * building now: Germany's winter-tire rule is a documented legal fact
 * (StVO §2(3a)), not a UCG sales pitch, so that part of the screen doesn't
 * have to wait on a flyer. Pricing stays "ask your salesperson" until one
 * exists.
 */
export default function WinterTiresScreen() {
  const { car } = useDeal();
  const carLabel = car ? `${car.year} ${car.title}` : 'your car';

  const askAboutTires = () => {
    const msg = `Hi UCG — I'd like to ask about the Winter Tire Program for ${carLabel}.`;
    Linking.openURL(whatsappChatUrl(SUPPORT_WHATSAPP, msg)).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Winter Tire Program" subtitle={carLabel} onBack={() => router.back()} />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.legalCard}>
          <View style={styles.legalHead}>
            <ShieldIcon size={17} color={Colors.navy} />
            <Text style={styles.legalTitle}>Germany&apos;s winter-tire rule</Text>
          </View>
          <Text style={styles.legalIntro}>
            This isn&apos;t a fixed calendar rule (&ldquo;October–Easter&rdquo; is a common myth) — it&apos;s{' '}
            <Text style={styles.bold}>situational</Text>, under §2(3a) of the Straßenverkehrs-Ordnung (StVO):
          </Text>
          {[
            'Required whenever conditions call for it — ice, packed or loose snow, slush, frost, or black ice — any time of year those conditions occur.',
            'Tires must carry the M+S marking, or for tires made 2018 onward, the Alpine (3-peak-mountain-snowflake) symbol.',
            'Driving on the wrong tires in those conditions risks a fine (roughly €60, more if you obstruct traffic) and a point in Flensburg.',
            'Applies to any car registered and driven in Germany — including a car bought through UCG.',
          ].map((p) => (
            <View key={p} style={styles.legalRow}>
              <CheckCircleIcon size={14} color={Colors.navy} />
              <Text style={styles.legalText}>{p}</Text>
            </View>
          ))}
          <Text style={styles.legalDisclaimer}>
            General information about German traffic law, not legal advice — conditions and fine amounts can
            change. When in doubt, confirm with your salesperson or a German insurer.
          </Text>
        </View>

        <View style={styles.programCard}>
          <Text style={styles.programTitle}>UCG&apos;s Winter Tire Program</Text>
          <Text style={styles.programText}>
            We&apos;re finalizing the flyer for this program. Current pricing and what&apos;s included come from
            your salesperson — tap below and we&apos;ll get you the details.
          </Text>
          <Button label="Ask About Winter Tires" onPress={askAboutTires} style={styles.programBtn} />
        </View>

        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Back to Add-Ons</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, paddingHorizontal: Spacing.xxl },
  bodyContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xxl, gap: 14 },
  legalCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  legalHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legalTitle: { fontFamily: Fonts.bodyBold, fontSize: 14.5, color: Colors.navy },
  legalIntro: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 18, marginTop: 2 },
  bold: { fontFamily: Fonts.bodyBold },
  legalRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  legalText: { flex: 1, fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 18 },
  legalDisclaimer: {
    fontFamily: Fonts.body,
    fontSize: 10.5,
    color: Colors.textFaint,
    lineHeight: 15,
    marginTop: 4,
  },
  programCard: {
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 6,
  },
  programTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.navy },
  programText: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 18 },
  programBtn: { marginTop: 8 },
  backLink: { alignSelf: 'center', padding: 8 },
  backLinkText: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted },
});

import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { SUPPORT_WHATSAPP, whatsappChatUrl } from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';

/**
 * The other add-on flagged as an empty row (docs/deal-flow-roadmap.md's
 * "Add-on upsells: Service (winter tires), PPF — content pending"). Unlike
 * winter tires, there's no independent legal fact to build around here —
 * just generic, widely-known information about what paint protection film
 * is, kept deliberately non-specific about UCG's exact product/warranty
 * terms since no flyer exists yet to source those from. Pricing is
 * "ask your salesperson" until one does.
 */
export default function PaintProtectionScreen() {
  const { car } = useDeal();
  const carLabel = car ? `${car.year} ${car.title}` : 'your car';

  const askAboutPpf = () => {
    const msg = `Hi UCG — I'd like to ask about Paint Protection Film (PPF) for ${carLabel}.`;
    Linking.openURL(whatsappChatUrl(SUPPORT_WHATSAPP, msg)).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Paint Protection Film" subtitle={carLabel} onBack={() => router.back()} />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What PPF is</Text>
          <Text style={styles.infoIntro}>
            Paint protection film (PPF) is a clear, durable film applied over painted panels to help guard the
            factory paint against everyday wear:
          </Text>
          {[
            'Rock chips and road debris on the highway',
            'Minor scuffs and light scratches',
            'Bug splatter and bird droppings sitting on paint',
            'General UV fading over time',
          ].map((p) => (
            <View key={p} style={styles.infoRow}>
              <CheckCircleIcon size={14} color={Colors.navy} />
              <Text style={styles.infoText}>{p}</Text>
            </View>
          ))}
          <Text style={styles.infoDisclaimer}>
            Coverage area, film brand, and warranty depend on the specific package UCG offers — none of that is
            published yet, so ask your salesperson for the current option before assuming what&apos;s included.
          </Text>
        </View>

        <View style={styles.programCard}>
          <Text style={styles.programTitle}>UCG&apos;s PPF Option</Text>
          <Text style={styles.programText}>
            We&apos;re finalizing the flyer for this add-on. Current pricing and what&apos;s covered come from
            your salesperson — tap below and we&apos;ll get you the details.
          </Text>
          <Button label="Ask About PPF" onPress={askAboutPpf} style={styles.programBtn} />
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
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  infoTitle: { fontFamily: Fonts.bodyBold, fontSize: 14.5, color: Colors.navy },
  infoIntro: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 18 },
  infoRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  infoText: { flex: 1, fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 18 },
  infoDisclaimer: {
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

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckCircleIcon, ShieldIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  oneYearWarranty,
  pppEligibility,
  premiumProtectionPlan,
  warrantyDeclineReasons,
  type WarrantyTier,
} from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';
import { useWarranty, type WarrantyChoice } from '@/lib/warranty-context';

/**
 * The 2-Year Premium Protection Plan upsell — an explicit accept/decline,
 * not just a link to read about it (docs/deal-flow-roadmap.md). A decline
 * captures *why*: that's what the salesperson acts on, and what decides
 * whether the American Auto Nation insurance handoff (a separate,
 * not-yet-built step) makes sense for this customer.
 *
 * Accepting records the choice for the salesperson — it does NOT charge
 * the $999. Same "honest stand-in, no fake transaction" approach as the
 * rest of the app; the actual add happens on the back-office side.
 */
export default function WarrantyScreen() {
  const { car } = useDeal();
  const { choice, setChoice, clearChoice } = useWarranty();
  const carLabel = car ? `${car.year} ${car.title}` : 'your car';
  const eligibility = pppEligibility(car);

  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const record = (next: WarrantyChoice) => {
    setChoice(next);
    setDeclining(false);
  };

  const accept = () => record({ decision: 'accepted', decidedAt: new Date().toISOString() });

  const submitDecline = () => {
    record({
      decision: 'declined',
      declineReason: reason ?? undefined,
      declineNote: note.trim() || undefined,
      decidedAt: new Date().toISOString(),
    });
  };

  // Already decided — show the recap and let them change it.
  if (choice && !declining) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Premium Protection" subtitle={carLabel} />
        <View style={styles.recapBody}>
          <CheckCircleIcon size={52} color={choice.decision === 'accepted' ? Colors.green : Colors.textMuted} />
          <Text style={styles.recapTitle}>
            {choice.decision === 'accepted'
              ? 'Added — 2-Year Premium Protection Plan'
              : 'No 2-year plan added'}
          </Text>
          <Text style={styles.recapText}>
            {choice.decision === 'accepted'
              ? 'Your salesperson will add the $999 plan to your paperwork — nothing has been charged yet. Your car still has the 1-year comprehensive warranty included as standard.'
              : `Noted for your salesperson${choice.declineReason ? ` — reason: ${choice.declineReason}` : ''}. Your 1-year comprehensive warranty is still included as standard.`}
          </Text>
          {choice.decision === 'declined' && choice.declineNote ? (
            <Text style={styles.recapNote}>&ldquo;{choice.declineNote}&rdquo;</Text>
          ) : null}
          <Button label="Change My Answer" variant="secondary" style={styles.recapBtn} onPress={clearChoice} />
          <Button label="Back to My Deal" style={styles.recapBtn} onPress={() => router.replace('/(tabs)/deal')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Premium Protection" subtitle={carLabel} />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View
          style={[
            styles.eligBanner,
            eligibility === 'eligible' && styles.eligBannerYes,
            eligibility === 'ineligible' && styles.eligBannerNo,
          ]}>
          <ShieldIcon size={18} color={eligibility === 'eligible' ? Colors.green : Colors.navy} />
          <Text style={styles.eligText}>
            {eligibility === 'eligible' &&
              'This vehicle is eligible for the 2-Year Premium Protection Plan.'}
            {eligibility === 'ineligible' &&
              'This vehicle isn’t eligible for the 2-year plan — it needs to be newer than 2019 and under 70,000 miles. The 1-year comprehensive warranty is included either way.'}
            {eligibility === 'unknown' &&
              'We can’t confirm 2-year eligibility from the listing (it needs to be newer than 2019 and under 70,000 miles). Your salesperson will check — you can still register your interest below.'}
          </Text>
        </View>

        <TierCard tier={premiumProtectionPlan} featured />
        <TierCard tier={oneYearWarranty} />

        <Text style={styles.finePrint}>
          Coverage is subject to the full warranty certificate provided at delivery. Wear-and-tear items and fluids
          are excluded. Claim limits are per the coverage period.
        </Text>

        {declining ? (
          <View style={styles.declineBox}>
            <Text style={styles.declineTitle}>No problem — mind sharing why?</Text>
            <Text style={styles.declineSub}>
              It helps your salesperson know how to help — and whether an insurance option might be a better fit.
            </Text>
            <View style={styles.chipRow}>
              {warrantyDeclineReasons.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  style={[styles.chip, reason === r && styles.chipActive]}>
                  <Text style={[styles.chipLabel, reason === r && styles.chipLabelActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Anything else? (optional)"
              placeholderTextColor={Colors.textFaint}
              multiline
              style={styles.noteInput}
            />
            <Button label="Submit" onPress={submitDecline} />
            <Pressable style={styles.backLink} onPress={() => setDeclining(false)}>
              <Text style={styles.backLinkText}>Back</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actions}>
            {eligibility !== 'ineligible' && (
              <Button
                label={eligibility === 'unknown' ? 'Yes, I’m Interested' : 'Add the 2-Year Plan — $999'}
                onPress={accept}
              />
            )}
            <Button
              label={eligibility === 'ineligible' ? 'OK, Got It' : 'No Thanks'}
              variant="secondary"
              onPress={() => (eligibility === 'ineligible' ? router.back() : setDeclining(true))}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TierCard({ tier, featured }: { tier: WarrantyTier; featured?: boolean }) {
  return (
    <View style={[styles.tierCard, featured && styles.tierCardFeatured]}>
      <View style={styles.tierHead}>
        <Text style={[styles.tierName, featured && styles.tierNameFeatured]}>{tier.name}</Text>
        {featured && (
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>BEST COVERAGE</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tierPrice, featured && styles.tierPriceFeatured]}>{tier.price}</Text>

      {tier.highlights.map((h) => (
        <View key={h} style={styles.bulletRow}>
          <CheckCircleIcon size={14} color={featured ? Colors.green : Colors.navy} />
          <Text style={styles.bulletText}>{h}</Text>
        </View>
      ))}

      <View style={styles.specRows}>
        <SpecRow label="Coverage" value={tier.coverage} />
        <SpecRow label="Deductible" value={tier.deductible} />
        <SpecRow label="Rental car" value={tier.rentalCar} />
        <SpecRow label="Max claim" value={tier.maxClaim} />
      </View>
    </View>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, paddingHorizontal: Spacing.xxl },
  bodyContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xxl, gap: 14 },

  eligBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.lg,
    padding: 12,
  },
  eligBannerYes: { backgroundColor: Colors.greenTint },
  eligBannerNo: { backgroundColor: Colors.bg, borderWidth: 1.5, borderColor: Colors.border },
  eligText: { flex: 1, fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 18 },

  tierCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  tierCardFeatured: { borderColor: Colors.red, borderWidth: 2 },
  tierHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tierName: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text, flex: 1 },
  tierNameFeatured: { color: Colors.navy },
  tierBadge: { backgroundColor: Colors.red, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tierBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 9, color: '#fff', letterSpacing: 0.5 },
  tierPrice: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.textMuted },
  tierPriceFeatured: { color: Colors.red, fontFamily: Fonts.bodyBold },

  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletText: { flex: 1, fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 17 },

  specRows: { marginTop: 4, gap: 6, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  specRow: { gap: 1 },
  specLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10.5,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  specValue: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 17 },

  finePrint: { fontFamily: Fonts.body, fontSize: 10.5, color: Colors.textFaint, lineHeight: 15 },

  actions: { gap: 10, marginTop: 4 },

  declineBox: { gap: 10, marginTop: 4 },
  declineTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text },
  declineSub: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted },
  chipLabelActive: { color: '#fff' },
  noteInput: {
    minHeight: 68,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    padding: 12,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  backLink: { alignSelf: 'center', padding: 8 },
  backLinkText: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted },

  recapBody: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingTop: 28, gap: 8 },
  recapTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text, textAlign: 'center', marginTop: 6 },
  recapText: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  recapNote: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
    color: Colors.text,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },
  recapBtn: { marginTop: 12 },
});

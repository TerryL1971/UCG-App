import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckCircleIcon, MapPinIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  sellBackChecklist,
  vroBaseline,
  vroOfficeForBase,
  type VehicleSpec,
  type VroItem,
} from '@/constants/vro-checklists';
import { baseName } from '@/constants/bases';
import { useAuth } from '@/lib/auth-context';
import { vehicleLabel } from '@/lib/deal-flow';
import { useMyDeals } from '@/lib/my-deals-context';
import { openUrlWithFeedback } from '@/lib/linking';

/**
 * What the customer needs at the Vehicle Registration Office — split into
 * what UCG produces and what they bring themselves. Two modes:
 *  - default: registering a car they're buying (US-spec / EU-spec toggle)
 *  - ?mode=sell: clearing a car they're selling to UCG (form 550-175B)
 * The regulatory content is the USAG Stuttgart baseline
 * (docs/vro-checklists.md); the screen is explicit that other bases have
 * their own quirks the salesperson confirms.
 */
export default function VroChecklistScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const selling = mode === 'sell';
  const { selected } = useMyDeals();
  const deal = selected?.deal;
  const carLabel = deal ? vehicleLabel(deal) : 'your car';
  // The customer's current base (Account → change it after a move).
  const { base: baseId } = useAuth();
  const base = baseName(baseId) ?? undefined;
  const office = vroOfficeForBase(base);

  // A DEN car has never been on the USAREUR system, so it's EU-spec.
  const [spec, setSpec] = useState<VehicleSpec>(deal?.is_den ? 'eu' : 'us');
  const buyChecklist = vroBaseline[spec];

  const ucgProvides = selling ? sellBackChecklist.ucgProvides : buyChecklist.ucgProvides;
  const youBring = selling ? sellBackChecklist.youBring : buyChecklist.youBring;
  const notes = selling ? sellBackChecklist.notes : buyChecklist.warnings;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={selling ? 'Clearing Your Car' : 'Your VRO Packet'} subtitle={carLabel} />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.intro}>
          {selling
            ? 'What you need at the VRO to clear the car out of the USAREUR system when you sell it to UCG. UCG handles the customs side — you bring your own documents.'
            : 'Everything you need to register the car, get USAREUR plates, and get the environmental sticker. UCG puts the packet together — you bring your own documents and go in.'}
        </Text>

        {!selling && (
          <>
            <View style={styles.segRow}>
              <SegOption label="US-spec car" active={spec === 'us'} onPress={() => setSpec('us')} />
              <SegOption label="EU-spec car" active={spec === 'eu'} onPress={() => setSpec('eu')} />
            </View>
            <Text style={styles.segHint}>
              {deal?.is_den
                ? 'Your car has never been on the USAREUR system, so this is an EU-spec car. Your salesperson will confirm.'
                : 'Not sure which? Check your Purchase Order or Cost Estimate — it states this. US-spec usually means a mph speedometer; EU-spec means km/h. Your salesperson knows for certain.'}
            </Text>
            <Text style={styles.segHint}>
              This only changes what&apos;s shown on this screen — it doesn&apos;t change anything on your actual
              deal.
            </Text>
          </>
        )}

        <Section title="UCG handles these" accent={Colors.green}>
          {ucgProvides.map((item) => (
            <ChecklistRow key={item.label} item={item} done />
          ))}
        </Section>

        <Section title="You bring these" accent={Colors.navy}>
          {youBring.map((item) => (
            <ChecklistRow key={item.label} item={item} />
          ))}
        </Section>

        <View style={styles.warnCard}>
          <Text style={styles.warnTitle}>Worth knowing before you go</Text>
          {notes.map((w) => (
            <View key={w} style={styles.warnRow}>
              <Text style={styles.warnDot}>•</Text>
              <Text style={styles.warnText}>{w}</Text>
            </View>
          ))}
        </View>

        <View style={styles.officeCard}>
          <View style={styles.officeHead}>
            <MapPinIcon size={17} color={Colors.navy} />
            <Text style={styles.officeName}>
              {office ? office.name : base ? `${base} Vehicle Registration Office` : 'Your base’s VRO'}
            </Text>
          </View>
          {office ? (
            <>
              <Text style={styles.officeLine}>{office.address}</Text>
              {office.hours ? <Text style={styles.officeLine}>{office.hours}</Text> : null}
              {office.notes?.map((n) => (
                <Text key={n} style={styles.officeLine}>
                  • {n}
                </Text>
              ))}
              {office.email ? (
                <Text style={styles.officeLine} selectable>
                  Email: {office.email}
                </Text>
              ) : null}
              {office.infoUrl ? (
                <Pressable onPress={() => openUrlWithFeedback(office.infoUrl!)}>
                  <Text style={styles.officeLink}>Official VRO page &amp; current checklists  →</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <Text style={styles.officeLine}>
              Your salesperson will give you the office location, hours, and appointment link for your base.
            </Text>
          )}
        </View>

        <Text style={styles.footNote}>
          This follows the regulation every VRO uses ({selling ? 'form 550-175B' : 'AE 190-1'}), written the way
          USAG Stuttgart&apos;s office phrases it.
          {base && base !== 'Stuttgart' ? ` Your base (${base}) may word a few things differently — your salesperson confirms the exact list for you.` : ''}
        </Text>

        {!selling && (
          <Pressable style={styles.roadLink} onPress={() => router.push('/road-to-plates')}>
            <Text style={styles.roadLinkText}>See the whole road to plates, step by step  →</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionBar, { backgroundColor: accent }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRows}>{children}</View>
    </View>
  );
}

function ChecklistRow({ item, done }: { item: VroItem; done?: boolean }) {
  const body = (
    <View style={styles.rowInner}>
      <View style={styles.rowMark}>
        {done ? (
          <CheckCircleIcon size={16} color={Colors.green} />
        ) : (
          <View style={styles.emptyBox} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{item.label}</Text>
        {item.detail ? <Text style={styles.rowDetail}>{item.detail}</Text> : null}
      </View>
    </View>
  );

  return <View style={styles.row}>{body}</View>;
}

function SegOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segOption, active && styles.segOptionActive]}>
      <Text style={[styles.segLabel, active && styles.segLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, paddingHorizontal: Spacing.xxl },
  bodyContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xxl, gap: 14 },

  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20 },

  segRow: { flexDirection: 'row', gap: 8 },
  segOption: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOptionActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  segLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13.5, color: Colors.textMuted },
  segLabelActive: { color: '#fff' },
  segHint: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textFaint, lineHeight: 16, marginTop: -4 },

  section: { paddingLeft: 12, position: 'relative' },
  sectionBar: { position: 'absolute', left: 0, top: 2, bottom: 2, width: 3, borderRadius: 2 },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: Colors.text,
    marginBottom: 8,
  },
  sectionRows: { backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },

  row: { paddingHorizontal: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: Colors.border },
  rowInner: { flexDirection: 'row', gap: 10 },
  rowMark: { width: 18, alignItems: 'center', paddingTop: 1 },
  emptyBox: { width: 15, height: 15, borderRadius: 4, borderWidth: 1.5, borderColor: '#C9CDD9' },
  rowLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13.5, color: Colors.text, lineHeight: 18 },
  rowDetail: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, lineHeight: 16, marginTop: 2 },
  rowLink: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: Colors.red, marginTop: 4 },

  warnCard: { backgroundColor: Colors.navyTint, borderRadius: Radius.lg, padding: 14, gap: 8 },
  warnTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: Colors.navy,
  },
  warnRow: { flexDirection: 'row', gap: 8 },
  warnDot: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.navy, lineHeight: 18 },
  warnText: { flex: 1, fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 18 },

  officeCard: { backgroundColor: '#fff', borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, padding: 14, gap: 5 },
  officeHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  officeName: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 13.5, color: Colors.text },
  officeLine: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 18 },
  officeLink: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.navy, marginTop: 4 },

  footNote: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textFaint, lineHeight: 16 },
  roadLink: { alignSelf: 'flex-start', paddingVertical: 2 },
  roadLinkText: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.red },
});

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, ChevronDownIcon, DownloadIcon, MessageIcon, PhoneIcon, StarIcon } from '@/components/icons';
import { SalespersonAvatarMini } from '@/components/salesperson-avatar';
import { StatusChip } from '@/components/ui/chip';
import { DashedLine, FlowLine, SolidLine, TimelineDot } from '@/components/timeline-dot';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { dealDocuments, dealSteps, financingTerms, salesperson, ucgLocations } from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';

const ROW_HEIGHT = 80;
const CURRENT_ROW_HEIGHT = 132;
const READY_ROW_HEIGHT = 190;
const LAST_ROW_HEIGHT = 70;

// How much extra vertical space each step's expanded detail panel needs,
// so the connecting line down to the next dot still reaches it. These are
// estimates, not measured — tune them if a line visibly falls short or
// overshoots once this is checked on a real device. Kept deliberately a
// little conservative (short) rather than long: a line stopping a bit
// early reads better than one running through the next dot.
const EXPANDED_EXTRA_HEIGHT: Record<string, number> = {
  matched: 74,
  application: 36,
  documents: 158,
  financing: 108,
  contract: 60,
};

/** The camera/share action under "Picked Up" — its own component (not
 * inlined in the steps loop) since it needs its own local state for the
 * captured photo, and hooks can't live directly inside a .map() callback. */
function PickupPhotoAction() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);

  const openLocation = (reviewUrl: string) => {
    setPickingLocation(false);
    Linking.openURL(reviewUrl);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take the pickup photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    setPhoto(result.assets[0].uri);
  };

  const share = async () => {
    if (!photo) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Not available', "Sharing isn't available on this device.");
      return;
    }
    await Sharing.shareAsync(photo);
  };

  return (
    <View style={{ gap: 10 }}>
      {photo ? (
        <View style={styles.pickupCard}>
          <Image source={{ uri: photo }} style={styles.pickupThumb} contentFit="cover" />
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={styles.pickupCaption}>Nice shot — ready to post?</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.pickupSecondaryBtn} onPress={takePhoto}>
                <Text style={styles.pickupSecondaryLabel}>Retake</Text>
              </Pressable>
              <Pressable style={styles.pickupPrimaryBtn} onPress={share}>
                <Text style={styles.pickupPrimaryLabel}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <Pressable style={styles.pickupButton} onPress={takePhoto}>
          <CameraIcon color="#fff" strokeWidth={2.2} />
          <Text style={styles.pickupButtonLabel}>Take Pickup Photo</Text>
        </Pressable>
      )}

      <Pressable style={styles.reviewButton} onPress={() => setPickingLocation(true)}>
        <StarIcon size={16} color={Colors.navy} />
        <Text style={styles.reviewButtonLabel}>Leave a Google Review</Text>
      </Pressable>

      <Modal visible={pickingLocation} transparent animationType="slide" onRequestClose={() => setPickingLocation(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickingLocation(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Which location?</Text>
            <Text style={styles.sheetSubtitle}>UCG has a separate Google listing per lot — pick the right one.</Text>
            {ucgLocations.map((loc) => (
              <Pressable key={loc.name} style={styles.sheetRow} onPress={() => openLocation(loc.reviewUrl)}>
                <Text style={styles.sheetRowLabel}>{loc.name}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.sheetCancel} onPress={() => setPickingLocation(false)}>
              <Text style={styles.sheetCancelLabel}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const documentStatusLabel: Record<string, string> = { needed: 'Needed', uploaded: 'Uploaded', approved: 'Approved' };

/** What shows when a completed step is expanded — one case per step id
 * that actually has something to verify. Steps not listed here (ready,
 * pickup) have their own always-visible content instead, handled outside
 * this expand/collapse system. */
function StepDetail({ id, car }: { id: string; car: ReturnType<typeof useDeal>['car'] }) {
  if (id === 'matched') {
    return (
      <View style={styles.detailCard}>
        <SalespersonAvatarMini size={30} />
        <View style={{ flex: 1 }}>
          <Text style={styles.detailTitle}>{salesperson.name}</Text>
          <Text style={styles.detailSubtitle}>{salesperson.title}</Text>
        </View>
        <Pressable hitSlop={8} onPress={() => Linking.openURL(salesperson.phone)}>
          <PhoneIcon size={18} color={Colors.navy} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => Linking.openURL(salesperson.phone.replace('tel:', 'sms:'))}>
          <MessageIcon size={18} color={Colors.red} />
        </Pressable>
      </View>
    );
  }

  if (id === 'application') {
    return (
      <View style={styles.detailCard}>
        <Text style={styles.detailPlainText}>
          Application received and matched to {car ? `${car.year} ${car.title}` : 'your chosen car'}. No action
          needed from you.
        </Text>
      </View>
    );
  }

  if (id === 'documents') {
    return (
      <View style={[styles.detailCard, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
        {dealDocuments.map((doc) => (
          <View key={doc.id} style={styles.docDetailRow}>
            <Text style={styles.docDetailName} numberOfLines={1}>
              {doc.name}
            </Text>
            <StatusChip status={doc.status} label={documentStatusLabel[doc.status]} />
          </View>
        ))}
        <Pressable style={styles.detailLinkRow} onPress={() => router.push('/(tabs)/deal/documents')}>
          <DownloadIcon size={14} color={Colors.navy} />
          <Text style={styles.detailLink}>Open full Documents tab</Text>
        </Pressable>
      </View>
    );
  }

  if (id === 'financing') {
    return (
      <View style={[styles.detailCard, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
        <View style={styles.financeGrid}>
          <FinanceStat label="Amount Financed" value={`$${financingTerms.amountFinanced.toLocaleString()}`} />
          <FinanceStat label="APR" value={`${financingTerms.apr}%`} />
          <FinanceStat label="Term" value={`${financingTerms.termMonths} mo`} />
          <FinanceStat label="Monthly" value={`$${financingTerms.monthlyPayment}`} />
        </View>
        <Text style={styles.detailSubtitle}>Financed through {financingTerms.lender}</Text>
      </View>
    );
  }

  if (id === 'contract') {
    return (
      <View style={[styles.detailCard, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
        <Text style={styles.detailPlainText}>Signed electronically. A copy was emailed to you.</Text>
        <Pressable
          style={styles.detailLinkRow}
          onPress={() => Alert.alert('Not connected yet', "Viewing the signed contract isn't wired up yet.")}>
          <DownloadIcon size={14} color={Colors.navy} />
          <Text style={styles.detailLink}>View Contract</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

function FinanceStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.financeStat}>
      <Text style={styles.financeValue}>{value}</Text>
      <Text style={styles.financeLabel}>{label}</Text>
    </View>
  );
}

export default function TimelineScreen() {
  const { car } = useDeal();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Your Journey</Text>
      </View>

      <View style={[styles.pinnedBar, Shadow.card]}>
        <SalespersonAvatarMini size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.pinnedName}>{salesperson.name.split(' ')[0]} is helping you</Text>
          <Text style={styles.pinnedMeta}>
            {car ? `${car.year} ${car.title} · $${car.price.toLocaleString()}` : 'No car selected yet'}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={() => Linking.openURL(salesperson.phone.replace('tel:', 'sms:'))}>
          <MessageIcon />
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {dealSteps.map((step, i) => {
          const isLast = i === dealSteps.length - 1;
          const showsReadyPhoto = step.id === 'ready' && step.status !== 'upcoming';
          const isExpandable = step.status === 'done' && step.id in EXPANDED_EXTRA_HEIGHT;
          const isExpanded = isExpandable && expanded.has(step.id);

          let rowHeight = showsReadyPhoto
            ? READY_ROW_HEIGHT
            : step.status === 'current'
              ? CURRENT_ROW_HEIGHT
              : isLast
                ? LAST_ROW_HEIGHT
                : ROW_HEIGHT;
          if (isExpanded) rowHeight += EXPANDED_EXTRA_HEIGHT[step.id];
          const lineHeight = rowHeight - 34;

          return (
            <View key={step.id} style={{ flexDirection: 'row', gap: 16, minHeight: rowHeight }}>
              <View style={{ width: 34, alignItems: 'center' }}>
                <TimelineDot status={step.status} isLast={isLast} />
                {!isLast && step.status === 'done' && <SolidLine height={lineHeight} />}
                {!isLast && step.status === 'current' && <FlowLine height={lineHeight} />}
                {!isLast && step.status === 'upcoming' && <DashedLine height={lineHeight} />}
              </View>

              <View style={{ flex: 1, paddingTop: 2 }}>
                <Pressable
                  disabled={!isExpandable}
                  onPress={() => toggleExpanded(step.id)}
                  style={styles.titleRow}>
                  <Text
                    style={[
                      styles.stepTitle,
                      step.status === 'current' && styles.stepTitleCurrent,
                      step.status === 'upcoming' && styles.stepTitleUpcoming,
                    ]}>
                    {step.title}
                  </Text>
                  {isExpandable && (
                    <View style={isExpanded ? styles.chevronExpanded : undefined}>
                      <ChevronDownIcon size={16} color={Colors.textFaint} strokeWidth={2.4} />
                    </View>
                  )}
                </Pressable>
                {step.detail ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}

                {isExpanded && <StepDetail id={step.id} car={car} />}

                {step.id === 'documents' && step.status === 'current' && (
                  <Pressable style={styles.miniChip} onPress={() => router.push('/(tabs)/deal/documents')}>
                    <SalespersonAvatarMini size={24} />
                    <Text style={styles.miniChipText}>
                      {salesperson.name.split(' ')[0]} is reviewing your documents
                    </Text>
                  </Pressable>
                )}

                {showsReadyPhoto &&
                  (car ? (
                    <View style={styles.readyCard}>
                      <Image source={{ uri: car.thumbnail }} style={styles.readyImage} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.readyTitle} numberOfLines={1}>
                          {car.year} {car.title}
                        </Text>
                        <Text style={styles.readySubtitle}>Washed, inspected, and waiting for you.</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.readyCardEmpty}>
                      <Text style={styles.readySubtitle}>
                        Your car&apos;s photo will show up here once one&apos;s chosen from Browse.
                      </Text>
                    </View>
                  ))}

                {step.id === 'pickup' && step.status === 'current' && (
                  <View style={{ marginTop: 10 }}>
                    <PickupPhotoAction />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  navbar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  pinnedBar: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinnedName: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  pinnedMeta: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, marginTop: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  stepTitleCurrent: { color: Colors.red },
  stepTitleUpcoming: { color: Colors.textFaint },
  stepDetail: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  chevronExpanded: { transform: [{ rotate: '180deg' }] },
  miniChip: {
    marginTop: 10,
    backgroundColor: Colors.redTint,
    borderRadius: Radius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    maxWidth: 220,
  },
  miniChipText: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 11.5, color: Colors.navy, lineHeight: 15 },
  readyCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 300,
    ...Shadow.card,
  },
  readyCardEmpty: {
    marginTop: 10,
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.lg,
    padding: 14,
    maxWidth: 280,
  },
  readyImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.navyTint,
  },
  readyTitle: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: Colors.text },
  readySubtitle: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, marginTop: 2, lineHeight: 15 },
  pickupButton: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  pickupButtonLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: '#fff' },
  reviewButton: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  reviewButtonLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: Colors.navy },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,26,71,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 34,
  },
  sheetTitle: { fontFamily: Fonts.display, fontSize: 19, color: Colors.text },
  sheetSubtitle: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 4, marginBottom: 12 },
  sheetRow: {
    height: 50,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    justifyContent: 'center',
  },
  sheetRowLabel: { fontFamily: Fonts.bodySemibold, fontSize: 15, color: Colors.text },
  sheetCancel: {
    height: 50,
    marginTop: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelLabel: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.red },
  pickupCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    maxWidth: 320,
    ...Shadow.card,
  },
  pickupThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.navyTint,
  },
  pickupCaption: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.text },
  pickupSecondaryBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupSecondaryLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: Colors.textMuted },
  pickupPrimaryBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupPrimaryLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: '#fff' },
  detailCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 320,
    ...Shadow.card,
  },
  detailTitle: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: Colors.text },
  detailSubtitle: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, marginTop: 1 },
  detailPlainText: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 18 },
  detailLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  detailLink: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.navy },
  docDetailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  docDetailName: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.text },
  financeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  financeStat: { width: '46%' },
  financeValue: { fontFamily: Fonts.display, fontSize: 17, color: Colors.navy },
  financeLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textMuted, marginTop: 1 },
});

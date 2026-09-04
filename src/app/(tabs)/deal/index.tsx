import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeftIcon, CameraIcon, DownloadIcon, MessageIcon, StarIcon } from '@/components/icons';
import { SalespersonAvatarMini } from '@/components/salesperson-avatar';
import { StatusChip } from '@/components/ui/chip';
import { TimelineRoad } from '@/components/timeline-road';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import {
  FINANCE_APPLICATION_URL,
  formatApoAddress,
  ucgAssistant,
  ucgLocations,
  waitingOnLabel,
  type DealStep,
} from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';
import { useDealSync } from '@/lib/deal-sync';
import { useDealDocuments } from '@/lib/documents-context';

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

/** Content for the persistent "currently viewing" panel — one case per
 * step id. "ready" and "pickup" have their own richer content; the rest
 * get a plain verification card. */
function StepDetailContent({ step, car }: { step: DealStep; car: ReturnType<typeof useDeal>['car'] }) {
  // Called unconditionally, before any of the early returns below (Rules
  // of Hooks) — only actually used by the 'documents' branch further
  // down, but every render needs it available regardless of which
  // branch this step takes.
  const { documents } = useDealDocuments();
  // Same rule — only the 'application' branch actually reads this (to
  // decide financing vs. cash copy), but it has to be called every render.
  const { intake } = useDealIntake();
  // Only the 'financing' branch reads this, but Rules of Hooks — every render.
  const { state: dealState } = useDealSync();

  if (step.id === 'ready') {
    return car ? (
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
        <Text style={styles.readySubtitle}>Your car&apos;s photo will show up here once one&apos;s chosen from Browse.</Text>
      </View>
    );
  }

  if (step.id === 'pickup') {
    return <PickupPhotoAction />;
  }

  if (step.id === 'matched') {
    const assigned = dealState.salesperson;
    return (
      <View style={styles.detailCard}>
        <SalespersonAvatarMini size={30} />
        <View style={{ flex: 1 }}>
          <Text style={styles.detailTitle}>{assigned ? assigned.name : ucgAssistant.name}</Text>
          <Text style={styles.detailSubtitle}>
            {assigned ? assigned.title : 'A UCG specialist is assigned once your deposit is in.'}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={() => router.push('/salesperson')}>
          <MessageIcon size={18} color={Colors.red} />
        </Pressable>
      </View>
    );
  }

  if (step.id === 'application') {
    const carLabel = car ? `${car.year} ${car.title}` : 'your chosen car';

    if (intake?.paymentMethod === 'cash') {
      return (
        <View style={[styles.detailCard, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
          <Text style={styles.detailPlainText}>
            Paying cash for {carLabel} — no financing application needed. If you&apos;re sending a wire, the
            instructions are one tap away.
          </Text>
          <Pressable style={styles.detailLinkRow} onPress={() => router.push('/wire-instructions')}>
            <DownloadIcon size={14} color={Colors.navy} />
            <Text style={styles.detailLink}>View Wire Instructions</Text>
          </Pressable>
        </View>
      );
    }

    // Financing (or no intake on file yet, e.g. viewing the demo default
    // data) — link out to UCG's own real application rather than
    // duplicate it in-app; see FINANCE_APPLICATION_URL's doc comment in
    // mock-data.ts for why. Lender choice(s) came from deal-intake.tsx.
    return (
      <View style={[styles.detailCard, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
        <Text style={styles.detailPlainText}>
          Application received and matched to {carLabel}.
          {intake?.financingLenders?.length
            ? ` Submitted to ${intake.financingLenders.join(', ')}.`
            : ''}
        </Text>
        <Pressable style={styles.detailLinkRow} onPress={() => Linking.openURL(FINANCE_APPLICATION_URL)}>
          <DownloadIcon size={14} color={Colors.navy} />
          <Text style={styles.detailLink}>View Finance Application</Text>
        </Pressable>
      </View>
    );
  }

  if (step.id === 'documents') {
    return (
      <View style={[styles.detailCard, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
        {documents.map((doc) => (
          <View key={doc.id} style={styles.docDetailRow}>
            <Text style={styles.docDetailName} numberOfLines={1}>
              {doc.name}
            </Text>
            <StatusChip status={doc.status} label={documentStatusLabel[doc.status]} />
          </View>
        ))}
        {intake && (
          <Text style={styles.detailPlainText}>
            APO / FPO:{' '}
            {intake.apoAddress
              ? formatApoAddress(intake.apoAddress)
              : 'not added yet — needed for registration, plates, and the environmental sticker'}
          </Text>
        )}
        <Pressable style={styles.detailLinkRow} onPress={() => router.push('/(tabs)/deal/documents')}>
          <DownloadIcon size={14} color={Colors.navy} />
          <Text style={styles.detailLink}>Open full Documents tab</Text>
        </Pressable>
      </View>
    );
  }

  if (step.id === 'financing') {
    const terms = dealState.financingTerms;
    if (!terms) {
      return (
        <View style={styles.detailCard}>
          <Text style={styles.detailPlainText}>
            Your financing terms show up here once the bank approves the loan. Your salesperson handles that step
            directly.
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.detailCard, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
        <View style={styles.financeGrid}>
          <FinanceStat label="Amount Financed" value={`$${terms.amountFinanced.toLocaleString()}`} />
          <FinanceStat label="APR" value={`${terms.apr}%`} />
          <FinanceStat label="Term" value={`${terms.termMonths} mo`} />
          <FinanceStat label="Monthly" value={`$${terms.monthlyPayment}`} />
        </View>
        <Text style={styles.detailSubtitle}>Financed through {terms.lender}. Once approved, the loan is sent to the bank outside of this app — your salesperson handles that step directly.</Text>
      </View>
    );
  }

  if (step.id === 'contract') {
    return (
      <View style={[styles.detailCard, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
        <Text style={styles.detailPlainText}>
          Signed electronically. A copy was emailed to you — print a copy for your records if you&apos;d like one.
        </Text>
        <Pressable style={styles.detailLinkRow} onPress={() => router.push('/deal-paperwork')}>
          <DownloadIcon size={14} color={Colors.navy} />
          <Text style={styles.detailLink}>View Your Paperwork</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailPlainText}>Coming up next.</Text>
    </View>
  );
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
  const { intake } = useDealIntake();
  const { state: dealState, jumpToStep } = useDealSync();
  const dealSteps = dealState.steps;

  const targetIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < dealSteps.length; i++) {
      if (dealSteps[i].status !== 'upcoming') idx = i;
    }
    return idx;
  }, [dealSteps]);

  const [viewedIndex, setViewedIndex] = useState(targetIndex);
  const viewedStep = dealSteps[viewedIndex];
  const outerScrollRef = useRef<ScrollView>(null);

  // dealSteps can change out from under this screen — "Reset Test Data"
  // resets it from the Account tab, and Expo Router keeps tab screens
  // mounted across tab switches, so this isn't just a first-render concern.
  useEffect(() => {
    setViewedIndex(targetIndex);
  }, [dealSteps, targetIndex]);

  // Whenever the deal actually advances a step (not just when reviewing
  // history via the back/forward arrows — that's a deliberate look-back,
  // scrolling them away from what they tapped to see would be wrong),
  // scroll back to the top. The detail panel showing the new current
  // step is the first thing in that scroll view, so this is what
  // actually gets the customer to "see the next step without having to
  // scroll down" — cheaper and far less fragile than trying to make the
  // SVG road itself shrink/collapse as segments complete.
  useEffect(() => {
    outerScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [targetIndex]);

  const goBack = () => setViewedIndex((i) => Math.max(0, i - 1));
  const goForward = () => setViewedIndex((i) => Math.min(targetIndex, i + 1));

  // The rest of the app stays portrait-locked (app.json) — only this
  // screen allows rotating, so the road can run sideways. Re-lock on the
  // way out so leaving the tab doesn't leave landscape unlocked elsewhere.
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // left/right matter once this screen can go landscape — the notch/dynamic
  // island moves to a side edge, not the top, when rotated, and 'top'-only
  // was leaving that side completely unprotected.
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Your Journey</Text>
      </View>

      <View style={[styles.pinnedBar, Shadow.card]}>
        <SalespersonAvatarMini size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.pinnedName}>
            {dealState.salesperson
              ? `${dealState.salesperson.name} has your deal`
              : 'UCG Assistant is helping you'}
          </Text>
          <Text style={styles.pinnedMeta}>
            {car ? `${car.year} ${car.title} · $${car.price.toLocaleString()}` : 'No car selected yet'}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={() => router.push('/salesperson')}>
          <MessageIcon />
        </Pressable>
      </View>

      {intake && (
        <Pressable style={styles.editLinkRow} onPress={() => router.push('/deal-intake')} hitSlop={4}>
          <Text style={styles.editLinkRowText}>Edit My Info</Text>
        </Pressable>
      )}

      <View style={styles.reviewBar}>
        <Pressable
          hitSlop={8}
          disabled={viewedIndex === 0}
          onPress={goBack}
          style={[styles.reviewArrow, viewedIndex === 0 && styles.reviewArrowDisabled]}>
          <ArrowLeftIcon size={18} color={viewedIndex === 0 ? Colors.textFaint : Colors.navy} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.reviewStep}>
            Step {viewedIndex + 1} of {dealSteps.length}
          </Text>
          <View style={styles.waitingChip}>
            <Text style={styles.waitingChipText}>{waitingOnLabel[viewedStep.waitingOn]}</Text>
          </View>
        </View>

        <Pressable
          hitSlop={8}
          disabled={viewedIndex === targetIndex}
          onPress={goForward}
          style={[
            styles.reviewArrow,
            styles.reviewArrowForward,
            viewedIndex === targetIndex && styles.reviewArrowDisabled,
          ]}>
          <ArrowLeftIcon size={18} color={viewedIndex === targetIndex ? Colors.textFaint : Colors.navy} />
        </Pressable>
      </View>

      {/* Dev/testing only — lets each of the 7 states be checked directly
          (detail panel + road position) without a real backend to
          actually advance a deal over days. Now actually gated (Sept 2,
          part of the pre-launch pass), not just gated "in spirit": __DEV__
          is true in Expo Go and dev/simulator builds, false in a real
          release build (TestFlight, App Store, Play Store, EAS production
          profile) — so this physically cannot ship to a real customer,
          not just "isn't supposed to." */}
      {__DEV__ && (
      <View style={styles.testingRow}>
        <Text style={styles.testingLabel}>TESTING — Jump to Step:</Text>
        <View style={styles.testingChips}>
          {dealSteps.map((step, i) => (
            <Pressable
              key={step.id}
              onPress={() => jumpToStep(i)}
              style={[styles.testingChip, i === targetIndex && styles.testingChipActive]}>
              <Text style={[styles.testingChipText, i === targetIndex && styles.testingChipTextActive]}>{i + 1}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      )}

      <ScrollView ref={outerScrollRef} contentContainerStyle={styles.scrollContent}>
        <View style={styles.detailPanel}>
          <Text style={styles.detailPanelTitle}>{viewedStep.title}</Text>
          {viewedStep.detail ? <Text style={styles.detailPanelMeta}>{viewedStep.detail}</Text> : null}
          <StepDetailContent step={viewedStep} car={car} />
        </View>

        {isLandscape ? (
          // Landscape: the road itself scrolls sideways, nested inside the
          // page's normal vertical scroll (different scroll axes, so the
          // two don't fight each other).
          <ScrollView horizontal contentContainerStyle={styles.roadScrollHorizontal}>
            <TimelineRoad steps={dealSteps} car={car} viewedIndex={viewedIndex} onStepPress={setViewedIndex} horizontal />
          </ScrollView>
        ) : (
          <TimelineRoad steps={dealSteps} car={car} viewedIndex={viewedIndex} onStepPress={setViewedIndex} />
        )}
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
  editLinkRow: { alignSelf: 'center', marginTop: 8, paddingVertical: 2, paddingHorizontal: 8 },
  editLinkRowText: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 12,
    color: Colors.red,
    textDecorationLine: 'underline',
  },
  reviewBar: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewArrow: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewArrowForward: { transform: [{ rotate: '180deg' }] },
  reviewArrowDisabled: { opacity: 0.4 },
  reviewStep: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: Colors.textMuted },
  waitingChip: {
    marginTop: 3,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.redTint,
  },
  waitingChipText: { fontFamily: Fonts.bodyBold, fontSize: 11.5, color: Colors.red },
  testingRow: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    padding: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C9CDD9',
  },
  testingLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9.5,
    color: Colors.textFaint,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  testingChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  testingChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testingChipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  testingChipText: { fontFamily: Fonts.bodySemibold, fontSize: 11.5, color: Colors.textMuted },
  testingChipTextActive: { color: '#fff' },
  scrollContent: { paddingVertical: Spacing.xl },
  roadScrollHorizontal: { paddingHorizontal: Spacing.xl },
  detailPanel: {
    // Horizontal inset via padding, not margin: a full-width box with
    // `width: '100%'` + `marginHorizontal` renders flush-left on web
    // (the margin has nowhere to go), which left "Picked Up" and its
    // buttons jammed against the edge. Padding insets the content while
    // the box stays full-width so maxWidth + alignSelf still center it
    // on a tablet.
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    maxWidth: 420 + Spacing.xl * 2,
    alignSelf: 'center',
    width: '100%',
  },
  detailPanelTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  detailPanelMeta: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2, marginBottom: 10 },
  readyCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadow.card,
  },
  readyCardEmpty: {
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.lg,
    padding: 14,
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
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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

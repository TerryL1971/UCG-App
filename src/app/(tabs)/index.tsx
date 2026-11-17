import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmRemoveFile, DealSummaryCard, DeadlineBanner, DealSwitcher, ScanUploadButton } from '@/components/deal-ui';
import { ArrowLeftIcon, CheckCircleIcon, LockIcon, WhatsAppIcon } from '@/components/icons';
import { INSURANCE_STEPS, InsurancePrompt, requestAanQuote } from '@/components/insurance-prompt';
import { TimelineRoad } from '@/components/timeline-road';
import { Button } from '@/components/ui/button';
import { baseName } from '@/constants/bases';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  computeSteps,
  currentDeadline,
  CUSTOMER_TICKS,
  docTypeInfo as docInfo,
  liveFiles,
  STEP_DOC_TYPES,
  docTypeInfo,
  flowOf,
  toIsoDate,
  waitingOnLabel,
  type Flow,
  type FlowStep,
} from '@/lib/deal-flow';
import { deleteMyDeal, resetDealSteps, setMilestone, type DealBundle, type DocType } from '@/lib/deals';
import { DEMO_CUSTOMER_ID, useDemoMode } from '@/lib/demo-mode';
import { useMyDeals } from '@/lib/my-deals-context';
import { messageSalesperson, salespersonLabel } from '@/lib/whatsapp';

/**
 * My Deal — the customer's own step-by-step plan for buying or selling a
 * car with UCG, for their base (like the Boris PCS app is for a move).
 * The customer sets up the deal from their paperwork, ticks steps their
 * salesperson tells them about on WhatsApp, and scans documents, which
 * tick their steps by themselves. No UCG employee uses the app.
 */
export default function MyDealScreen() {
  const { user, base } = useAuth();
  const { available, isLoading, loadFailed, deals, selected, selectDeal, refresh } = useMyDeals();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    refresh().finally(() => setRefreshing(false));
  };

  let body: React.ReactNode;
  if (!available) {
    body = (
      <View style={[styles.card, Shadow.card]}>
        <Text style={styles.cardTitle}>Log in to see your plan</Text>
        <Text style={styles.cardBody}>Your car plan and your paperwork live in your UCG account.</Text>
        <View style={{ gap: 10, marginTop: 14 }}>
          <Button label="Log In" onPress={() => router.push('/log-in')} />
          <Button label="Create Account" variant="secondary" onPress={() => router.push('/create-account')} />
        </View>
      </View>
    );
  } else if (isLoading) {
    body = <ActivityIndicator color={Colors.navy} style={{ marginTop: 40 }} />;
  } else if (loadFailed && deals.length === 0) {
    body = <Text style={styles.note}>Couldn&apos;t load your plan. Pull down to try again.</Text>;
  } else if (deals.length === 0) {
    body = (
      <View style={[styles.card, Shadow.card]}>
        <Text style={styles.cardTitle}>Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</Text>
        <Text style={styles.cardBody}>
          Bought a car from UCG, or selling yours to UCG? Copy a few details from the paperwork your salesperson gave
          you, and the app builds your step-by-step plan for your base: what to do next, what to bring, your deadlines,
          and all your documents in one place.
        </Text>
        <Button label="Start My Car Plan" onPress={() => router.push('/deal-setup')} style={{ marginTop: 14 }} />
      </View>
    );
  } else if (selected) {
    body = (
      <>
        <Pressable style={styles.baseRow} onPress={() => router.push('/choose-base')}>
          <Text style={styles.baseText}>
            {base ? `Plan for ${baseName(base)}` : 'Where are you stationed? Your plan depends on it.'}
          </Text>
          <Text style={styles.baseChange}>{base ? 'Change' : 'Choose'}</Text>
        </Pressable>
        <DealSwitcher deals={deals} selectedId={selected.deal.id} onSelect={selectDeal} />
        <DealView bundle={selected} userId={user?.id ?? DEMO_CUSTOMER_ID} baseId={base} onChanged={refresh} />
        <Text style={styles.link} onPress={() => router.push('/deal-setup')}>
          Buying or selling another car with UCG? Add it
        </Text>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>My Deal</Text>
        {selected && (
          <Pressable hitSlop={8} onPress={() => messageSalesperson(selected.deal, 'Hi! ')} style={styles.chatButton}>
            <WhatsAppIcon size={16} color="#fff" />
            <Text style={styles.chatLabel} numberOfLines={1}>
              Message {salespersonLabel(selected.deal)}
            </Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          available ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.navy} /> : undefined
        }>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

function DealView({
  bundle,
  userId,
  baseId,
  onChanged,
}: {
  bundle: DealBundle;
  userId: string;
  baseId: string | null;
  onChanged: () => void;
}) {
  const { deal, milestones, files } = bundle;
  const demo = useDemoMode();
  const flow = flowOf(deal);
  const steps = useMemo(() => computeSteps(deal, milestones, files, baseId), [deal, milestones, files, baseId]);
  const deadline = currentDeadline(deal, milestones, undefined, files);
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.status === 'current'),
  );
  const allDone = steps.every((s) => s.status === 'done');
  const targetIndex = allDone ? steps.length - 1 : currentIndex;

  const [viewedIndex, setViewedIndex] = useState(targetIndex);
  // Snap back to the live step whenever the deal moves on.
  const [prevTarget, setPrevTarget] = useState(targetIndex);
  if (prevTarget !== targetIndex) {
    setPrevTarget(targetIndex);
    setViewedIndex(targetIndex);
  }
  const viewed = steps[Math.min(viewedIndex, steps.length - 1)];
  const tick = CUSTOMER_TICKS[flow][viewed.id];
  const ticked = tick ? milestones.some((m) => m.milestone === tick.milestone) : false;

  // Scans that completed this step — removing one backs the step up.
  const stepFiles = liveFiles(files).filter((f) => (STEP_DOC_TYPES[flow][viewed.id] ?? []).includes(f.doc_type));

  const changeOrStartOver = () => {
    Alert.alert('Change car or start over', 'Bought a different car, or want to redo your steps?', [
      { text: 'Change car details', onPress: () => router.push({ pathname: '/deal-setup', params: { id: deal.id } }) },
      {
        text: 'Reset my steps',
        onPress: () =>
          Alert.alert('Reset your steps?', 'All your ticks are cleared and the plan starts again from step 1. Your documents stay.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              style: 'destructive',
              onPress: async () => {
                try {
                  await resetDealSteps(deal.id);
                  onChanged();
                } catch {
                  Alert.alert("Couldn't reset", 'Check your connection and try again.');
                }
              },
            },
          ]),
      },
      {
        text: 'Remove this deal and start over',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Remove this deal?', 'This plan and its documents are removed from the app. Your real deal with UCG is not affected.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteMyDeal(deal.id);
                  onChanged();
                } catch {
                  Alert.alert("Couldn't remove it", 'Check your connection and try again.');
                }
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const setTick = async (done: boolean) => {
    if (!tick) return;
    try {
      await setMilestone(deal.id, tick.milestone, done, userId, done ? toIsoDate(new Date()) : undefined);
      onChanged();
    } catch {
      Alert.alert("Couldn't save that", 'Check your connection and try again.');
    }
  };

  return (
    <View style={{ gap: Spacing.md }}>
      {demo && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoText}>Demo plan with sample data. Turn Demo Mode off in Account for your real plan.</Text>
        </View>
      )}
      <DealSummaryCard deal={deal} />
      {deadline && <DeadlineBanner deadline={deadline} />}
      {/* American Auto Nation, front and centre from the moment they pay
          until the car is registered. */}
      {flow !== 'sale' &&
        !allDone &&
        INSURANCE_STEPS.includes(steps[currentIndex]?.id) &&
        steps.find((s) => s.id === 'insurance')?.status !== 'done' && (
          <InsurancePrompt deal={deal} userId={userId} onChanged={onChanged} />
        )}

      <View style={[styles.card, Shadow.card]}>
        <View style={styles.stepHead}>
          {/* Step back and forth through the whole plan. */}
          <View style={styles.stepNav}>
            <Pressable
              hitSlop={8}
              disabled={viewedIndex === 0}
              onPress={() => setViewedIndex((i) => Math.max(0, i - 1))}
              style={[styles.arrow, viewedIndex === 0 && styles.arrowDisabled]}>
              <ArrowLeftIcon size={16} color={Colors.navy} />
            </Pressable>
            <Text style={styles.stepCount}>
              Step {viewedIndex + 1} of {steps.length}
            </Text>
            <Pressable
              hitSlop={8}
              disabled={viewedIndex === steps.length - 1}
              onPress={() => setViewedIndex((i) => Math.min(steps.length - 1, i + 1))}
              style={[styles.arrow, styles.arrowForward, viewedIndex === steps.length - 1 && styles.arrowDisabled]}>
              <ArrowLeftIcon size={16} color={Colors.navy} />
            </Pressable>
          </View>
          <View style={[styles.waitChip, viewed.status === 'done' && styles.waitChipDone]}>
            <Text style={[styles.waitChipText, viewed.status === 'done' && styles.waitChipTextDone]}>
              {viewed.status === 'done' ? 'Done' : waitingOnLabel[viewed.waitingOn]}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{viewed.title}</Text>
        <Text style={styles.cardBody}>{viewed.explainer}</Text>
        {viewed.baseNote && <Text style={styles.baseNote}>{viewed.baseNote}</Text>}
        {viewed.lockedReason && (
          <View style={styles.locked}>
            <LockIcon size={16} color={Colors.amber} />
            <Text style={styles.lockedText}>{viewed.lockedReason}</Text>
          </View>
        )}

        {/* Insurance stays changeable after it's done (e.g. switching to
            American Auto Nation from another insurer). */}
        {((viewed.status === 'current' && !viewed.lockedReason) || (viewed.id === 'insurance' && viewed.status === 'done')) && (
          <StepActions step={viewed} flow={flow} bundle={bundle} userId={userId} onChanged={onChanged} />
        )}

        {viewed.status === 'done' &&
          stepFiles.map((f) => (
            <View key={f.id} style={styles.tickedRow}>
              <CheckCircleIcon size={16} />
              <Text style={styles.tickedLabel}>Added: {docInfo(f.doc_type).label}</Text>
              <Text style={styles.undo} onPress={() => confirmRemoveFile(f, onChanged)}>
                Remove
              </Text>
            </View>
          ))}

        {viewed.status !== 'upcoming' && !viewed.lockedReason && tick && !ticked && (
          <Pressable style={styles.tickButton} onPress={() => setTick(true)}>
            <View style={styles.tickBox} />
            <Text style={styles.tickLabel}>{tick.label}</Text>
          </Pressable>
        )}
        {tick && ticked && (
          <View style={styles.tickedRow}>
            <CheckCircleIcon size={16} />
            <Text style={styles.tickedLabel}>{tick.label}</Text>
            <Text style={styles.undo} onPress={() => setTick(false)}>
              Undo
            </Text>
          </View>
        )}

        {viewed.status !== 'done' && (
          <Pressable
            style={styles.whatsappRow}
            onPress={() => messageSalesperson(deal, `I have a question about "${viewed.title}".`)}>
            <WhatsAppIcon size={16} color={Colors.green} />
            <Text style={styles.whatsappLabel}>Ask {salespersonLabel(deal)} about this step on WhatsApp</Text>
          </Pressable>
        )}

        {viewedIndex !== targetIndex && (
          <Text style={styles.link} onPress={() => setViewedIndex(targetIndex)}>
            Back to where my deal is now
          </Text>
        )}
      </View>

      <View style={styles.roadWrap}>
        <TimelineRoad steps={steps} car={null} viewedIndex={viewedIndex} onStepPress={setViewedIndex} />
      </View>

      <Pressable style={[styles.linkCard, Shadow.card]} onPress={() => router.push('/road-to-plates')}>
        <Text style={styles.linkCardTitle}>Every step, explained  →</Text>
        <Text style={styles.linkCardBody}>What happens from here to the end, and who does what.</Text>
      </Pressable>
      <Text style={styles.link} onPress={changeOrStartOver}>
        Change car or start over
      </Text>
    </View>
  );
}

/** Scans and links for the step the customer is on. */
function StepActions({
  step,
  flow,
  bundle,
  userId,
  onChanged,
}: {
  step: FlowStep;
  flow: Flow;
  bundle: DealBundle;
  userId: string;
  onChanged: () => void;
}) {
  const { deal, milestones } = bundle;
  const scan = (type: DocType, label: string) => (
    <ScanUploadButton deal={deal} info={docTypeInfo(type)} role="customer" userId={userId} label={label} onUploaded={onChanged} />
  );

  const actions: React.ReactNode[] = [];
  if (step.id === 'payment' || step.id === 'vat_office') {
    actions.push(
      <Button
        key="pay"
        label={flow === 'purchase' && deal.payment_method !== 'finance' ? 'How to Pay' : 'Payment Instructions'}
        onPress={() => router.push('/payment')}
      />,
    );
  }
  if (step.id === 'insurance') {
    actions.push(<Button key="aan" label="Get My American Auto Nation Quote" onPress={() => requestAanQuote(deal)} />);
  }
  if (step.id === 'customs_office') {
    actions.push(
      <View key="scan">{scan(flow === 'sale' ? 'ae550b' : 'ae550a', `Scan AE Form 550-175${flow === 'sale' ? 'B' : 'A'} (front & back)`)}</View>,
    );
  }
  if (step.id === 'zollamt') {
    actions.push(<View key="stamped">{scan(flow === 'sale' ? 'ae550b_stamped' : 'ae550a_stamped', 'Add My Stamped 550 (front & back)')}</View>);
  }
  if (step.id === 'vat_office') {
    actions.push(<View key="vat">{scan('vat_form', 'Scan My VAT Forms')}</View>);
  }
  if (step.id === 'registration') {
    if (milestones.some((m) => m.milestone === 'registration_packet')) {
      actions.push(<Button key="vro" label="What to Bring to the VRO" variant="secondary" onPress={() => router.push('/vro-checklist')} />);
    }
    actions.push(<View key="tt">{scan('tt_doc', 'Scan My TT Doc (front & back)')}</View>);
  }
  if (step.id === 'delivered') {
    actions.push(<View key="ho">{scan('hand_over', 'Scan My Signed Hand-Over Document')}</View>);
  }
  if (step.id === 'handover' && flow === 'sale') {
    actions.push(
      <Button key="vro" label="What to Bring" variant="secondary" onPress={() => router.push('/vro-checklist?mode=sell')} />,
    );
  }
  if (step.id === 'deregister') {
    actions.push(<View key="dereg">{scan('deregistration', 'Scan Proof of Deregistration')}</View>);
  }
  if (actions.length === 0) return null;
  return <View style={{ gap: 10, marginTop: 14 }}>{actions}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  navbar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: '#25D366',
    maxWidth: '62%',
  },
  chatLabel: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: '#fff', flexShrink: 1 },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  note: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  link: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.navy,
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 12,
  },
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg },
  cardTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text, marginTop: 6 },
  cardBody: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, lineHeight: 20, marginTop: 4 },
  stepHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepCount: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: Colors.textMuted },
  stepNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowForward: { transform: [{ rotate: '180deg' }] },
  arrowDisabled: { opacity: 0.35 },
  waitChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: Colors.redTint },
  waitChipText: { fontFamily: Fonts.bodyBold, fontSize: 11.5, color: Colors.red },
  waitChipDone: { backgroundColor: Colors.greenTint },
  waitChipTextDone: { color: Colors.green },
  locked: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: Colors.amberTint,
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 12,
  },
  lockedText: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.amber, lineHeight: 18 },
  tickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.navy,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 14,
  },
  tickBox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: Colors.navy },
  tickLabel: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.navy },
  tickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.greenTint,
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 14,
  },
  tickedLabel: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.green },
  undo: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted, textDecorationLine: 'underline' },
  whatsappRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  whatsappLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.green, flexShrink: 1 },
  roadWrap: { alignItems: 'center' },
  baseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  baseText: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.text },
  baseChange: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.red },
  baseNote: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12.5,
    color: Colors.navy,
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 10,
    lineHeight: 18,
    overflow: 'hidden',
  },
  demoBanner: { backgroundColor: Colors.amberTint, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  demoText: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.amber, lineHeight: 17 },
  linkCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14 },
  linkCardTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.navy },
  linkCardBody: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
});

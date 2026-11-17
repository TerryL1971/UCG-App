import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectDealForm } from '@/components/connect-deal-form';
import { DealSummaryCard, DeadlineBanner, DealSwitcher, ScanUploadButton } from '@/components/deal-ui';
import { LockIcon, MessageIcon } from '@/components/icons';
import { TimelineRoad } from '@/components/timeline-road';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  computeSteps,
  currentDeadline,
  docTypeInfo,
  flowOf,
  waitingOnLabel,
  type Flow,
  type FlowStep,
} from '@/lib/deal-flow';
import type { DealBundle } from '@/lib/deals';
import { useMyDeals } from '@/lib/my-deals-context';

/**
 * My Deal — the live tracker for the customer's deal. Everything here is
 * worked out from what the salesperson marked and which documents are in
 * (lib/deal-flow.ts); nothing is simulated.
 */
export default function MyDealScreen() {
  const { user } = useAuth();
  const { available, isLoading, loadFailed, deals, selected, selectDeal, refresh } = useMyDeals();
  const [connectingAnother, setConnectingAnother] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    refresh().finally(() => setRefreshing(false));
  };

  let body: React.ReactNode;
  if (!available) {
    body = (
      <View style={[styles.card, Shadow.card]}>
        <Text style={styles.cardTitle}>Log in to see your deal</Text>
        <Text style={styles.cardBody}>
          Your deal, your documents and your private chat with your salesperson live in your UCG account.
        </Text>
        <View style={{ gap: 10, marginTop: 14 }}>
          <Button label="Log In" onPress={() => router.push('/log-in')} />
          <Button label="Create Account" variant="secondary" onPress={() => router.push('/create-account')} />
        </View>
      </View>
    );
  } else if (isLoading) {
    body = <ActivityIndicator color={Colors.navy} style={{ marginTop: 40 }} />;
  } else if (loadFailed && deals.length === 0) {
    body = <Text style={styles.note}>Couldn&apos;t load your deal. Pull down to try again.</Text>;
  } else if (deals.length === 0 || connectingAnother) {
    body = (
      <View style={{ gap: Spacing.md }}>
        {deals.length === 0 && (
          <Text style={styles.intro}>
            Welcome{user?.name ? `, ${user.name}` : ''}! Once your salesperson has opened your deal, connect it here to
            follow every step and keep all your paperwork in one place.
          </Text>
        )}
        <ConnectDealForm onConnected={() => setConnectingAnother(false)} />
        {connectingAnother && (
          <Text style={styles.link} onPress={() => setConnectingAnother(false)}>
            Cancel
          </Text>
        )}
      </View>
    );
  } else if (selected) {
    body = (
      <>
        <DealSwitcher deals={deals} selectedId={selected.deal.id} onSelect={selectDeal} />
        <DealView bundle={selected} userId={user?.id ?? ''} onChanged={refresh} />
        <Text style={styles.link} onPress={() => setConnectingAnother(true)}>
          Selling or buying another car with UCG? Connect another deal
        </Text>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>My Deal</Text>
        {selected && (
          <Pressable hitSlop={8} onPress={() => router.push('/salesperson')} style={styles.chatButton}>
            <MessageIcon size={18} color={Colors.red} />
            <Text style={styles.chatLabel}>{selected.deal.salesperson_name ?? 'Salesperson'}</Text>
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

function DealView({ bundle, userId, onChanged }: { bundle: DealBundle; userId: string; onChanged: () => void }) {
  const { deal, milestones, files } = bundle;
  const flow = flowOf(deal);
  const steps = useMemo(() => computeSteps(deal, milestones, files), [deal, milestones, files]);
  const deadline = currentDeadline(deal, milestones);
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.status === 'current'),
  );
  const allDone = steps.every((s) => s.status === 'done');
  const targetIndex = allDone ? steps.length - 1 : currentIndex;

  const [viewedIndex, setViewedIndex] = useState(targetIndex);
  // Snap back to the live step whenever the deal moves on (a salesperson
  // mark or a new document arriving).
  const [prevTarget, setPrevTarget] = useState(targetIndex);
  if (prevTarget !== targetIndex) {
    setPrevTarget(targetIndex);
    setViewedIndex(targetIndex);
  }
  const viewed = steps[Math.min(viewedIndex, steps.length - 1)];

  return (
    <View style={{ gap: Spacing.md }}>
      <DealSummaryCard deal={deal} />
      {deadline && <DeadlineBanner deadline={deadline} />}

      <View style={[styles.card, Shadow.card]}>
        <View style={styles.stepHead}>
          <Text style={styles.stepCount}>
            Step {viewedIndex + 1} of {steps.length}
          </Text>
          <View style={[styles.waitChip, viewed.status === 'done' && styles.waitChipDone]}>
            <Text style={[styles.waitChipText, viewed.status === 'done' && styles.waitChipTextDone]}>
              {viewed.status === 'done' ? 'Done' : waitingOnLabel[viewed.waitingOn]}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{viewed.title}</Text>
        <Text style={styles.cardBody}>{viewed.explainer}</Text>
        {viewed.lockedReason && (
          <View style={styles.locked}>
            <LockIcon size={16} color={Colors.amber} />
            <Text style={styles.lockedText}>{viewed.lockedReason}</Text>
          </View>
        )}
        {viewed.status === 'current' && !viewed.lockedReason && (
          <StepActions step={viewed} flow={flow} bundle={bundle} userId={userId} onChanged={onChanged} />
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
        <Text style={styles.linkCardBody}>What happens from here to driving away, and who does what.</Text>
      </Pressable>
    </View>
  );
}

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
  const scan = (type: Parameters<typeof docTypeInfo>[0], label: string) => (
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
  if (step.id === 'customs_office') {
    actions.push(
      <View key="scan">{scan(flow === 'sale' ? 'ae550b' : 'ae550a', `Scan AE Form 550-175${flow === 'sale' ? 'B' : 'A'} (front & back)`)}</View>,
    );
  }
  if (step.id === 'registration') {
    if (milestones.some((m) => m.milestone === 'registration_packet')) {
      actions.push(<Button key="vro" label="What to Bring to the VRO" variant="secondary" onPress={() => router.push('/vro-checklist')} />);
    }
    actions.push(<View key="tt">{scan('tt_doc', 'Scan My TT Doc (front & back)')}</View>);
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
    backgroundColor: Colors.redTint,
    maxWidth: '60%',
  },
  chatLabel: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: Colors.red, flexShrink: 1 },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  intro: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
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
  roadWrap: { alignItems: 'center' },
  linkCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14 },
  linkCardTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.navy },
  linkCardBody: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
});

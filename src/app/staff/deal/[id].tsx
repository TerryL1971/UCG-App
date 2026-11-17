import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DealSummaryCard, FileRow, ScanUploadButton } from '@/components/deal-ui';
import { CheckCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useChat } from '@/lib/chat-context';
import {
  balanceDue,
  computeSteps,
  docTypesForFlow,
  flowOf,
  formatDate,
  formatMoney,
  liveFiles,
  parseDate,
  toIsoDate,
  type Flow,
} from '@/lib/deal-flow';
import { fetchDealBundle, setMilestone, subscribeToDealChanges, type DealBundle, type Milestone } from '@/lib/deals';

/**
 * One deal, staff side: tap the status marks only a salesperson can know
 * about, and add scans. Everything the customer sees updates live.
 */

interface MarkDef {
  milestone: Milestone;
  label: string;
  detail: string;
  /** Ask for the date it actually happened (it drives a deadline). */
  askDate?: string;
}

const MARKS: Record<Flow, MarkDef[]> = {
  purchase: [
    {
      milestone: 'retail_ready',
      label: 'Retail Ready',
      detail: "Car is Retail Ready in DealerTeam. Starts the customer's pay-in-full countdown.",
      askDate: 'Date it became Retail Ready',
    },
    {
      milestone: 'paid_in_full',
      label: 'Paid in Full',
      detail: "Michelle has ticked PIF in DealerTeam. Unlocks the customer's AE 550-175A step.",
    },
    { milestone: 'customs_cleared', label: 'Customs Cleared', detail: 'The 550-175As are cleared at the German Zollamt.' },
    { milestone: 'registration_packet', label: 'Registration Packet Ready', detail: 'The customer can collect their packet for the VRO.' },
    {
      milestone: 'delivered',
      label: 'Delivered',
      detail: 'Hand-Over Document signed. Starts the 5-business-day inspection guarantee.',
      askDate: 'Date of delivery',
    },
  ],
  purchase_den: [
    { milestone: 'paid_in_full', label: 'Paid in Full', detail: "The cashier's check is deposited, or the loan has paid." },
    { milestone: 'tuv_release', label: 'TÜV & Release Number', detail: 'TÜV done and the release number received.' },
    { milestone: 'registration_packet', label: 'Registration Packet Ready', detail: 'The customer can collect their packet for the VRO.' },
    {
      milestone: 'delivered',
      label: 'Delivered',
      detail: 'Hand-Over Document signed. Starts the 5-business-day inspection guarantee.',
      askDate: 'Date of delivery',
    },
  ],
  sale: [
    { milestone: 'customs_cleared', label: 'Customs Cleared', detail: 'The 550-175B is cleared at the German Zollamt.' },
    { milestone: 'vehicle_received', label: 'Car, Keys & Documents Received', detail: 'UCG has the car, every key and the title documents.' },
    {
      milestone: 'deregistered',
      label: 'Deregistered',
      detail: 'UCG pays within 30 days of the deregistration date.',
      askDate: 'Date on the deregistration proof',
    },
    { milestone: 'paid_out', label: 'Paid Out', detail: 'UCG has paid the customer or their lender.' },
  ],
};

export default function StaffDealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { staffProfile } = useChat();
  const [bundle, setBundle] = useState<DealBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOlder, setShowOlder] = useState(false);

  const load = useCallback(() => {
    if (!id) return Promise.resolve();
    return fetchDealBundle(id)
      .then(setBundle)
      .catch((error) => console.error('Loading deal failed:', error))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    return subscribeToDealChanges(`staff-deal-${id}`, () => {
      load();
    });
  }, [id, load]);

  if (!staffProfile) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Deal" />
        <Text style={styles.note}>This screen is only for UCG staff accounts.</Text>
      </SafeAreaView>
    );
  }
  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Deal" />
        <ActivityIndicator color={Colors.navy} style={{ marginTop: 32 }} />
      </SafeAreaView>
    );
  }
  if (!bundle) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Deal" />
        <Text style={styles.note}>Couldn&apos;t find that deal.</Text>
      </SafeAreaView>
    );
  }

  const { deal, milestones, files } = bundle;
  const flow = flowOf(deal);
  const steps = computeSteps(deal, milestones, files);
  const current = steps.find((s) => s.status === 'current');
  const live = liveFiles(files);
  const older = files.filter((f) => f.replaced_at);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={deal.customer_name} subtitle={`Deal #${deal.deal_number}`} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load().finally(() => setRefreshing(false));
            }}
            tintColor={Colors.navy}
          />
        }>
        <DealSummaryCard deal={deal} />
        <View style={[styles.card, Shadow.card]}>
          <Line label={flow === 'sale' ? 'UCG pays' : flow === 'purchase_den' ? "Cashier's check (Total Price)" : 'Balance due'} value={formatMoney(balanceDue(deal))} />
          {flow === 'purchase' && <Line label="Deposit" value={formatMoney(Number(deal.deposit))} />}
          {deal.kind === 'purchase' && (
            <Line label="Payment" value={deal.payment_method === 'finance' ? `Financed${deal.lender ? ` · ${deal.lender}` : ''}` : 'Cash'} />
          )}
          <Line label="Salesperson" value={deal.salesperson_name ?? '—'} />
          <Line label="Customer in app" value={deal.customer_id ? 'Connected' : `Not yet — they connect with #${deal.deal_number} + "${deal.customer_last_name}"`} />
          <Line label="Customer's step now" value={current ? current.title : 'All done'} />
          <Text style={styles.link} onPress={() => router.push({ pathname: '/staff/deal-form', params: { id: deal.id } })}>
            Edit deal details
          </Text>
        </View>

        <Text style={styles.section}>Status marks</Text>
        <Text style={styles.hint}>Only you can know these. The customer&apos;s app updates the moment you mark one.</Text>
        {MARKS[flow].map((def) => (
          <MarkRow
            key={def.milestone}
            def={def}
            done={milestones.find((m) => m.milestone === def.milestone)}
            onSet={async (done, date) => {
              if (!user?.id) return;
              try {
                await setMilestone(deal.id, def.milestone, done, user.id, date);
                await load();
              } catch (error) {
                console.error('Setting status failed:', error);
                Alert.alert("Couldn't save that", 'Check your connection and try again.');
              }
            }}
          />
        ))}

        <Text style={styles.section}>Documents</Text>
        <Text style={styles.hint}>
          Scan in color, or attach the PDF. A new scan of the same document replaces the old one — older versions are
          kept.
        </Text>
        {docTypesForFlow(flow).map((info) => {
          const have = live.find((f) => f.doc_type === info.type);
          return (
            <View key={info.type} style={styles.docRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.docHead}>
                  {have ? <CheckCircleIcon size={14} /> : null}
                  <Text style={styles.docLabel}>{info.label}</Text>
                </View>
                <Text style={styles.docMeta}>
                  {have
                    ? `In app · ${have.uploaded_by_role === 'customer' ? 'from customer' : (have.uploaded_by_name ?? 'staff')}`
                    : info.scannedBy === 'customer'
                      ? 'Usually scanned by the customer'
                      : 'Not in app yet'}
                </Text>
              </View>
              <View style={{ width: 120 }}>
                <ScanUploadButton
                  deal={deal}
                  info={info}
                  role="staff"
                  userId={user?.id ?? ''}
                  label={have ? 'Replace' : 'Add'}
                  allowPdf
                  onUploaded={load}
                />
              </View>
            </View>
          );
        })}

        {live.length > 0 && (
          <>
            <Text style={styles.section}>In the app ({live.length})</Text>
            {live.map((f) => (
              <FileRow key={f.id} file={f} />
            ))}
          </>
        )}
        {older.length > 0 && (
          <Text style={styles.link} onPress={() => setShowOlder((v) => !v)}>
            {showOlder ? 'Hide older versions' : `Show ${older.length} older version${older.length === 1 ? '' : 's'}`}
          </Text>
        )}
        {showOlder && older.map((f) => <FileRow key={f.id} file={f} />)}

        {deal.customer_id && (
          <Button label="Open Chats" variant="secondary" onPress={() => router.push('/staff')} style={{ marginTop: Spacing.lg }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

function MarkRow({
  def,
  done,
  onSet,
}: {
  def: MarkDef;
  done: { happened_on: string; marked_by_name: string | null } | undefined;
  onSet: (done: boolean, date?: string) => Promise<void>;
}) {
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [busy, setBusy] = useState(false);

  const run = async (next: boolean) => {
    setBusy(true);
    await onSet(next, def.askDate ? date.trim() : undefined);
    setBusy(false);
  };

  const mark = () => {
    if (def.askDate && !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Check the date', 'Use YYYY-MM-DD, e.g. 2026-11-17.');
      return;
    }
    Alert.alert(`Mark "${def.label}"?`, def.detail, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark', onPress: () => run(true) },
    ]);
  };

  const undo = () => {
    Alert.alert(`Undo "${def.label}"?`, "The customer's app goes back to the step before.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Undo', style: 'destructive', onPress: () => run(false) },
    ]);
  };

  return (
    <View style={[styles.markRow, done && styles.markRowDone]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.markLabel}>{def.label}</Text>
        <Text style={styles.markDetail}>
          {done ? `Marked by ${done.marked_by_name ?? 'staff'} · ${formatDate(parseDate(done.happened_on))}` : def.detail}
        </Text>
        {!done && def.askDate && (
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{def.askDate}</Text>
            <TextInput value={date} onChangeText={setDate} style={styles.dateInput} autoCorrect={false} />
          </View>
        )}
      </View>
      {busy ? (
        <ActivityIndicator color={Colors.navy} />
      ) : done ? (
        <Pressable onPress={undo} hitSlop={8}>
          <Text style={styles.undo}>Undo</Text>
        </Pressable>
      ) : (
        <Pressable onPress={mark} style={styles.markButton}>
          <Text style={styles.markButtonLabel}>Mark</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.sm },
  note: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center', margin: Spacing.xl },
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, gap: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lineLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },
  lineValue: { flexShrink: 1, fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.text, textAlign: 'right' },
  link: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.navy, textDecorationLine: 'underline', marginTop: 6 },
  section: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text, marginTop: Spacing.lg },
  hint: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 17 },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  markRowDone: { backgroundColor: Colors.greenTint, borderColor: Colors.greenTint },
  markLabel: { fontFamily: Fonts.bodyBold, fontSize: 14.5, color: Colors.text },
  markDetail: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2, lineHeight: 17 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  dateLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: Colors.textMuted, flexShrink: 1 },
  dateInput: {
    height: 36,
    minWidth: 112,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.text,
    backgroundColor: '#fff',
  },
  markButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.md, backgroundColor: Colors.red },
  markButtonLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: '#fff' },
  undo: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.textMuted, textDecorationLine: 'underline' },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
  },
  docHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  docLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: Colors.text, flexShrink: 1 },
  docMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});

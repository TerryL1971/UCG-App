import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DealSwitcher, FileRow, ScanUploadButton } from '@/components/deal-ui';
import { CheckCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { customerScanTypes, flowOf, liveFiles, originalsChecklist, vehicleLabel } from '@/lib/deal-flow';
import { useMyDeals } from '@/lib/my-deals-context';

/**
 * The customer's document wallet for the car (Terry, 2026-11-17): every
 * scan the salesperson sends, plus what the customer scans themselves —
 * kept for as long as they own the car, because they need it when they
 * sell it (to UCG or anyone else). Older versions are kept, marked as
 * replaced, never deleted.
 */
export default function DocumentsScreen() {
  const { user } = useAuth();
  const { available, isLoading, deals, selected, selectDeal, refresh } = useMyDeals();
  const [refreshing, setRefreshing] = useState(false);
  const [showOlder, setShowOlder] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    refresh().finally(() => setRefreshing(false));
  };

  let body: React.ReactNode;
  if (!available) {
    body = <Text style={styles.note}>Log in to see your documents.</Text>;
  } else if (isLoading) {
    body = <ActivityIndicator color={Colors.navy} style={{ marginTop: 40 }} />;
  } else if (!selected) {
    body = (
      <View style={{ gap: Spacing.md }}>
        <Text style={styles.note}>Connect your deal on My Deal and your documents will show up here.</Text>
        <Button label="Go to My Deal" onPress={() => router.push('/(tabs)')} />
      </View>
    );
  } else {
    const { deal, files } = selected;
    const flow = flowOf(deal);
    const current = liveFiles(files);
    const older = files.filter((f) => f.replaced_at);
    const originals = originalsChecklist(flow, files);

    body = (
      <View style={{ gap: Spacing.md }}>
        <DealSwitcher deals={deals} selectedId={deal.id} onSelect={selectDeal} />
        <Text style={styles.intro}>
          {vehicleLabel(deal)} · Deal #{deal.deal_number}. Tap a document to view it, or Share to send or print it.
        </Text>

        <Text style={styles.section}>Scan a document</Text>
        <View style={{ gap: 8 }}>
          {customerScanTypes(flow).map((info) => (
            <ScanUploadButton key={info.type} deal={deal} info={info} role="customer" userId={user?.id ?? ''} onUploaded={refresh} />
          ))}
        </View>
        <Text style={styles.hint}>
          Scan in color, flat and in good light. Forms with a front and back are scanned as one document.
        </Text>

        <Text style={styles.section}>Your documents ({current.length})</Text>
        {current.length === 0 ? (
          <Text style={styles.empty}>Nothing yet. Your salesperson&apos;s scans will appear here as they add them.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {current.map((f) => (
              <FileRow key={f.id} file={f} onRemoved={refresh} />
            ))}
          </View>
        )}
        {older.length > 0 && (
          <Text style={styles.link} onPress={() => setShowOlder((v) => !v)}>
            {showOlder ? 'Hide older versions' : `Show ${older.length} older version${older.length === 1 ? '' : 's'}`}
          </Text>
        )}
        {showOlder && (
          <View style={{ gap: 8 }}>
            {older.map((f) => (
              <FileRow key={f.id} file={f} onRemoved={refresh} />
            ))}
          </View>
        )}

        {originals.length > 0 && (
          <View style={[styles.card, Shadow.card]}>
            <Text style={styles.cardTitle}>Paperwork that stays with the car</Text>
            <Text style={styles.cardBody}>
              Keep these paper originals with the car. Whenever you sell it, to UCG or anyone else, the buyer will need
              all of them.
            </Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {originals.map(({ info, inApp }) => (
                <View key={info.type} style={styles.checkRow}>
                  {inApp ? <CheckCircleIcon size={16} /> : <View style={styles.checkEmpty} />}
                  <Text style={styles.checkLabel}>{info.label}</Text>
                  <Text style={[styles.checkState, inApp && { color: Colors.green }]}>{inApp ? 'Scan in app' : 'Not yet'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Documents</Text>
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
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  note: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 24, lineHeight: 20 },
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 19 },
  section: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text, marginTop: Spacing.md },
  hint: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textFaint, lineHeight: 17 },
  empty: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textFaint },
  link: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.navy, textDecorationLine: 'underline' },
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.md },
  cardTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text },
  cardBody: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, lineHeight: 18, marginTop: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkEmpty: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.textFaint },
  checkLabel: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 13.5, color: Colors.text },
  checkState: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: Colors.textFaint },
});

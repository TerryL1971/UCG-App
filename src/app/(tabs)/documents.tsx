import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DealSwitcher, FileRow, ScanUploadButton } from '@/components/deal-ui';
import { CheckCircleIcon, WhatsAppIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { docTypesForFlow, flowOf, liveFiles, originalsChecklist, vehicleLabel } from '@/lib/deal-flow';
import { DEMO_CUSTOMER_ID } from '@/lib/demo-mode';
import { useMyDeals } from '@/lib/my-deals-context';
import { sharePacket } from '@/lib/pdf-packet';

/**
 * The customer's document wallet for the car. No UCG employee uses the
 * app (2026-11-17), so the customer adds everything themselves: the PDFs
 * their salesperson sends on WhatsApp, or scans of the paper copies. Kept
 * for as long as they own the car, because they need it when they sell
 * it (to UCG or anyone else) — "Send all my documents" puts them in one
 * PDF for WhatsApp.
 */
export default function DocumentsScreen() {
  const { user } = useAuth();
  const { available, isLoading, selected, deals, selectDeal, refresh } = useMyDeals();
  const [refreshing, setRefreshing] = useState(false);
  const [showOlder, setShowOlder] = useState(false);
  const [sharing, setSharing] = useState(false);

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
        <Text style={styles.note}>Start your car plan on My Deal and you can keep all your paperwork here.</Text>
        <Button label="Go to My Deal" onPress={() => router.push('/(tabs)')} />
      </View>
    );
  } else {
    const { deal, files } = selected;
    const flow = flowOf(deal);
    const current = liveFiles(files);
    const older = files.filter((f) => f.replaced_at);
    const originals = originalsChecklist(flow, files);
    const userId = user?.id ?? DEMO_CUSTOMER_ID;

    const sendAll = async () => {
      setSharing(true);
      await sharePacket(current, `${vehicleLabel(deal)} documents Deal ${deal.deal_number}`, 'Send my documents');
      setSharing(false);
    };

    body = (
      <View style={{ gap: Spacing.md }}>
        <DealSwitcher deals={deals} selectedId={deal.id} onSelect={selectDeal} />
        <Text style={styles.intro}>
          {vehicleLabel(deal)} · Deal #{deal.deal_number}. Keep every paper for this car here: add the PDFs your
          salesperson sends you, or scan the paper copies.
        </Text>

        {current.length > 0 && (
          <Pressable style={({ pressed }) => [styles.sendAll, pressed && { opacity: 0.85 }]} onPress={sendAll} disabled={sharing}>
            {sharing ? <ActivityIndicator color="#fff" /> : <WhatsAppIcon size={18} color="#fff" />}
            <View style={{ flex: 1 }}>
              <Text style={styles.sendAllTitle}>{sharing ? 'Putting them together…' : 'Send all my documents'}</Text>
              <Text style={styles.sendAllSub}>One PDF with all {current.length} documents, for WhatsApp, email or printing</Text>
            </View>
          </Pressable>
        )}

        <Text style={styles.section}>Your paperwork</Text>
        <Text style={styles.hint}>
          Got a PDF on WhatsApp? Open it in WhatsApp, tap Share → Save to Files, then tap Add here and choose Add a PDF.
        </Text>
        <View style={{ gap: 8 }}>
          {docTypesForFlow(flow).map((info) => {
            const have = current.find((f) => f.doc_type === info.type);
            return (
              <View key={info.type} style={styles.docRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.docHead}>
                    {have ? <CheckCircleIcon size={14} /> : null}
                    <Text style={styles.docLabel}>{info.label}</Text>
                  </View>
                  <Text style={styles.docMeta}>{have ? 'In your documents' : 'Not added yet'}</Text>
                </View>
                <View style={{ width: 112 }}>
                  <ScanUploadButton
                    deal={deal}
                    info={info}
                    role="customer"
                    userId={userId}
                    label={have && info.type !== 'other' ? 'Replace' : 'Add'}
                    onUploaded={refresh}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>In the app ({current.length})</Text>
        {current.length === 0 ? (
          <Text style={styles.empty}>Nothing yet. Add your paperwork above.</Text>
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
                  <Text style={[styles.checkState, inApp && { color: Colors.green }]}>{inApp ? 'Copy in app' : 'Not yet'}</Text>
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
  sendAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#25D366',
    borderRadius: Radius.lg,
    padding: 14,
  },
  sendAllTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: '#fff' },
  sendAllSub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 1 },
  section: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text, marginTop: Spacing.md },
  hint: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
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

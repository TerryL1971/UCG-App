import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ClockIcon, DocumentIcon, UploadIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { dealTitle, docTypeInfo, type DealDeadline, type DocTypeInfo, vehicleLabel } from '@/lib/deal-flow';
import { signedFileUrl, uploadDealFile, type Deal, type DealBundle, type DealFile } from '@/lib/deals';
import { openUrlWithFeedback } from '@/lib/linking';
import { pickPdf, scanPages } from '@/lib/scan';

export function DealSummaryCard({ deal }: { deal: Deal }) {
  return (
    <View style={[styles.card, Shadow.card]}>
      <Text style={styles.kicker}>{dealTitle(deal)}</Text>
      <Text style={styles.vehicle}>{vehicleLabel(deal)}</Text>
      <View style={styles.metaRow}>
        <Meta label="Deal #" value={deal.deal_number} />
        <Meta label="Stock #" value={deal.stock_number} />
      </View>
      <Meta label="VIN" value={deal.vin} />
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} selectable>
        {value}
      </Text>
    </View>
  );
}

export function DeadlineBanner({ deadline }: { deadline: DealDeadline }) {
  const palette =
    deadline.tone === 'overdue'
      ? { bg: Colors.redTint, fg: Colors.red }
      : deadline.tone === 'warning'
        ? { bg: Colors.amberTint, fg: Colors.amber }
        : { bg: Colors.navyTint, fg: Colors.navy };
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg }]}>
      <ClockIcon size={18} color={palette.fg} />
      <Text style={[styles.bannerText, { color: palette.fg }]}>{deadline.message}</Text>
    </View>
  );
}

/** Buying + selling at once are two deals; this flips between them. */
export function DealSwitcher({
  deals,
  selectedId,
  onSelect,
}: {
  deals: DealBundle[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  if (deals.length < 2) return null;
  return (
    <View style={styles.switcher}>
      {deals.map(({ deal }) => {
        const active = deal.id === selectedId;
        return (
          <Pressable key={deal.id} onPress={() => onSelect(deal.id)} style={[styles.switchChip, active && styles.switchChipActive]}>
            <Text style={[styles.switchLabel, active && styles.switchLabelActive]} numberOfLines={1}>
              {deal.kind === 'sale' ? 'Selling' : 'Buying'} · {vehicleLabel(deal)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function formatUploaded(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function openFile(file: DealFile) {
  try {
    const url = await signedFileUrl(file.storage_path);
    if (url.startsWith('file://')) {
      // A file on the phone (demo mode): the share sheet previews it.
      await Sharing.shareAsync(url, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      return;
    }
    await openUrlWithFeedback(url);
  } catch {
    Alert.alert("Couldn't open that document", 'Check your connection and try again.');
  }
}

/** Downloads to the phone first so the share sheet gets a real PDF —
 * the customer's own way to send or print it (e.g. for a buyer). */
async function shareFile(file: DealFile) {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Not available', "Sharing isn't available on this device.");
      return;
    }
    const url = await signedFileUrl(file.storage_path);
    const name = `${docTypeInfo(file.doc_type).label.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`;
    const target = `${FileSystem.cacheDirectory}${name}`;
    const uri = url.startsWith('file://') ? url : (await FileSystem.downloadAsync(url, target)).uri;
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } catch {
    Alert.alert("Couldn't share that document", 'Check your connection and try again.');
  }
}

export function FileRow({ file }: { file: DealFile }) {
  const info = docTypeInfo(file.doc_type);
  const who = file.uploaded_by_role === 'staff' ? (file.uploaded_by_name ?? 'UCG') : 'You';
  return (
    <View style={[styles.fileRow, file.replaced_at && styles.fileRowReplaced]}>
      <DocumentIcon size={20} color={file.replaced_at ? Colors.textFaint : Colors.navy} />
      <Pressable style={{ flex: 1 }} onPress={() => openFile(file)}>
        <Text style={styles.fileName}>{info.label}</Text>
        <Text style={styles.fileMeta}>
          {file.replaced_at ? 'Older version · ' : ''}
          {who} · {formatUploaded(file.created_at)} · {file.page_count} page{file.page_count === 1 ? '' : 's'}
        </Text>
      </Pressable>
      <Pressable hitSlop={8} onPress={() => shareFile(file)} style={styles.shareButton}>
        <Text style={styles.shareLabel}>Share</Text>
      </Pressable>
    </View>
  );
}

/**
 * Scan (camera, page by page) or — for staff — attach a PDF, then upload
 * it to the deal. Calls `onUploaded` so the screen can refresh.
 */
export function ScanUploadButton({
  deal,
  info,
  role,
  userId,
  label,
  onUploaded,
  allowPdf = false,
}: {
  deal: Deal;
  info: DocTypeInfo;
  role: 'customer' | 'staff';
  userId: string;
  label?: string;
  onUploaded?: () => void;
  allowPdf?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const run = async (source: 'scan' | 'pdf') => {
    try {
      const pdf = source === 'pdf' ? await pickPdf() : await scanPages(info.label, info.pages);
      if (!pdf) return;
      setBusy(true);
      await uploadDealFile({
        dealId: deal.id,
        docType: info.type,
        localPdfUri: pdf.uri,
        pageCount: pdf.pageCount,
        role,
        userId,
      });
      onUploaded?.();
      Alert.alert('Saved', `${info.label} is in the app now.${role === 'customer' ? ' Your salesperson can see it too.' : ''}`);
    } catch (error) {
      console.error('Document upload failed:', error);
      Alert.alert("Couldn't save that document", 'Check your connection and try again. Nothing was saved.');
    } finally {
      setBusy(false);
    }
  };

  const onPress = () => {
    if (!allowPdf) {
      run('scan');
      return;
    }
    Alert.alert(info.label, 'How do you want to add it?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Attach a PDF', onPress: () => run('pdf') },
      { text: 'Scan with Camera', onPress: () => run('scan') },
    ]);
  };

  return (
    <Pressable style={({ pressed }) => [styles.scanButton, pressed && { opacity: 0.8 }]} onPress={onPress} disabled={busy}>
      {busy ? <ActivityIndicator color="#fff" /> : <UploadIcon size={16} color="#fff" />}
      <Text style={styles.scanLabel}>{busy ? 'Saving…' : (label ?? `Scan ${info.label}`)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, gap: 8 },
  kicker: { fontFamily: Fonts.bodyBold, fontSize: 11.5, color: Colors.red, letterSpacing: 0.5, textTransform: 'uppercase' },
  vehicle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text },
  metaRow: { flexDirection: 'row', gap: Spacing.xl },
  meta: { gap: 1 },
  metaLabel: { fontFamily: Fonts.bodySemibold, fontSize: 11, color: Colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.3 },
  metaValue: { fontFamily: Fonts.bodySemibold, fontSize: 14, color: Colors.text },
  banner: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: Radius.md, padding: 12 },
  bannerText: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 13.5, lineHeight: 19 },
  switcher: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  switchChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    maxWidth: '100%',
  },
  switchChipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  switchLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.text },
  switchLabelActive: { color: '#fff' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  fileRowReplaced: { backgroundColor: Colors.bg },
  fileName: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  fileMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  shareButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.navyTint },
  shareLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.navy },
  scanButton: {
    minHeight: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scanLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: '#fff', flexShrink: 1, textAlign: 'center' },
});

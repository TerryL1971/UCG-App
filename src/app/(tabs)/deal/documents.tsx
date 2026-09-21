import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentIcon, IdCardIcon, MapPinIcon, PlusIcon, ShieldIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/chip';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { type DealDocument } from '@/constants/mock-data';
import { useDealDocuments, type DocumentState } from '@/lib/documents-context';
import { compressPhoto } from '@/lib/image';
import { useLicenseCapture, type LicenseSide } from '@/lib/license-capture-context';

/** The one document this screen gives its own real camera to, instead of
 * the generic "+ Add Page" prompt every other document uses — a license
 * has a fixed shape a plain OS camera can't show a guide for (Terry:
 * "should have a see through box to line up the driver's license").
 * Reuses capture-license.tsx, the same overlay-camera screen deal-intake.tsx
 * already has for this exact purpose. */
const LICENSE_DOC_ID = 'license';

const iconFor: Record<DealDocument['icon'], (color: string) => React.ReactNode> = {
  id: (c) => <IdCardIcon color={c} />,
  insurance: (c) => <ShieldIcon color={c} />,
  income: (c) => <DocumentIcon color={c} />,
  residence: (c) => <MapPinIcon color={c} />,
};

const statusLabel: Record<DealDocument['status'], string> = {
  needed: 'Needed',
  uploaded: 'Uploaded',
  approved: 'Approved',
};

/**
 * A document card holding 1-to-many pages (Terry, Sept 2: "allowing for
 * 1-x pages" — Proof of Insurance, Orders, and Proof of Residence can
 * genuinely run multiple pages, not just one photo). This isn't a true
 * edge-detection/auto-crop document scanner — that needs a native module
 * outside what Expo Go can run, which would break the live device testing
 * AGENTS.md pins this project's Expo SDK version around. What's here is
 * real multi-page capture: add as many photos as a document needs, see
 * them as a thumbnail strip, remove one that came out bad without losing
 * the rest.
 */
function DocCard({
  doc,
  isAdding,
  onAddPage,
  onAddLicenseSide,
  onRemovePage,
}: {
  doc: DocumentState;
  isAdding: boolean;
  onAddPage: () => void;
  /** Only passed for the license doc — see LICENSE_DOC_ID above. */
  onAddLicenseSide?: (side: LicenseSide) => void;
  onRemovePage: (pageIndex: number) => void;
}) {
  const pageCount = doc.uris.length;

  const confirmRemove = (pageIndex: number) => {
    Alert.alert('Remove this page?', undefined, [
      { text: 'Remove', style: 'destructive', onPress: () => onRemovePage(pageIndex) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.card, Shadow.card]}>
      <View style={styles.cardHeader}>
        <View style={styles.rowIcon}>{iconFor[doc.icon](Colors.navy)}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName}>{doc.name}</Text>
          <View style={{ marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <StatusChip status={doc.status} label={isAdding ? 'Saving…' : statusLabel[doc.status]} />
            {pageCount > 0 && (
              <Text style={styles.pageCount}>
                {pageCount} page{pageCount === 1 ? '' : 's'}
              </Text>
            )}
          </View>
        </View>
      </View>

      {pageCount > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageStrip}>
          {doc.uris.map((uri, i) => (
            <Pressable key={uri + i} style={styles.pageThumb} onPress={() => confirmRemove(i)} disabled={isAdding}>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={styles.pageThumbBadge}>
                <Text style={styles.pageThumbBadgeText}>×</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {onAddLicenseSide ? (
        <View style={styles.licenseAddRow}>
          <Pressable
            style={[styles.addPageButton, styles.licenseAddButton]}
            onPress={() => onAddLicenseSide('front')}
            disabled={isAdding}>
            <PlusIcon size={16} color={Colors.red} />
            <Text style={styles.addPageLabel}>Add Front</Text>
          </Pressable>
          <Pressable
            style={[styles.addPageButton, styles.licenseAddButton]}
            onPress={() => onAddLicenseSide('back')}
            disabled={isAdding}>
            <PlusIcon size={16} color={Colors.red} />
            <Text style={styles.addPageLabel}>Add Back</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.addPageButton} onPress={onAddPage} disabled={isAdding}>
          <PlusIcon size={16} color={Colors.red} />
          <Text style={styles.addPageLabel}>{pageCount > 0 ? 'Add Another Page' : 'Add Page'}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function DocumentsScreen() {
  // Shared with the "Documents Uploaded" summary on My Deal
  // (deal/index.tsx) via documents-context.tsx — a page added here needs
  // to actually show up there too, not just in this screen's own state.
  const { documents, addDocumentPage, removeDocumentPage } = useDealDocuments();
  const [addingId, setAddingId] = useState<string | null>(null);
  const { lastCapturedLicensePhoto, clearLastCapturedLicensePhoto } = useLicenseCapture();

  // Handoff from capture-license.tsx's overlay camera — `for` guards
  // against also picking up a capture meant for deal-intake.tsx's own
  // front/back slots (see the doc comment on LicenseCaptureTarget).
  useEffect(() => {
    if (lastCapturedLicensePhoto && lastCapturedLicensePhoto.for === 'documents') {
      addDocumentPage(LICENSE_DOC_ID, lastCapturedLicensePhoto.uri);
      clearLastCapturedLicensePhoto();
    }
  }, [lastCapturedLicensePhoto, clearLastCapturedLicensePhoto, addDocumentPage]);

  const captureFor = async (id: string, useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Allow ${useCamera ? 'camera' : 'photo library'} access to upload a document.`);
      return;
    }

    const launch = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    setAddingId(id);
    try {
      const compressed = await compressPhoto(result.assets[0].uri);
      addDocumentPage(id, compressed);
    } finally {
      setAddingId(null);
    }
  };

  const promptAddPage = (doc: DocumentState) => {
    Alert.alert(`Add Page — ${doc.name}`, undefined, [
      { text: 'Take Photo', onPress: () => captureFor(doc.id, true) },
      { text: 'Choose from Library', onPress: () => captureFor(doc.id, false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // License-only picker fallback — "Take Photo" below goes through the
  // overlay camera instead; this is just for someone who already has a
  // photo of their license saved (same option deal-intake.tsx offers).
  const pickLicenseFromLibrary = async (side: LicenseSide) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add your license.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    setAddingId(LICENSE_DOC_ID);
    try {
      const compressed = await compressPhoto(result.assets[0].uri);
      addDocumentPage(LICENSE_DOC_ID, compressed);
    } finally {
      setAddingId(null);
    }
  };

  const promptLicenseSide = (side: LicenseSide) => {
    Alert.alert(`Add ${side === 'front' ? 'Front' : 'Back'} of License`, undefined, [
      {
        text: 'Take Photo',
        onPress: () => router.push({ pathname: '/capture-license', params: { side, for: 'documents' } }),
      },
      { text: 'Choose from Library', onPress: () => pickLicenseFromLibrary(side) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Documents" subtitle="For your financing application" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
        {documents.map((doc) => (
          <DocCard
            key={doc.id}
            doc={doc}
            isAdding={addingId === doc.id}
            onAddPage={() => promptAddPage(doc)}
            onAddLicenseSide={doc.id === LICENSE_DOC_ID ? promptLicenseSide : undefined}
            onRemovePage={(pageIndex) => removeDocumentPage(doc.id, pageIndex)}
          />
        ))}
        <Text style={styles.hint}>
          Add as many pages as a document needs — insurance and orders often run more than one page. Your UCG
          team is notified the moment a document&apos;s ready for review.
        </Text>

        <Pressable style={styles.vroCard} onPress={() => router.push('/vro-checklist')}>
          <MapPinIcon size={18} color={Colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.vroTitle}>Your VRO packet</Text>
            <Text style={styles.vroSub}>What you&apos;ll need to register the car, get plates, and get the sticker</Text>
          </View>
          <Text style={styles.vroChevron}>›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  headerWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  list: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 40 },
  vroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    marginTop: 4,
  },
  vroTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  vroSub: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, marginTop: 1, lineHeight: 15 },
  vroChevron: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.textFaint },
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: 14,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowName: { fontFamily: Fonts.bodyBold, fontSize: 14.5, color: Colors.text },
  pageCount: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },
  pageStrip: { flexGrow: 0 },
  pageThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: Colors.navyTint,
  },
  pageThumbBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageThumbBadgeText: { color: '#fff', fontSize: 14, lineHeight: 16, fontFamily: Fonts.bodyBold },
  addPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.red,
    borderStyle: 'dashed',
  },
  addPageLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.red },
  licenseAddRow: { flexDirection: 'row', gap: 8 },
  licenseAddButton: { flex: 1 },
  hint: {
    textAlign: 'center',
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 10,
  },
});

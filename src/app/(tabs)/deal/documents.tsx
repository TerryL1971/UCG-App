import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentIcon, IdCardIcon, MapPinIcon, PlusIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/chip';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { SUPPORT_WHATSAPP, whatsappChatUrl, type DealDocument } from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';
import { useDealDocuments, type DocumentState } from '@/lib/documents-context';
import { getOwnerId, lookupDealDocuments, type LookedUpDocument } from '@/lib/document-storage';
import { compressPhoto } from '@/lib/image';
import { useLicenseCapture, type LicenseSide } from '@/lib/license-capture-context';

/** The only document on this screen now (Terry, 2026-09-21 — Proof of
 * Insurance, Orders, and Proof of Residence were never UCG's to collect;
 * see mock-data.ts's dealDocuments comment). It gets its own real camera
 * instead of the generic "+ Add Page" prompt: a license has a fixed shape
 * a plain OS camera can't show a guide for (Terry: "should have a see
 * through box to line up the driver's license"). Reuses capture-license.tsx,
 * the same overlay-camera screen deal-intake.tsx already has for this. */
const LICENSE_DOC_ID = 'license';

const iconFor: Record<DealDocument['icon'], (color: string) => React.ReactNode> = {
  id: (c) => <IdCardIcon color={c} />,
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
  const { car } = useDeal();
  const { intake } = useDealIntake();

  // The customer's own retrieval code (document-storage.ts's getOwnerId)
  // — shown so they can give it to a salesperson or type it back in on
  // another device/reinstall to pull their generated/signed paperwork
  // back (Terry, 2026-09-21: "print any and all documents on demand").
  // Fetched once; it's the same value for the life of this install.
  const [myCode, setMyCode] = useState<string | null>(null);
  useEffect(() => {
    getOwnerId().then(setMyCode);
  }, []);

  const [retrieveCodeInput, setRetrieveCodeInput] = useState('');
  const [retrievedDocs, setRetrievedDocs] = useState<LookedUpDocument[] | null>(null);
  const [isRetrieving, setIsRetrieving] = useState(false);

  const handleRetrieve = async () => {
    if (!retrieveCodeInput.trim()) return;
    setIsRetrieving(true);
    setRetrievedDocs(null);
    try {
      const docs = await lookupDealDocuments(retrieveCodeInput);
      setRetrievedDocs(docs);
      if (docs.length === 0) {
        Alert.alert('Nothing found', "That code didn't match any paperwork yet — double-check it with your specialist.");
      }
    } finally {
      setIsRetrieving(false);
    }
  };

  // Whatever the app already knows about who/what this upload is for,
  // right now — passed through to addDocumentPage so the real backend
  // row (document-storage.ts's deal_documents table) actually says
  // something (Terry, 2026-09-21: a file with no customer/car/deal
  // attached told a salesperson nothing). Recomputed each render off
  // intake/car, not memoized — this is cheap and only read at upload time.
  const docContext = {
    customerName: intake?.fullName,
    customerContact: intake?.contact,
    carStockNumber: car?.stockNumber,
    carTitle: car ? `${car.year} ${car.title}` : undefined,
    base: intake?.base,
  };

  // Handoff from capture-license.tsx's overlay camera — `for` guards
  // against also picking up a capture meant for deal-intake.tsx's own
  // front/back slots (see the doc comment on LicenseCaptureTarget).
  useEffect(() => {
    if (lastCapturedLicensePhoto && lastCapturedLicensePhoto.for === 'documents') {
      addDocumentPage(LICENSE_DOC_ID, lastCapturedLicensePhoto.uri, docContext);
      clearLastCapturedLicensePhoto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- docContext is a fresh object every render; including it would re-fire this on every intake/car change, not just a new capture
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
      addDocumentPage(id, compressed, docContext);
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
      addDocumentPage(LICENSE_DOC_ID, compressed, docContext);
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
        <ScreenHeader title="Documents" subtitle="Your driver's license, on file with UCG" />
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
          Proof of Insurance, Orders, and Proof of Residence aren&apos;t something UCG collects — you bring those
          yourself to the Vehicle Registration Office (see your VRO packet below). Your UCG team is notified the
          moment your license is ready for review.
        </Text>

        <View style={[styles.codeCard, Shadow.card]}>
          <Text style={styles.codeCardTitle}>Your Documents Code</Text>
          <Text style={styles.codeCardBody}>
            Give this to your specialist, or use it to get your generated/signed paperwork back on another device.
            {/* Automatically sent with your first message when you submitted your deal — this is for sharing it
                again, any other time it's needed (Sell It Back doesn't go through that same first message). */}
          </Text>
          <Text style={styles.codeText}>{myCode ?? '········'}</Text>
          <Pressable
            style={styles.shareCodeButton}
            disabled={!myCode}
            onPress={() =>
              myCode &&
              Linking.openURL(
                whatsappChatUrl(SUPPORT_WHATSAPP, `Hi! Here's my UCG documents code: ${myCode}`),
              ).catch(() => {})
            }>
            <Text style={styles.shareCodeButtonLabel}>Share via WhatsApp</Text>
          </Pressable>
        </View>

        <View style={[styles.codeCard, Shadow.card]}>
          <Text style={styles.codeCardTitle}>Have a Code?</Text>
          <Text style={styles.codeCardBody}>
            Enter a documents code — yours from before, or one your specialist gave you — to pull up that paperwork.
          </Text>
          <View style={styles.retrieveRow}>
            <TextInput
              value={retrieveCodeInput}
              onChangeText={(t) => setRetrieveCodeInput(t.toUpperCase())}
              placeholder="e.g. AB3D9XZK"
              placeholderTextColor={Colors.textFaint}
              autoCapitalize="characters"
              maxLength={8}
              style={styles.retrieveInput}
            />
            <Pressable style={styles.retrieveButton} onPress={handleRetrieve} disabled={isRetrieving}>
              <Text style={styles.retrieveButtonLabel}>{isRetrieving ? 'Looking…' : 'Retrieve'}</Text>
            </Pressable>
          </View>

          {retrievedDocs && retrievedDocs.length > 0 && (
            <View style={{ gap: 8, marginTop: 12 }}>
              {retrievedDocs.map((doc) => (
                <Pressable
                  key={doc.docId + doc.kind + doc.createdAt}
                  style={styles.retrievedRow}
                  onPress={() => Linking.openURL(doc.url).catch(() => {})}>
                  <DocumentIcon size={17} color={Colors.navy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.retrievedTitle}>
                      {doc.docId} · {doc.kind === 'signed' ? 'Signed copy' : 'Generated'}
                    </Text>
                    <Text style={styles.retrievedSub}>{new Date(doc.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.retrievedOpen}>Open  ›</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

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
  codeCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 4,
  },
  codeCardTitle: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: Colors.navy },
  codeCardBody: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, marginTop: 3, lineHeight: 16 },
  codeText: {
    fontFamily: Fonts.display,
    fontSize: 24,
    letterSpacing: 3,
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.md,
    paddingVertical: 10,
  },
  shareCodeButton: {
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  shareCodeButtonLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.navy },
  retrieveRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  retrieveInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    fontFamily: Fonts.bodySemibold,
    fontSize: 15,
    letterSpacing: 1.5,
    color: Colors.text,
  },
  retrieveButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retrieveButtonLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: '#fff' },
  retrievedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg,
  },
  retrievedTitle: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.text, textTransform: 'capitalize' },
  retrievedSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  retrievedOpen: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: Colors.red },
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

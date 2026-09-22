import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckCircleIcon, PlusIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';
import { uploadGeneratedDocument, uploadSignedDocument, type DealDocumentContext } from '@/lib/document-storage';
import { compressPhoto } from '@/lib/image';

/**
 * One generatable document — Print / Save-Share, plus a real place to
 * attach the signed copy back. Shared between deal-paperwork.tsx (buying
 * from UCG: Cost Estimate, Purchase Order, Bill of Sale) and
 * sell-back.tsx (selling to UCG: the sell-side Bill of Sale) — same
 * mechanics either direction, just different generated content and doc
 * IDs (originally built for the buy side only, extracted here 2026-09-21
 * so the sell side didn't have to duplicate it).
 *
 * Saving/sharing a PDF also uploads that exact file to Storage
 * (document-storage.ts) — a real, retrievable copy of what the customer
 * actually saw, not just something regenerated live from whatever
 * today's numbers are. "Upload Signed Copy" captures a photo of the
 * physically-signed paperwork and uploads it too — but only when
 * `signable` (the default), since a Cost Estimate is never signed at all
 * (VAT-Form cars don't get a signed contract through this app — see
 * isDenStock's doc comment) and showing that button there would imply a
 * step that doesn't exist. There's no separate salesperson-facing screen
 * in this app — signing is captured from the same screen/device the
 * customer already has open, on the understanding that signing happens
 * with both people present. The signed photo stays viewable/shareable for
 * the rest of THIS app session only — retrieving it back from Storage on
 * a later visit would need real per-customer auth this app doesn't have
 * yet (see document-storage.ts's comment on the anon-key/RLS tradeoff).
 * Retrievable meanwhile from the Supabase dashboard, same as every other
 * document in that bucket.
 */
export function DocumentCard({
  docId,
  title,
  description,
  buildHtml,
  context,
  signable = true,
  onSigned,
  onShared,
}: {
  docId: string;
  title: string;
  description: string;
  buildHtml: () => string;
  context: DealDocumentContext;
  /** false hides "Upload Signed Copy" entirely — for a document that's
   * never signed (the Cost Estimate). */
  signable?: boolean;
  /** Fires once the signed-copy upload actually succeeds — not on every
   * tap of "Upload Signed Copy", and not on Replace of an already-signed
   * copy (the caller already knows about it by then). Used by
   * deal-paperwork.tsx to complete the timeline's 'contract' step for a
   * signable document: there's no e-sign/bank integration behind that
   * step, this upload is the real completion event. */
  onSigned?: () => void;
  /** Fires every time "Save / Share PDF" succeeds (no first-time-only
   * gating — unlike signing, sharing again later is a normal thing to do,
   * and re-firing a signal for a step that's already past 'current' is a
   * harmless no-op). Used for a non-`signable` document — the Cost
   * Estimate — as the real completion event in its place, since printing/
   * sharing it (to take to the VAT Office and bank) is the actual
   * customer action that matters here. */
  onShared?: () => void;
}) {
  const [isWorking, setIsWorking] = useState(false);
  const [signedUri, setSignedUri] = useState<string | null>(null);
  const [isUploadingSigned, setIsUploadingSigned] = useState(false);

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: buildHtml() });
    } catch {
      // A cancelled print dialog also lands here — not worth alarming
      // over, so no error alert unless something else actually fails.
    }
  };

  const handleShare = async () => {
    setIsWorking(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml() });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Saved', 'The PDF was created, but sharing isn’t available on this device.');
      }
      // Fire-and-forget: the real, durable copy of what was just shown/
      // shared, not a regeneration — see the file comment above.
      uploadGeneratedDocument(docId, uri, context).catch(() => {});
      onShared?.();
    } catch {
      Alert.alert('Something went wrong', 'Could not create the PDF — try Print instead.');
    } finally {
      setIsWorking(false);
    }
  };

  const captureSignedCopy = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Allow ${useCamera ? 'camera' : 'photo library'} access to add the signed copy.`);
      return;
    }
    const launch = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const isFirstUpload = signedUri == null;
    setIsUploadingSigned(true);
    try {
      const compressed = await compressPhoto(result.assets[0].uri);
      setSignedUri(compressed);
      await uploadSignedDocument(docId, compressed, context);
      if (isFirstUpload) onSigned?.();
    } finally {
      setIsUploadingSigned(false);
    }
  };

  const promptUploadSigned = () => {
    Alert.alert('Add Signed Copy', undefined, [
      { text: 'Take Photo', onPress: () => captureSignedCopy(true) },
      { text: 'Choose from Library', onPress: () => captureSignedCopy(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const shareSignedCopy = async () => {
    if (!signedUri) return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(signedUri);
    }
  };

  return (
    <View style={styles.docCard}>
      <Text style={styles.docTitle}>{title}</Text>
      <Text style={styles.docDesc}>{description}</Text>
      <View style={styles.docButtonRow}>
        <Pressable style={styles.docBtnSecondary} onPress={handlePrint}>
          <Text style={styles.docBtnSecondaryLabel}>Print</Text>
        </Pressable>
        <Pressable style={styles.docBtnPrimary} onPress={handleShare}>
          <Text style={styles.docBtnPrimaryLabel}>{isWorking ? 'Preparing…' : 'Save / Share PDF'}</Text>
        </Pressable>
      </View>

      {signable &&
        (signedUri ? (
          <Pressable style={styles.signedRow} onPress={shareSignedCopy}>
            <Image source={{ uri: signedUri }} style={styles.signedThumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <CheckCircleIcon size={13} />
                <Text style={styles.signedLabel}>Signed copy on file</Text>
              </View>
              <Text style={styles.signedSub}>Tap to share · Replace</Text>
            </View>
            <Pressable hitSlop={8} onPress={promptUploadSigned}>
              <Text style={styles.signedReplace}>Replace</Text>
            </Pressable>
          </Pressable>
        ) : (
          <Pressable style={styles.addSignedButton} onPress={promptUploadSigned} disabled={isUploadingSigned}>
            <PlusIcon size={14} color={Colors.navy} />
            <Text style={styles.addSignedLabel}>{isUploadingSigned ? 'Adding…' : 'Upload Signed Copy'}</Text>
          </Pressable>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  docCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 14,
    ...Shadow.card,
  },
  docTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.navy },
  docDesc: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 3, lineHeight: 18 },
  docButtonRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  docBtnSecondary: {
    flex: 1,
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBtnSecondaryLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.navy },
  docBtnPrimary: {
    flex: 1.6,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBtnPrimaryLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: '#fff' },
  addSignedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginTop: 10,
  },
  addSignedLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.navy },
  signedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenTint,
  },
  signedThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.navyTint },
  signedLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.text },
  signedSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  signedReplace: { fontFamily: Fonts.bodySemibold, fontSize: 11.5, color: Colors.red },
});

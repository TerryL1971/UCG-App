import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckCircleIcon, PlusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { isDenStock } from '@/constants/vro-checklists';
import {
  buildBillOfSaleHtml,
  buildCostEstimateHtml,
  buildPurchaseOrderHtml,
  computeDealPricing,
  money,
} from '@/lib/deal-documents';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';
import { useDealSync } from '@/lib/deal-sync';
import { uploadGeneratedDocument, uploadSignedDocument, type DealDocumentContext } from '@/lib/document-storage';
import { compressPhoto } from '@/lib/image';
import { useWarranty } from '@/lib/warranty-context';

/**
 * "Sign the paperwork" (Phase 7 of docs/end-to-end-flow.md) made real: a
 * Cost Estimate for a never-USAREUR-registered `DEN*****` car, or a
 * Purchase Order + Bill of Sale for everything else — generated as actual
 * printable PDFs from the customer's own deal data, the same `expo-print`
 * approach as wire-instructions.tsx. See docs/purchase-paperwork.md for
 * the two real paths this mirrors, and src/lib/deal-documents.ts for the
 * document content itself.
 *
 * Each card also does two things past just generating the PDF (Terry,
 * 2026-09-21 — "when documents are produced, they need to be loaded to
 * the app," and "a salesperson needs to sign and scan the document back
 * into the app"):
 *  - Saving/sharing a PDF also uploads that exact file to Storage
 *    (document-storage.ts) — a real, retrievable copy of what the
 *    customer actually saw, not just something regenerated live from
 *    whatever today's numbers are.
 *  - "Upload Signed Copy" captures a photo of the physically-signed
 *    paperwork and uploads it too. There's no separate salesperson-
 *    facing screen in this app (see docs/backend-and-ai-agent-plan.md) —
 *    this is captured from the same screen/device the customer already
 *    has the app open on, on the understanding that signing happens with
 *    both people present. The signed photo stays viewable/shareable for
 *    the rest of THIS app session (same as any other locally-captured
 *    photo elsewhere in the app) — reopening the app later won't show it
 *    again from here, since retrieving it back from Storage would need
 *    real per-customer auth this app doesn't have yet (see that file's
 *    comment on the anon-key/RLS tradeoff). Retrievable meanwhile from
 *    the Supabase dashboard, same as every other document in this bucket.
 */
function DocumentCard({
  docId,
  title,
  description,
  buildHtml,
  context,
}: {
  docId: string;
  title: string;
  description: string;
  buildHtml: () => string;
  context: DealDocumentContext;
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

    setIsUploadingSigned(true);
    try {
      const compressed = await compressPhoto(result.assets[0].uri);
      setSignedUri(compressed);
      await uploadSignedDocument(docId, compressed, context);
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

      {signedUri ? (
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
      )}
    </View>
  );
}

function Row({ label, value, bold, red }: { label: string; value: string; bold?: boolean; red?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold, red && styles.rowValueRed]}>{value}</Text>
    </View>
  );
}

export default function DealPaperworkScreen() {
  const { car } = useDeal();
  const { intake } = useDealIntake();
  const { state: dealState } = useDealSync();
  const { choice: warrantyChoice } = useWarranty();

  const hasPpp = warrantyChoice?.decision === 'accepted';
  const isDen = isDenStock(car?.stockNumber);
  const pricing = computeDealPricing(car, hasPpp);
  const carLabel = car ? `${car.year} ${car.title}` : 'your car';

  // Same context shape deal/documents.tsx sends with a license page —
  // whatever the app already knows about who/what this document is for,
  // attached at upload time so a salesperson can actually find it later.
  const docContext: DealDocumentContext = {
    customerName: intake?.fullName,
    customerContact: intake?.contact,
    carStockNumber: car?.stockNumber,
    carTitle: car ? `${car.year} ${car.title}` : undefined,
    base: intake?.base,
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Your Paperwork" subtitle={carLabel} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          {isDen
            ? 'This car has never been registered on the USAREUR system, so it goes through a Cost Estimate and the German VAT Form process instead of a standard Purchase Order.'
            : 'Real documents, filled in from your deal — print or share them to sign with your salesperson.'}
        </Text>

        <View style={styles.totalsCard}>
          <Text style={styles.totalsTitle}>Price Summary</Text>
          <Row label="Vehicle Price" value={money(pricing.vehiclePrice)} />
          {hasPpp && <Row label="2-Year Premium Protection Plan" value={money(pricing.pppAmount)} />}
          <Row label="Subtotal" value={money(pricing.subtotal)} bold />
          {isDen ? (
            <>
              <Row label="German VAT (19%)" value={money(pricing.vatAmount)} />
              <Row label="Cashier's Check Amount" value={money(pricing.totalWithVat)} bold red />
            </>
          ) : (
            <>
              <Row label="Down Payment" value={`-${money(pricing.holdAmount)}`} />
              <Row label="Amount Due Upon Delivery" value={money(pricing.balanceAfterHold)} bold red />
            </>
          )}
        </View>

        {isDen ? (
          <DocumentCard
            docId="cost-estimate"
            title="Cost Estimate"
            description="Price + German VAT — take 3–5 copies to the VAT Office and your bank for a Cashier's Check."
            buildHtml={() => buildCostEstimateHtml(car, intake, hasPpp)}
            context={docContext}
          />
        ) : (
          <>
            <DocumentCard
              docId="purchase-order"
              title="Purchase Order / Kaufvertrag"
              description="Finalizes your price and payment method."
              buildHtml={() => buildPurchaseOrderHtml(car, intake, dealState.financingTerms, hasPpp)}
              context={docContext}
            />
            <DocumentCard
              docId="bill-of-sale"
              title="Bill of Sale"
              description="Print 5 signed copies — these go to the base Customs Office next."
              buildHtml={() => buildBillOfSaleHtml(car, intake, hasPpp)}
              context={docContext}
            />
          </>
        )}

        <Pressable style={styles.roadCard} onPress={() => router.push('/road-to-plates')}>
          <Text style={styles.roadTitle}>What happens after I pay?  →</Text>
          <Text style={styles.roadSubtitle}>Customs, TÜV, the VAT/VRO process, and plates — in order.</Text>
        </Pressable>

        <Text style={styles.footerNote}>
          These are sample documents generated from your deal details, not the binding contract — UCG signs the
          official paperwork with you directly. Questions? Message your specialist.
        </Text>
        <Button
          label="Message My Specialist"
          variant="secondary"
          onPress={() => router.push('/salesperson')}
          style={styles.messageButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xl, paddingTop: 4 },
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20, marginTop: 4 },
  totalsCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    marginTop: 18,
  },
  totalsTitle: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.navy, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },
  rowLabelBold: { fontFamily: Fonts.bodyBold, color: Colors.text },
  rowValue: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.text },
  rowValueBold: { fontFamily: Fonts.display, fontSize: 15 },
  rowValueRed: { color: Colors.red },
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
  roadCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 18,
    ...Shadow.card,
  },
  roadTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.navy },
  roadSubtitle: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  footerNote: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textFaint, lineHeight: 18, marginTop: 22 },
  messageButton: { marginTop: 14 },
});

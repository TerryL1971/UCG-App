import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { useWarranty } from '@/lib/warranty-context';

/**
 * "Sign the paperwork" (Phase 7 of docs/end-to-end-flow.md) made real: a
 * Cost Estimate for a never-USAREUR-registered `DEN*****` car, or a
 * Purchase Order + Bill of Sale for everything else — generated as actual
 * printable PDFs from the customer's own deal data, the same `expo-print`
 * approach as wire-instructions.tsx. See docs/purchase-paperwork.md for
 * the two real paths this mirrors, and src/lib/deal-documents.ts for the
 * document content itself.
 */
function DocumentCard({
  title,
  description,
  buildHtml,
}: {
  title: string;
  description: string;
  buildHtml: () => string;
}) {
  const [isWorking, setIsWorking] = useState(false);

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
    } catch {
      Alert.alert('Something went wrong', 'Could not create the PDF — try Print instead.');
    } finally {
      setIsWorking(false);
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
              <Row label="Deposit Paid" value={`-${money(pricing.holdAmount)}`} />
              <Row label="Balance Due" value={money(pricing.balanceAfterHold)} bold red />
            </>
          )}
        </View>

        {isDen ? (
          <DocumentCard
            title="Cost Estimate"
            description="Price + German VAT — take 3–5 copies to the VAT Office and your bank for a Cashier's Check."
            buildHtml={() => buildCostEstimateHtml(car, intake, hasPpp)}
          />
        ) : (
          <>
            <DocumentCard
              title="Purchase Order"
              description="Finalizes your price and payment method."
              buildHtml={() => buildPurchaseOrderHtml(car, intake, dealState.financingTerms, hasPpp)}
            />
            <DocumentCard
              title="Bill of Sale"
              description="Print 5 signed copies — these go to the base Customs Office next."
              buildHtml={() => buildBillOfSaleHtml(car, intake, hasPpp)}
            />
          </>
        )}

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
  footerNote: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textFaint, lineHeight: 18, marginTop: 22 },
  messageButton: { marginTop: 14 },
});

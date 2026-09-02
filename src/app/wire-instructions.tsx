import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { wireInstructions } from '@/constants/mock-data';

/**
 * Real wire instructions for a cash deal — see the comment on
 * `wireInstructions` in mock-data.ts for provenance/precision notes.
 * Shown on screen AND generated as an actual PDF (`expo-print`) so it's
 * genuinely printable/downloadable, not just readable in the app —
 * that was Terry's explicit ask, not something to fake with a plain
 * share-the-screen-text button.
 */
function buildHtml(): string {
  const { adminOffice, supportWhatsapp, step1, step2 } = wireInstructions;
  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: #20263F; padding: 24px;">
        <h2 style="color: #273368;">The Used Car Guys</h2>
        <p style="font-size: 13px; color: #555;">
          Admin Office: ${adminOffice.phone}<br/>
          Email: ${adminOffice.email}<br/>
          U.S.A fax number: ${adminOffice.usFax}<br/>
          ${adminOffice.address}
        </p>
        <h3 style="color: #C33531;">WIRE INSTRUCTIONS FOR THE USED CAR GUYS US$ ACCOUNT</h3>
        <p>Please pass this information to your loan service representative. This is what's called a
          <b>"TWO STEP TRANSFER"</b>.</p>

        <h4>${step1.label}</h4>
        <p>Send funds to <b>${step1.bank}</b></p>
        <table style="font-size: 14px;">
          <tr><td style="padding-right: 16px;">Account #:</td><td><b>${step1.account}</b></td></tr>
          <tr><td style="padding-right: 16px;">SWIFT/BIC:</td><td><b>${step1.swiftBic}</b></td></tr>
          <tr><td style="padding-right: 16px;">ABA Routing:</td><td><b>${step1.abaRouting}</b></td></tr>
        </table>

        <h4>${step2.label}</h4>
        <p><b>${step2.bank}</b></p>
        <table style="font-size: 14px;">
          <tr><td style="padding-right: 16px;">IBAN:</td><td><b>${step2.iban}</b></td></tr>
          <tr><td style="padding-right: 16px;">SWIFT/BIC:</td><td><b>${step2.swiftBic}</b></td></tr>
        </table>

        <p style="margin-top: 24px; font-size: 13px;">
          If you or the bank teller are having any issue or have any questions, please call or WhatsApp our
          mobile number on +${supportWhatsapp}.
        </p>
      </body>
    </html>
  `;
}

export default function WireInstructionsScreen() {
  const [isWorking, setIsWorking] = useState(false);

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: buildHtml() });
    } catch {
      // A cancelled print dialog also lands here — not worth alarming
      // over, so no error alert unless something else actually fails.
    }
  };

  const handleSharePdf = async () => {
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

  const { adminOffice, supportWhatsapp, step1, step2 } = wireInstructions;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Wire Instructions" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.companyName}>The Used Car Guys</Text>
        <Text style={styles.companyMeta}>
          Admin Office: {adminOffice.phone}
          {'\n'}Email: {adminOffice.email}
          {'\n'}U.S.A fax number: {adminOffice.usFax}
          {'\n'}
          {adminOffice.address}
        </Text>

        <Text style={styles.title}>WIRE INSTRUCTIONS FOR THE USED CAR GUYS US$ ACCOUNT</Text>
        <Text style={styles.body_text}>
          Please pass this information to your loan service representative. This is what&apos;s called a{' '}
          <Text style={styles.bold}>&ldquo;TWO STEP TRANSFER.&rdquo;</Text>
        </Text>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>{step1.label}</Text>
          <Text style={styles.body_text}>
            Send funds to <Text style={styles.bold}>{step1.bank}</Text>
          </Text>
          <Row label="Account #" value={step1.account} />
          <Row label="SWIFT/BIC" value={step1.swiftBic} />
          <Row label="ABA Routing" value={step1.abaRouting} />
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>{step2.label}</Text>
          <Text style={[styles.body_text, styles.bold]}>{step2.bank}</Text>
          <Row label="IBAN" value={step2.iban} />
          <Row label="SWIFT/BIC" value={step2.swiftBic} />
        </View>

        <Text style={styles.footerNote}>
          If you or the bank teller are having any issue or have any questions, please call or WhatsApp our
          mobile number on +{supportWhatsapp}.
        </Text>

        <Button label="Print" onPress={handlePrint} style={styles.button} />
        <Button
          label={isWorking ? 'Preparing PDF…' : 'Save / Share as PDF'}
          variant="secondary"
          onPress={handleSharePdf}
          style={styles.button}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xl, paddingTop: 4 },
  companyName: { fontFamily: Fonts.display, fontSize: 20, color: Colors.navy },
  companyMeta: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 19, marginTop: 4 },
  title: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.red, marginTop: 20, lineHeight: 21 },
  body_text: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.text, lineHeight: 20, marginTop: 8 },
  bold: { fontFamily: Fonts.bodyBold },
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    marginTop: 16,
  },
  stepLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.navy },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  rowLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },
  rowValue: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  footerNote: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
    color: Colors.textMuted,
    lineHeight: 19,
    marginTop: 20,
  },
  button: { marginTop: 14 },
});

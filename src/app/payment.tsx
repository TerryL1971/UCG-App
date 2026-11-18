import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeadlineBanner } from '@/components/deal-ui';
import { InsurancePrompt } from '@/components/insurance-prompt';
import { ShieldIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  lenderWireInstructions,
  PAYMENT_HELP_PHONE,
  paymentReference,
  UCG_LEGAL_NAME,
  wiseAccount,
} from '@/constants/payment-instructions';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { messageSalesperson } from '@/lib/whatsapp';
import { balanceDue, currentDeadline, flowOf, formatMoney } from '@/lib/deal-flow';
import { useMyDeals } from '@/lib/my-deals-context';

/**
 * How to pay — the right instructions for this deal, and only these:
 *  - non-DEN, paying cash → wire the balance to UCG's Wise USD account
 *  - non-DEN, financed    → the lender pays UCG (two-step sheet kept for
 *                           a loan officer who asks)
 *  - DEN                  → cashier's check for the Total Price (no MWST)
 *                           or approved loan paperwork; never a deposit
 *
 * Bank details come only from constants/payment-instructions.ts, never
 * from a message — that's the wire-fraud protection.
 */
export default function PaymentScreen() {
  const { selected, refresh } = useMyDeals();

  if (!selected) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScreenHeader title="Payment" />
        <Text style={styles.note}>Start your car plan on My Deal first.</Text>
      </SafeAreaView>
    );
  }

  const { deal, milestones } = selected;
  const flow = flowOf(deal);
  const deadline = currentDeadline(deal, milestones, undefined, selected.files);
  const paid = milestones.some((m) => m.milestone === 'paid_in_full');
  const reference = paymentReference(deal.stock_number, deal.deal_number);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Payment" subtitle={`Deal #${deal.deal_number}`} />
      <ScrollView contentContainerStyle={styles.content}>
        {paid && (
          <View style={[styles.card, styles.paidCard]}>
            <Text style={styles.paidText}>UCG has received your payment in full. Nothing more to pay.</Text>
          </View>
        )}
        {deadline && !paid && <DeadlineBanner deadline={deadline} />}

        {flow === 'sale' ? (
          <View style={[styles.card, Shadow.card]}>
            <Text style={styles.cardTitle}>UCG pays you</Text>
            <Text style={styles.body}>
              For a car you sell to UCG, UCG pays you (or your lender) within 30 days of the deregistration date. You
              don&apos;t pay anything.
            </Text>
          </View>
        ) : flow === 'purchase_den' ? (
          <DenInstructions totalPrice={Number(deal.total_price)} />
        ) : deal.payment_method === 'finance' ? (
          <FinanceInstructions balance={balanceDue(deal)} lender={deal.lender} />
        ) : (
          <WireInstructions
            balance={balanceDue(deal)}
            reference={reference}
            paid={paid}
            onSent={() =>
              messageSalesperson(deal, `I've sent my wire of ${formatMoney(balanceDue(deal))}.`)
            }
          />
        )}

        {flow !== 'sale' && !milestones.some((m) => m.milestone === 'insured') && (
          <InsurancePrompt deal={deal} userId={deal.customer_id ?? ''} onChanged={refresh} />
        )}

        <View style={[styles.card, styles.fraudCard]}>
          <ShieldIcon size={20} color={Colors.red} />
          <Text style={styles.fraudText}>
            UCG will never send you new bank details by message, email or WhatsApp. If anyone does, don&apos;t pay. Call
            your salesperson first.
          </Text>
        </View>

        <Text style={styles.help}>
          Questions, or is your bank teller stuck? Call or WhatsApp UCG on {PAYMENT_HELP_PHONE}.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function WireInstructions({
  balance,
  reference,
  paid,
  onSent,
}: {
  balance: number;
  reference: string;
  paid: boolean;
  onSent: () => void;
}) {
  return (
    <>
      <View style={[styles.card, Shadow.card]}>
        <Text style={styles.kicker}>Balance due</Text>
        <Text style={styles.amount}>{formatMoney(balance)}</Text>
        <Text style={styles.body}>
          Your total price minus the $300 deposit you already paid. Send it as a bank wire or ACH transfer to UCG&apos;s US
          dollar account below.
        </Text>
      </View>

      <View style={[styles.card, Shadow.card]}>
        <Text style={styles.cardTitle}>From a US bank (wire or ACH)</Text>
        <CopyRow label="Account name" value={wiseAccount.name} />
        <CopyRow label="Routing number (wire and ACH)" value={wiseAccount.routingNumber} />
        <CopyRow label="Account number" value={wiseAccount.accountNumber} />
        <CopyRow label="Account type" value={wiseAccount.accountType} />
        <CopyRow label="Reference / memo" value={reference} />
      </View>

      <View style={[styles.card, Shadow.card]}>
        <Text style={styles.cardTitle}>From outside the US (SWIFT)</Text>
        <CopyRow label="Account name" value={wiseAccount.name} />
        <CopyRow label="Account number" value={wiseAccount.accountNumber} />
        <CopyRow label="SWIFT / BIC" value={wiseAccount.swiftBic} />
        <CopyRow label="Bank" value={`${wiseAccount.bankName}, ${wiseAccount.bankAddress}`} />
        <CopyRow label="Reference / memo" value={reference} />
      </View>

      {!paid && (
        <Button
          label="I've Sent the Payment"
          onPress={() =>
            Alert.alert('Tell your salesperson?', 'This opens WhatsApp with a message to your salesperson, so they know to look out for it.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Send', onPress: onSent },
            ])
          }
        />
      )}
    </>
  );
}

function FinanceInstructions({ balance, lender }: { balance: number; lender: string | null }) {
  const [showSheet, setShowSheet] = useState(false);
  const w = lenderWireInstructions;
  return (
    <>
      <View style={[styles.card, Shadow.card]}>
        <Text style={styles.kicker}>Paid by your lender</Text>
        <Text style={styles.amount}>{formatMoney(balance)}</Text>
        <Text style={styles.body}>
          {lender ? `${lender} pays` : 'Your lender pays'} UCG directly. Lenders already have UCG&apos;s wire
          instructions, so there&apos;s nothing for you to send. You&apos;ll see it here as soon as UCG receives the funds.
        </Text>
      </View>
      <Text style={styles.link} onPress={() => setShowSheet((v) => !v)}>
        {showSheet ? 'Hide' : 'Show'} UCG&apos;s wire instructions for your loan officer
      </Text>
      {showSheet && (
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.cardTitle}>Two-step transfer</Text>
          <Text style={styles.body}>Step 1 — wire to Citibank, New York:</Text>
          <CopyRow label="Bank" value={w.step1.bank} />
          <CopyRow label="Account #" value={w.step1.accountNumber} />
          <CopyRow label="SWIFT / BIC" value={w.step1.swiftBic} />
          <CopyRow label="ABA routing" value={w.step1.abaRouting} />
          <Text style={[styles.body, { marginTop: 10 }]}>
            Step 2 — the bank must also instruct a &quot;further credit&quot; to UCG&apos;s USD account at Commerzbank, at
            the time of the wire. It does not happen automatically.
          </Text>
          <CopyRow label="Recipient" value={w.step2.recipient} />
          <CopyRow label="Bank" value={w.step2.bank} />
          <CopyRow label="IBAN" value={w.step2.iban} />
          <CopyRow label="SWIFT / BIC" value={w.step2.swiftBic} />
        </View>
      )}
    </>
  );
}

function DenInstructions({ totalPrice }: { totalPrice: number }) {
  return (
    <>
      <View style={[styles.card, Shadow.card]}>
        <Text style={styles.kicker}>Cashier&apos;s check amount</Text>
        <Text style={styles.amount}>{formatMoney(totalPrice)}</Text>
        <Text style={styles.body}>
          This is the <Text style={styles.bold}>Total Price</Text> on your Cost Estimate. Do not use the larger
          &quot;Total Amount&quot; that includes German VAT (MWST 19%) — the VAT form removes it.
        </Text>
        <CopyRow label="Make the check payable to" value={UCG_LEGAL_NAME} />
      </View>
      <View style={[styles.card, Shadow.card]}>
        <Text style={styles.cardTitle}>Then</Text>
        <Text style={styles.body}>
          1. Get the cashier&apos;s check from your bank, or approved loan paperwork from your lender if you&apos;re
          financing.{'\n'}
          2. Take it with your Cost Estimate to the VAT office on base. The VAT form costs $100.{'\n'}
          3. Bring the VAT forms and the check to your salesperson, who scans them into the app.
        </Text>
      </View>
    </>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Pressable style={styles.copyRow} onPress={copy}>
      <View style={{ flex: 1 }}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text style={styles.copyValue} selectable>
          {value}
        </Text>
      </View>
      <Text style={[styles.copyAction, copied && { color: Colors.green }]}>{copied ? 'Copied' : 'Copy'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  note: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center', margin: Spacing.xxl },
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg },
  paidCard: { backgroundColor: Colors.greenTint },
  paidText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.green },
  kicker: { fontFamily: Fonts.bodyBold, fontSize: 11.5, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  amount: { fontFamily: Fonts.display, fontSize: 32, color: Colors.navy, marginTop: 2 },
  cardTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text, marginBottom: 6 },
  body: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20, marginTop: 4 },
  bold: { fontFamily: Fonts.bodyBold, color: Colors.text },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  copyLabel: { fontFamily: Fonts.bodySemibold, fontSize: 11.5, color: Colors.textFaint },
  copyValue: { fontFamily: Fonts.bodySemibold, fontSize: 15, color: Colors.text, marginTop: 1 },
  copyAction: { fontFamily: Fonts.bodyBold, fontSize: 12.5, color: Colors.navy },
  fraudCard: { flexDirection: 'row', gap: 10, backgroundColor: Colors.redTint, alignItems: 'flex-start' },
  fraudText: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.redDark, lineHeight: 18 },
  help: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  link: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.navy, textDecorationLine: 'underline', textAlign: 'center' },
});

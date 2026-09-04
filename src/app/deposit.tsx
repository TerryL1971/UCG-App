import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { HOLD_AMOUNT } from '@/constants/mock-data';
import { isDenStock } from '@/constants/vro-checklists';
import { parseJsonResponse } from '@/lib/api-fetch';
import { useDeal } from '@/lib/deal-context';
import { useDealSync } from '@/lib/deal-sync';

/**
 * Real decision, confirmed by Terry (Sept 1): a flat $300.00 USD, not a
 * percentage of price (see `HOLD_AMOUNT` in mock-data.ts). This is no
 * longer a placeholder — see docs/deal-flow-roadmap.md's "Make A Deposit"
 * section. Still running through PayPal *Sandbox* until real/live
 * credentials replace the ones in `.env` (see that doc for what else
 * "going live" needs beyond this), so no real money moves yet even though
 * the number itself is real.
 *
 * On a DEN**** car (EU-spec, never USAREUR-registered) this payment can't
 * legally be called a "deposit" — VAT-Form purchases don't allow one — so
 * it's presented as a refundable **reservation fee**. See
 * docs/purchase-paperwork.md.
 */
const DEPOSIT_AMOUNT = HOLD_AMOUNT;

type DepositStatus = 'idle' | 'opening' | 'capturing' | 'success' | 'cancelled' | 'error';

export default function DepositScreen() {
  const { car } = useDeal();
  const { send: sendDealSignal } = useDealSync();
  const carLabel = car ? `${car.year} ${car.title}` : 'your car';
  const isReservationFee = isDenStock(car?.stockNumber);
  const feeNoun = isReservationFee ? 'reservation fee' : 'deposit';
  const feeNounTitle = isReservationFee ? 'Reservation Fee' : 'Deposit';
  const [status, setStatus] = useState<DepositStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const startDeposit = async () => {
    setStatus('opening');
    setErrorMessage('');

    const returnUrl = Linking.createURL('deposit-return');
    const cancelUrl = Linking.createURL('deposit-cancel');

    try {
      const createRes = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: DEPOSIT_AMOUNT,
          description: `${isReservationFee ? 'Reservation fee' : 'Deposit'} to hold the ${carLabel} for 5 days`,
          returnUrl,
          cancelUrl,
        }),
      });
      const createData = await parseJsonResponse<{ approveUrl?: string; orderId?: string; error?: string }>(
        createRes,
      );
      if (!createRes.ok || !createData.approveUrl) {
        throw new Error(createData.error ?? 'Could not start checkout');
      }

      const result = await WebBrowser.openAuthSessionAsync(createData.approveUrl, returnUrl);

      if (result.type !== 'success') {
        setStatus('cancelled');
        return;
      }

      setStatus('capturing');
      const captureRes = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: createData.orderId }),
      });
      const captureData = await parseJsonResponse<{ status?: string; error?: string }>(captureRes);
      if (!captureRes.ok || captureData.status !== 'COMPLETED') {
        throw new Error(captureData.error ?? 'Payment could not be confirmed');
      }

      setStatus('success');
      // The deposit is the customer action that completes "Matched" and
      // reserves the car — report it to the deal-sync backend.
      sendDealSignal({ type: 'deposit-paid' });
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Hold Your Car" subtitle={carLabel} />

      <View style={styles.body}>
        {status === 'success' ? (
          <>
            <CheckCircleIcon size={56} />
            <Text style={styles.title}>You&apos;re Holding This Car</Text>
            <Text style={styles.body_text}>
              Your {feeNoun} is confirmed. The {carLabel} is on hold for 5 days while your specialist puts the rest
              of your deal together.
              {isReservationFee
                ? ' You get this reservation fee back — on an EU-spec car it can’t be a deposit.'
                : ''}
            </Text>
            <Button
              label="Next: Add-Ons  →"
              onPress={() => router.replace('/add-ons')}
              style={styles.button}
            />
            <Button
              label="Back to My Deal"
              variant="secondary"
              onPress={() => router.replace('/(tabs)/deal')}
              style={styles.buttonStacked}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>Reserve the {carLabel}</Text>
            <Text style={styles.body_text}>
              {isReservationFee ? (
                <>
                  A refundable <Text style={styles.bold}>reservation fee</Text> puts a{' '}
                  <Text style={styles.bold}>5-day hold</Text> on this car. On an EU-spec car this can’t be a
                  deposit &mdash; VAT rules &mdash; so you get it back.
                </>
              ) : (
                <>
                  A refundable <Text style={styles.bold}>deposit</Text> puts a{' '}
                  <Text style={styles.bold}>5-day hold</Text> on this car &mdash; on the website and with UCG
                  &mdash; while the rest of your deal comes together.
                </>
              )}
            </Text>

            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>{feeNounTitle}</Text>
              <Text style={styles.amountValue}>${DEPOSIT_AMOUNT}</Text>
              <Text style={styles.amountNote}>Sandbox mode — no real charge yet.</Text>
            </View>

            {(status === 'opening' || status === 'capturing') && (
              <View style={styles.statusRow}>
                <ActivityIndicator color={Colors.navy} />
                <Text style={styles.statusText}>
                  {status === 'opening' ? 'Opening PayPal…' : 'Confirming your payment…'}
                </Text>
              </View>
            )}

            {status === 'cancelled' && <Text style={styles.errorText}>Checkout was cancelled — nothing was charged.</Text>}
            {status === 'error' && <Text style={styles.errorText}>{errorMessage}</Text>}

            <Button
              label={isReservationFee ? 'Pay Reservation Fee with PayPal' : 'Pay Deposit with PayPal'}
              onPress={startDeposit}
              style={styles.button}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingTop: 24, gap: 6 },
  title: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text, textAlign: 'center', marginTop: 8 },
  body_text: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 21, marginTop: 6 },
  bold: { fontFamily: Fonts.bodyBold, color: Colors.text },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 20,
    alignItems: 'center',
    width: '100%',
    marginTop: 22,
  },
  amountLabel: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  amountValue: { fontFamily: Fonts.display, fontSize: 34, color: Colors.red, marginTop: 4 },
  amountNote: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textFaint, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  statusText: { fontFamily: Fonts.bodySemibold, fontSize: 13.5, color: Colors.textMuted },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.red,
    textAlign: 'center',
    marginTop: 18,
  },
  button: { width: '100%', marginTop: 26 },
  buttonStacked: { width: '100%', marginTop: 10 },
});

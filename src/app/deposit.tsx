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
import { useDeal } from '@/lib/deal-context';

/**
 * The deposit's actual dollar amount is a real open business decision
 * (fixed $ vs. a % of price — see docs/deal-flow-roadmap.md) that hasn't
 * been made yet. This is deliberately a labeled TEST amount, not a real
 * one — don't quietly turn this into the real figure without that
 * decision actually being made, and don't let this screen go live with
 * real PayPal credentials while it's still a placeholder.
 */
const TEST_DEPOSIT_AMOUNT = '50.00';

type DepositStatus = 'idle' | 'opening' | 'capturing' | 'success' | 'cancelled' | 'error';

export default function DepositScreen() {
  const { car } = useDeal();
  const carLabel = car ? `${car.year} ${car.title}` : 'your car';
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
          amount: TEST_DEPOSIT_AMOUNT,
          description: `Deposit to hold the ${carLabel} for 5 days`,
          returnUrl,
          cancelUrl,
        }),
      });
      const createData = await createRes.json();
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
      const captureData = await captureRes.json();
      if (!captureRes.ok || captureData.status !== 'COMPLETED') {
        throw new Error(captureData.error ?? 'Payment could not be confirmed');
      }

      setStatus('success');
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
              Your deposit is confirmed. The {carLabel} is on hold for 5 days while your specialist puts the rest
              of your deal together.
            </Text>
            <Button label="Back to My Deal" onPress={() => router.replace('/(tabs)/deal')} style={styles.button} />
          </>
        ) : (
          <>
            <Text style={styles.title}>Reserve the {carLabel}</Text>
            <Text style={styles.body_text}>
              A refundable deposit puts a <Text style={styles.bold}>5-day hold</Text> on this car — on the website
              and with UCG — while the rest of your deal comes together.
            </Text>

            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Deposit Amount</Text>
              <Text style={styles.amountValue}>${TEST_DEPOSIT_AMOUNT}</Text>
              <Text style={styles.amountNote}>Test amount — sandbox mode, no real charge.</Text>
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
              label="Pay Deposit with PayPal"
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
});

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useMyDeals } from '@/lib/my-deals-context';

/**
 * Deal # + last name → the customer's deal. Both are printed on their
 * paperwork (top right of the Purchase Order, Cost Estimate or Bill of
 * Sale), so there's no code for anyone to hand out.
 */
export function ConnectDealForm({ onConnected }: { onConnected?: () => void }) {
  const { connectDeal } = useMyDeals();
  const [dealNumber, setDealNumber] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!dealNumber.trim() || !lastName.trim()) {
      setError('Enter both your Deal # and your last name.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await connectDeal(dealNumber, lastName);
    setBusy(false);
    if (result.ok) {
      setDealNumber('');
      setLastName('');
      onConnected?.();
      return;
    }
    setError(
      result.reason === 'not_found'
        ? "We couldn't find a deal with that Deal # and last name. Check both against your paperwork. If they match, your salesperson may not have added your deal to the app yet."
        : result.reason === 'too_many_attempts'
          ? 'Too many tries in the last hour. Please wait a little, or ask your salesperson.'
          : "Couldn't connect right now. Check your connection and try again.",
    );
  };

  return (
    <View style={[styles.card, Shadow.card]}>
      <Text style={styles.title}>Connect your deal</Text>
      <Text style={styles.body}>
        Your Deal # is at the top right of your Purchase Order, Cost Estimate or Bill of Sale. Use the last name printed
        on it.
      </Text>
      <Field
        label="Deal #"
        value={dealNumber}
        onChangeText={setDealNumber}
        placeholder="e.g. 17724"
        keyboardType="number-pad"
        autoCorrect={false}
      />
      <Field
        label="Last name"
        value={lastName}
        onChangeText={setLastName}
        placeholder="As printed on your paperwork"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={submit}
        error={error ?? undefined}
      />
      <Button label={busy ? 'Connecting…' : 'Connect My Deal'} onPress={submit} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.xl },
  title: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  body: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 19, marginTop: 4, marginBottom: 16 },
});

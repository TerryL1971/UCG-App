import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

/**
 * USD ↔ EUR — UCG prices, the 550 and wires are in dollars, while German
 * costs (MWST, TÜV, insurance) are in euros. Rate: the European Central
 * Bank's daily reference rate via the free Frankfurter API (no key, no
 * personal data sent). The last rate is remembered for offline use.
 */
const RATE_URL = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR';
const CACHE_KEY = 'ucg.usdEurRate';

interface Rate {
  usdToEur: number;
  date: string;
}

export default function CurrencyScreen() {
  const [rate, setRate] = useState<Rate | null>(null);
  const [failed, setFailed] = useState(false);
  const [amount, setAmount] = useState('1000');
  const [fromUsd, setFromUsd] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (raw && !cancelled) setRate((r) => r ?? (JSON.parse(raw) as Rate));
      })
      .catch(() => {});
    fetch(RATE_URL)
      .then((r) => r.json())
      .then((data: { date: string; rates: { EUR: number } }) => {
        if (cancelled || !data?.rates?.EUR) return;
        const next = { usdToEur: data.rates.EUR, date: data.date };
        setRate(next);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = Number(amount.replace(/[^0-9.]/g, '')) || 0;
  const result = rate ? (fromUsd ? value * rate.usdToEur : value / rate.usdToEur) : null;
  const fmt = (n: number, cur: 'USD' | 'EUR') =>
    n.toLocaleString(cur === 'USD' ? 'en-US' : 'de-DE', { style: 'currency', currency: cur, maximumFractionDigits: 2 });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Currency Converter" subtitle="US dollars and euros" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.switchRow}>
          <Pressable style={[styles.seg, fromUsd && styles.segActive]} onPress={() => setFromUsd(true)}>
            <Text style={[styles.segLabel, fromUsd && styles.segLabelActive]}>$ → €</Text>
          </Pressable>
          <Pressable style={[styles.seg, !fromUsd && styles.segActive]} onPress={() => setFromUsd(false)}>
            <Text style={[styles.segLabel, !fromUsd && styles.segLabelActive]}>€ → $</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{fromUsd ? 'US dollars' : 'Euros'}</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.input} selectTextOnFocus />
          <Text style={[styles.label, { marginTop: 16 }]}>{fromUsd ? 'Euros' : 'US dollars'}</Text>
          {result === null ? (
            failed ? (
              <Text style={styles.note}>Couldn&apos;t get today&apos;s rate. Check your connection.</Text>
            ) : (
              <ActivityIndicator color={Colors.navy} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
            )
          ) : (
            <Text style={styles.result}>{fmt(result, fromUsd ? 'EUR' : 'USD')}</Text>
          )}
        </View>

        {rate && (
          <Text style={styles.note}>
            1 US dollar = {rate.usdToEur.toFixed(4)} euros · European Central Bank reference rate, {rate.date}. Your
            bank&apos;s rate will differ a little.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: Spacing.lg },
  switchRow: { flexDirection: 'row', gap: 8 },
  seg: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  segLabel: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  segLabelActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg },
  label: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    marginTop: 6,
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.text,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingVertical: 4,
  },
  result: { fontFamily: Fonts.display, fontSize: 30, color: Colors.navy, marginTop: 6 },
  note: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 18 },
});

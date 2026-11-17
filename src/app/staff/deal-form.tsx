import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useChat } from '@/lib/chat-context';
import { DEMO_MODE } from '@/lib/demo-mode';
import { toIsoDate } from '@/lib/deal-flow';
import { createDeal, fetchDealBundle, updateDeal, type DealKind, type NewDeal, type PaymentMethod } from '@/lib/deals';

/**
 * A salesperson types the handful of fields the app needs straight off
 * the paperwork: Purchase Order (buying), Cost Estimate (DEN) or Bill of
 * Sale (selling). This is the stand-in until the app can read those PDFs
 * by itself — the same fields, filled automatically, later.
 */
export default function StaffDealFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const { staffProfile } = useChat();

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [kind, setKind] = useState<DealKind>('purchase');
  const [isDen, setIsDen] = useState(false);
  const [dealNumber, setDealNumber] = useState('');
  const [stockNumber, setStockNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [lastName, setLastName] = useState('');
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [vin, setVin] = useState('');
  const [odometer, setOdometer] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [deposit, setDeposit] = useState('300');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [lender, setLender] = useState('');
  const [documentDate, setDocumentDate] = useState(toIsoDate(new Date()));
  const [payDays, setPayDays] = useState('7');

  useEffect(() => {
    if (!id) return;
    fetchDealBundle(id)
      .then((bundle) => {
        if (!bundle) return;
        const d = bundle.deal;
        setKind(d.kind);
        setIsDen(d.is_den);
        setDealNumber(d.deal_number);
        setStockNumber(d.stock_number);
        setCustomerName(d.customer_name);
        setLastName(d.customer_last_name);
        setLastNameTouched(true);
        setYear(d.vehicle_year ? String(d.vehicle_year) : '');
        setMake(d.vehicle_make ?? '');
        setModel(d.vehicle_model ?? '');
        setColor(d.vehicle_color ?? '');
        setVin(d.vin);
        setOdometer(d.odometer !== null ? String(d.odometer) : '');
        setTotalPrice(String(d.total_price));
        setDeposit(String(d.deposit));
        setPaymentMethod(d.payment_method ?? 'cash');
        setLender(d.lender ?? '');
        setDocumentDate(d.document_date);
        setPayDays(String(d.pay_in_full_days));
      })
      .catch(() => Alert.alert("Couldn't load that deal", 'Go back and try again.'))
      .finally(() => setLoading(false));
  }, [id]);

  const purchaseNonDen = kind === 'purchase' && !isDen;

  const onNameChange = (value: string) => {
    setCustomerName(value);
    if (!lastNameTouched) {
      const parts = value.trim().split(/\s+/);
      setLastName(parts.length > 1 ? parts[parts.length - 1] : '');
    }
  };

  const parseMoney = (value: string) => Number(value.replace(/[^0-9.]/g, ''));

  const save = async () => {
    const next: Record<string, string> = {};
    if (!dealNumber.trim()) next.dealNumber = 'Required — top right of the paperwork.';
    if (!stockNumber.trim()) next.stockNumber = 'Required.';
    if (!customerName.trim()) next.customerName = 'Required.';
    if (!lastName.trim()) next.lastName = 'Required — the customer types this to connect.';
    const cleanVin = vin.replace(/\s/g, '').toUpperCase();
    if (cleanVin.length < 11 || cleanVin.length > 17) next.vin = 'A VIN is 17 characters (older cars can be shorter).';
    const price = parseMoney(totalPrice);
    if (!totalPrice.trim() || !Number.isFinite(price)) next.totalPrice = 'Required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(documentDate.trim())) next.documentDate = 'Use YYYY-MM-DD, e.g. 2026-11-17.';
    const yearNum = year.trim() ? Number(year) : null;
    if (yearNum !== null && (!Number.isInteger(yearNum) || yearNum < 1950 || yearNum > 2100)) next.year = 'Four digits.';
    const days = Number(payDays);
    if (purchaseNonDen && (!Number.isInteger(days) || days < 1 || days > 60)) next.payDays = 'Days, from term 2.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (cleanVin.length !== 17) {
      const go = await new Promise<boolean>((resolve) =>
        Alert.alert('VIN is not 17 characters', `"${cleanVin}" has ${cleanVin.length}. Save anyway?`, [
          { text: 'Fix it', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Save', onPress: () => resolve(true) },
        ]),
      );
      if (!go) return;
    }

    const input: NewDeal = {
      kind,
      is_den: kind === 'purchase' && isDen,
      deal_number: dealNumber.trim(),
      stock_number: stockNumber.trim(),
      customer_name: customerName.trim(),
      customer_last_name: lastName.trim(),
      vehicle_year: yearNum,
      vehicle_make: make.trim() || null,
      vehicle_model: model.trim() || null,
      vehicle_color: color.trim() || null,
      vin: cleanVin,
      odometer: odometer.trim() ? Math.round(parseMoney(odometer)) : null,
      total_price: price,
      // No deposit is ever recorded on a DEN deal (VAT rules) or a sale.
      deposit: purchaseNonDen ? parseMoney(deposit) || 0 : 0,
      payment_method: kind === 'purchase' ? paymentMethod : null,
      lender: kind === 'purchase' && paymentMethod === 'finance' ? lender.trim() || null : null,
      document_date: documentDate.trim(),
      pay_in_full_days: purchaseNonDen ? days : 7,
    };

    setSaving(true);
    const result = editing && id ? await updateDeal(id, input) : await createDeal(input);
    setSaving(false);
    if (!result.ok) {
      if (result.reason === 'duplicate_deal_number') {
        setErrors({ dealNumber: 'A deal with this Deal # is already in the app.' });
      } else {
        Alert.alert("Couldn't save", result.message ?? 'Check your connection and try again.');
      }
      return;
    }
    if (editing) {
      router.back();
    } else {
      router.replace({ pathname: '/staff/deal/[id]', params: { id: result.deal.id } });
    }
  };

  if (!staffProfile && !DEMO_MODE) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Deal" />
        <Text style={styles.note}>This screen is only for UCG staff accounts.</Text>
      </SafeAreaView>
    );
  }

  const paperwork = kind === 'sale' ? 'Bill of Sale' : isDen ? 'Cost Estimate' : 'Purchase Order';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={editing ? 'Edit Deal' : 'New Deal'} subtitle={`Copy these from the ${paperwork}`} />
      {loading ? (
        <ActivityIndicator color={Colors.navy} style={{ marginTop: 32 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Deal type</Text>
            <Segmented
              options={[
                { value: 'purchase', label: 'Customer buying' },
                { value: 'sale', label: 'Customer selling' },
              ]}
              value={kind}
              onChange={(v) => setKind(v as DealKind)}
            />
            {kind === 'purchase' && (
              <>
                <Text style={styles.label}>Car</Text>
                <Segmented
                  options={[
                    { value: 'no', label: 'Regular (Purchase Order)' },
                    { value: 'yes', label: 'DEN (Cost Estimate)' },
                  ]}
                  value={isDen ? 'yes' : 'no'}
                  onChange={(v) => setIsDen(v === 'yes')}
                />
                {isDen && (
                  <Text style={styles.hint}>
                    DEN deals never show a deposit or reservation to the customer — no deposit is recorded.
                  </Text>
                )}
              </>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Deal #" value={dealNumber} onChangeText={setDealNumber} keyboardType="number-pad" error={errors.dealNumber} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Stock #" value={stockNumber} onChangeText={setStockNumber} autoCapitalize="characters" error={errors.stockNumber} />
              </View>
            </View>

            <Field
              label={kind === 'sale' ? 'Seller (customer) name' : 'Purchaser name'}
              value={customerName}
              onChangeText={onNameChange}
              autoCapitalize="words"
              error={errors.customerName}
            />
            <Field
              label="Last name (for connecting)"
              value={lastName}
              onChangeText={(v) => {
                setLastNameTouched(true);
                setLastName(v);
              }}
              autoCapitalize="words"
              error={errors.lastName}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" error={errors.year} />
              </View>
              <View style={{ flex: 2 }}>
                <Field label="Make" value={make} onChangeText={setMake} autoCapitalize="words" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Field label="Model" value={model} onChangeText={setModel} autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Color" value={color} onChangeText={setColor} autoCapitalize="words" />
              </View>
            </View>
            <Field label="VIN" value={vin} onChangeText={setVin} autoCapitalize="characters" autoCorrect={false} error={errors.vin} />
            <Field label="Odometer" value={odometer} onChangeText={setOdometer} keyboardType="number-pad" />

            <Field
              label={
                kind === 'sale'
                  ? 'Total Vehicle Price (AE550), $'
                  : isDen
                    ? 'Total Price, $ (not the Total Amount with MWST)'
                    : 'Total Price (AE550/VAT Form), $'
              }
              value={totalPrice}
              onChangeText={setTotalPrice}
              keyboardType="decimal-pad"
              error={errors.totalPrice}
            />
            {purchaseNonDen && <Field label="Deposit taken, $" value={deposit} onChangeText={setDeposit} keyboardType="decimal-pad" />}

            {kind === 'purchase' && (
              <>
                <Text style={styles.label}>Payment (Finance Company line)</Text>
                <Segmented
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'finance', label: 'Financed' },
                  ]}
                  value={paymentMethod}
                  onChange={(v) => setPaymentMethod(v as PaymentMethod)}
                />
                {paymentMethod === 'finance' && <Field label="Lender" value={lender} onChangeText={setLender} autoCapitalize="words" />}
              </>
            )}

            <Field
              label={kind === 'sale' ? 'Purchase Date (YYYY-MM-DD)' : isDen ? 'Cost Estimate Date (YYYY-MM-DD)' : 'Deal Date (YYYY-MM-DD)'}
              value={documentDate}
              onChangeText={setDocumentDate}
              autoCorrect={false}
              error={errors.documentDate}
            />
            {purchaseNonDen && (
              <Field
                label="Days to pay in full (term 2)"
                value={payDays}
                onChangeText={setPayDays}
                keyboardType="number-pad"
                error={errors.payDays}
              />
            )}

            <Button label={saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Deal'} onPress={save} disabled={saving} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  note: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center', margin: Spacing.xl },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  hint: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.amber, marginTop: -8, marginBottom: 14, lineHeight: 17 },
  row: { flexDirection: 'row', gap: 10 },
  segmented: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  segmentLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.text, textAlign: 'center' },
  segmentLabelActive: { color: '#fff' },
});

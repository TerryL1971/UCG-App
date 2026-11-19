import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { dealershipForBase, DEALERSHIPS, normalizeWhatsapp, SALESPEOPLE } from '@/constants/salespeople';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { toIsoDate } from '@/lib/deal-flow';
import { createMyDeal, deleteMyDeal, fetchDealBundle, updateDeal, type DealKind, type NewDeal, type PaymentMethod } from '@/lib/deals';
import { DEMO_CUSTOMER_ID, useDemoMode } from '@/lib/demo-mode';
import { useMyDeals } from '@/lib/my-deals-context';
import { loadWishList } from '@/lib/wish-list';
import { messageWhatsapp } from '@/lib/whatsapp';

/**
 * "Start my car plan" — the customer copies a few things off the
 * paperwork their salesperson gave them once the $300 deposit was taken
 * (Purchase Order, Cost Estimate for DEN cars, or Bill of Sale when
 * selling), and picks their salesperson. No UCG employee uses the app
 * (Terry, 2026-11-17), so this is how a deal gets into it. Later the app
 * can read these fields off the PDF by itself.
 */
export default function DealSetupScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const { user, base } = useAuth();
  const { refresh, selectDeal } = useMyDeals();

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [kind, setKind] = useState<DealKind>('purchase');
  const [isDen, setIsDen] = useState(false);
  const [dealNumber, setDealNumber] = useState('');
  const [stockNumber, setStockNumber] = useState('');
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
  const [salespersonName, setSalespersonName] = useState('');
  const [salespersonWhatsapp, setSalespersonWhatsapp] = useState('');
  const [dealership, setDealership] = useState<string | null>(null);
  const [payDays, setPayDays] = useState(5);
  const [showMore, setShowMore] = useState(false);

  // A new plan picks up the salesperson and dealership from the wish list,
  // if the customer made one before their deposit.
  useEffect(() => {
    if (id) return;
    loadWishList().then((w) => {
      if (w.salespersonName) setSalespersonName((v) => v || w.salespersonName);
      if (w.salespersonWhatsapp) setSalespersonWhatsapp((v) => v || `+${w.salespersonWhatsapp}`);
      // The wish list's location, else the UCG location at their base.
      setDealership((v) => v ?? w.dealership ?? dealershipForBase(base));
      if (w.payment === 'loan') setPaymentMethod('finance');
    });
  }, [id, base]);

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
        setSalespersonName(d.salesperson_name ?? '');
        setSalespersonWhatsapp(d.salesperson_whatsapp ?? '');
        setDealership(d.dealership);
        setPayDays(d.pay_in_full_days);
      })
      .catch(() => Alert.alert("Couldn't load your deal", 'Go back and try again.'))
      .finally(() => setLoading(false));
  }, [id]);

  const purchaseNonDen = kind === 'purchase' && !isDen;
  const paperwork = kind === 'sale' ? 'Bill of Sale' : isDen ? 'Cost Estimate' : 'Purchase Order';
  const parseMoney = (value: string) => Number(value.replace(/[^0-9.]/g, ''));

  const demo = useDemoMode();

  /** Can't find a number? The salesperson sends them (Terry, 2026-11-19:
   * copying numbers off a contract shouldn't feel like homework). */
  const askForNumbers = () => {
    const text = `Hi! I'm setting up my car plan in the UCG app. Could you send me my Deal #, Stock #, VIN and Total Price from my ${paperwork}?`;
    messageWhatsapp(normalizeWhatsapp(salespersonWhatsapp), text, salespersonName.trim() || 'your salesperson');
  };

  const dateField = (
    <Field
      label={kind === 'sale' ? 'Purchase Date (YYYY-MM-DD)' : isDen ? 'Date (YYYY-MM-DD)' : 'Deal Date (YYYY-MM-DD)'}
      value={documentDate}
      onChangeText={setDocumentDate}
      autoCorrect={false}
      error={errors.documentDate}
      hint="On your paperwork. Today's date is filled in."
    />
  );

  /** Demo mode: fill the form with made-up paperwork, so a live demo
   * doesn't stall on typing. */
  const fillSample = () => {
    const today = toIsoDate(new Date());
    setDocumentDate(today);
    setSalespersonName('Demo Salesperson');
    setSalespersonWhatsapp('');
    setDealership('Ramstein');
    if (kind === 'sale') {
      setDealNumber('90020');
      setStockNumber('DE9020');
      setYear('2019');
      setMake('Toyota');
      setModel('RAV4 XLE');
      setColor('Silver');
      setVin('WDEMO0000000TOY20');
      setOdometer('61200');
      setTotalPrice('17500');
      return;
    }
    setDealNumber(isDen ? '90011' : '90010');
    setStockNumber(isDen ? 'DEN9011' : 'DE9010');
    setYear('2020');
    setMake('BMW');
    setModel('X3 xDrive30i');
    setColor('Black');
    setVin('WDEMO0000000BMW10');
    setOdometer('48500');
    setTotalPrice('31499');
    setDeposit('300');
    setPaymentMethod('cash');
    setLender('');
  };

  const pickSalesperson = (name: string) => {
    const person = SALESPEOPLE.find((p) => p.name === name);
    if (!person) return;
    setSalespersonName(person.name);
    setSalespersonWhatsapp(person.whatsapp);
    setDealership(person.dealership);
  };

  const save = async () => {
    const next: Record<string, string> = {};
    if (!dealNumber.trim()) next.dealNumber = `Top right of your ${paperwork}.`;
    if (!stockNumber.trim()) next.stockNumber = `On your ${paperwork}.`;
    const cleanVin = vin.replace(/\s/g, '').toUpperCase();
    if (cleanVin.length < 11 || cleanVin.length > 17) next.vin = 'The VIN is 17 characters (older cars can be shorter).';
    const price = parseMoney(totalPrice);
    if (!totalPrice.trim() || !Number.isFinite(price)) next.totalPrice = 'Copy it from your paperwork.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(documentDate.trim())) next.documentDate = 'Use YYYY-MM-DD, e.g. 2026-11-17.';
    const yearNum = year.trim() ? Number(year) : null;
    if (yearNum !== null && (!Number.isInteger(yearNum) || yearNum < 1950 || yearNum > 2100)) next.year = 'Four digits.';
    const whatsappDigits = salespersonWhatsapp.trim() ? normalizeWhatsapp(salespersonWhatsapp) : null;
    if (salespersonWhatsapp.trim() && !whatsappDigits) next.salespersonWhatsapp = 'Include the country code, e.g. +49 151 2345 6789.';
    setErrors(next);
    if (next.documentDate) setShowMore(true);
    if (Object.keys(next).length > 0) return;

    const name = user?.name?.trim() || 'Customer';
    const input: NewDeal = {
      kind,
      is_den: kind === 'purchase' && isDen,
      deal_number: dealNumber.trim(),
      stock_number: stockNumber.trim(),
      customer_name: name,
      customer_last_name: name.split(/\s+/).pop() ?? name,
      vehicle_year: yearNum,
      vehicle_make: make.trim() || null,
      vehicle_model: model.trim() || null,
      vehicle_color: color.trim() || null,
      vin: cleanVin,
      odometer: odometer.trim() ? Math.round(parseMoney(odometer)) : null,
      total_price: price,
      // Never a deposit on a DEN deal (VAT rules) or a sale.
      deposit: purchaseNonDen ? parseMoney(deposit) || 0 : 0,
      payment_method: kind === 'purchase' ? paymentMethod : null,
      lender: kind === 'purchase' && paymentMethod === 'finance' ? lender.trim() || null : null,
      document_date: documentDate.trim(),
      pay_in_full_days: payDays,
      salesperson_name: salespersonName.trim() || null,
      salesperson_whatsapp: whatsappDigits,
      dealership,
    };

    setSaving(true);
    const result = editing && id ? await updateDeal(id, input) : await createMyDeal(input, user?.id ?? DEMO_CUSTOMER_ID);
    setSaving(false);
    if (!result.ok) {
      Alert.alert("Couldn't save", result.message ?? 'Check your connection and try again.');
      return;
    }
    selectDeal(result.deal.id);
    await refresh();
    router.back();
  };

  const remove = () => {
    if (!id) return;
    Alert.alert('Remove this deal?', 'It and its documents are removed from the app. Your real deal with UCG is not affected.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMyDeal(id);
            await refresh();
            router.back();
          } catch {
            Alert.alert("Couldn't remove it", 'Check your connection and try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={editing ? 'Edit My Deal' : 'Start My Car Plan'} subtitle={`Copy these from your ${paperwork}`} />
      {loading ? (
        <ActivityIndicator color={Colors.navy} style={{ marginTop: 32 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {demo && !editing && (
              <Pressable style={styles.sampleButton} onPress={fillSample}>
                <Text style={styles.sampleLabel}>
                  Demo: fill in a sample {kind === 'sale' ? 'Bill of Sale' : isDen ? 'Cost Estimate' : 'Purchase Order'}
                </Text>
              </Pressable>
            )}
            {!editing && (
              <Text style={styles.intro}>
                About two minutes. Grab the paperwork your salesperson gave you: you only need four numbers from it, and
                the app builds your step-by-step plan for your base.
              </Text>
            )}
            <Text style={styles.label}>Are you…</Text>
            <Segmented
              options={[
                { value: 'purchase', label: 'Buying a car from UCG' },
                { value: 'sale', label: 'Selling my car to UCG' },
              ]}
              value={kind}
              onChange={(v) => setKind(v as DealKind)}
            />
            {kind === 'purchase' && (
              <>
                <Text style={styles.label}>Your paperwork is called…</Text>
                <Segmented
                  options={[
                    { value: 'no', label: 'Purchase Order' },
                    { value: 'yes', label: 'Cost Estimate' },
                  ]}
                  value={isDen ? 'yes' : 'no'}
                  onChange={(v) => setIsDen(v === 'yes')}
                />
              </>
            )}

            <Text style={styles.section}>Your salesperson</Text>
            <Text style={styles.sectionHint}>
              Their name and number are at the top right of your {paperwork}, so you can message them from the app.
            </Text>
            {SALESPEOPLE.some((p) => !p.role || p.role === 'Sales') && (
              <View style={styles.chips}>
                {SALESPEOPLE.filter((p) => !p.role || p.role === 'Sales').map((p) => (
                  <Pressable
                    key={p.name}
                    onPress={() => pickSalesperson(p.name)}
                    style={[styles.chip, salespersonName === p.name && styles.chipActive]}>
                    <Text style={[styles.chipLabel, salespersonName === p.name && styles.chipLabelActive]}>
                      {p.name} · {p.dealership}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Field label="Salesperson's name" value={salespersonName} onChangeText={setSalespersonName} autoCapitalize="words" />
            <Field
              label="Salesperson's WhatsApp"
              value={salespersonWhatsapp}
              onChangeText={setSalespersonWhatsapp}
              keyboardType="phone-pad"
              placeholder="+49 151 2345 6789"
              error={errors.salespersonWhatsapp}
            />
            <Text style={styles.label}>Dealership</Text>
            <View style={[styles.chips, { marginBottom: 18 }]}>
              {DEALERSHIPS.map((d) => (
                <Pressable key={d} onPress={() => setDealership(d)} style={[styles.chip, dealership === d && styles.chipActive]}>
                  <Text style={[styles.chipLabel, dealership === d && styles.chipLabelActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>The car</Text>
            <Text style={styles.sectionHint}>So you know which plan is which. Leave out anything you don&apos;t know.</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" error={errors.year} />
              </View>
              <View style={{ flex: 2 }}>
                <Field label="Make" value={make} onChangeText={setMake} autoCapitalize="words" placeholder="e.g. Toyota" />
              </View>
            </View>
            <Field label="Model" value={model} onChangeText={setModel} autoCapitalize="words" placeholder="e.g. RAV4" />

            <Text style={styles.section}>From your {paperwork}</Text>
            <Text style={styles.sectionHint}>
              Four numbers and you&apos;re done. Not sure where they are?{' '}
              <Text style={styles.inlineLink} onPress={askForNumbers}>
                Ask {salespersonName.trim().split(/\s+/)[0] || 'your salesperson'} to send them on WhatsApp
              </Text>
            </Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Deal #" value={dealNumber} onChangeText={setDealNumber} keyboardType="number-pad" error={errors.dealNumber} hint="Top right" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Stock #" value={stockNumber} onChangeText={setStockNumber} autoCapitalize="characters" error={errors.stockNumber} />
              </View>
            </View>

            <Field
              label="VIN"
              value={vin}
              onChangeText={setVin}
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.vin}
              hint="The car's 17-character ID number"
            />

            <Field
              label={kind === 'sale' ? 'Total Vehicle Price, $' : 'Total Price, $'}
              value={totalPrice}
              onChangeText={setTotalPrice}
              keyboardType="decimal-pad"
              error={errors.totalPrice}
            />
            {isDen && kind === 'purchase' && (
              <Text style={styles.hint}>Use the Total Price — not the larger Total Amount that includes MWST.</Text>
            )}
            {purchaseNonDen && <Field label="Deposit paid, $" value={deposit} onChangeText={setDeposit} keyboardType="decimal-pad" />}

            {kind === 'purchase' && (
              <>
                <Text style={styles.label}>Paying</Text>
                <Segmented
                  options={[
                    { value: 'cash', label: 'Myself (cash / wire)' },
                    { value: 'finance', label: 'With a loan' },
                  ]}
                  value={paymentMethod}
                  onChange={(v) => setPaymentMethod(v as PaymentMethod)}
                />
                {paymentMethod === 'finance' && <Field label="Lender" value={lender} onChangeText={setLender} autoCapitalize="words" />}
              </>
            )}

            {isDen && kind === 'purchase' && dateField}

            <Pressable onPress={() => setShowMore((v) => !v)} hitSlop={6} style={styles.moreToggle}>
              <Text style={styles.moreLabel}>{showMore ? '−' : '+'} More details (optional)</Text>
            </Pressable>
            {showMore && (
              <>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Color" value={color} onChangeText={setColor} autoCapitalize="words" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Odometer" value={odometer} onChangeText={setOdometer} keyboardType="number-pad" />
                  </View>
                </View>
                {!(isDen && kind === 'purchase') && dateField}
              </>
            )}

            <View style={{ height: 10 }} />
            <Button label={saving ? 'Saving…' : editing ? 'Save Changes' : 'Build My Plan'} onPress={save} disabled={saving} />
            {editing && (
              <Text style={styles.remove} onPress={remove}>
                Remove this deal from the app
              </Text>
            )}
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
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 19, marginBottom: 16 },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  hint: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.amber, marginTop: -8, marginBottom: 14, lineHeight: 17 },
  section: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text, marginTop: Spacing.md },
  sectionHint: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 17, marginTop: 2, marginBottom: 12 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.text },
  chipLabelActive: { color: '#fff' },
  sampleButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.amber,
    backgroundColor: Colors.amberTint,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 14,
  },
  sampleLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: Colors.amber, textAlign: 'center' },
  inlineLink: { fontFamily: Fonts.bodySemibold, color: Colors.green, textDecorationLine: 'underline' },
  moreToggle: { paddingVertical: 6, marginBottom: 8 },
  moreLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: Colors.navy },
  remove: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.red,
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 18,
  },
});

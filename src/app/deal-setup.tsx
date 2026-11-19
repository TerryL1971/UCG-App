import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { dealershipForBase, DEALERSHIPS, normalizeWhatsapp, SALESPEOPLE } from '@/constants/salespeople';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { toIsoDate } from '@/lib/deal-flow';
import {
  createMyDeal,
  deleteMyDeal,
  fetchDealBundle,
  updateDeal,
  uploadDealFile,
  type DealKind,
  type NewDeal,
  type PaymentMethod,
} from '@/lib/deals';
import { DEMO_CUSTOMER_ID, useDemoMode } from '@/lib/demo-mode';
import { useMyDeals } from '@/lib/my-deals-context';
import {
  READER_AVAILABLE,
  readDocument,
  readFailureMessage,
  vinCheckDigitOk,
  type DocumentFields,
} from '@/lib/read-document';
import { pickPdf, scanPages, type ScannedPdf } from '@/lib/scan';
import { loadWishList } from '@/lib/wish-list';
import { messageWhatsapp } from '@/lib/whatsapp';
import { goBack } from '@/lib/navigation';

/** Fields the reader can fill. Once read, they're shown locked rather
 * than as boxes to retype (Terry, 2026-11-19: copying numbers off the
 * Purchase Order "leaves too much room for error"). */
type ReadKey =
  | 'kind'
  | 'dealNumber'
  | 'stockNumber'
  | 'vin'
  | 'year'
  | 'make'
  | 'model'
  | 'color'
  | 'odometer'
  | 'totalPrice'
  | 'deposit'
  | 'documentDate'
  | 'salesperson'
  | 'dealership';

/**
 * "Start my car plan". The customer scans (or adds the PDF of) the
 * paperwork their salesperson gave them once the $300 deposit was taken
 * (Purchase Order, Cost Estimate for DEN cars, or Bill of Sale when
 * selling), and the app reads it. What it read is locked; only what it
 * couldn't read is typed. Typing everything is the fallback (no reader in
 * Expo Go, or no paperwork to hand), and editing a saved deal.
 * No UCG employee uses the app (Terry, 2026-11-17), so this is how a deal
 * gets into it.
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
  // The paperwork the app read, kept to save into the deal's documents.
  const [paperworkPdf, setPaperworkPdf] = useState<ScannedPdf | null>(null);
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<{
    sample: boolean;
    unclear: string[];
  } | null>(null);
  // 'start': scan first. 'review': what was read, locked. 'manual': type it all.
  const [mode, setMode] = useState<'start' | 'review' | 'manual' | null>(null);
  const [locked, setLocked] = useState<Set<ReadKey>>(new Set());

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
  const step = mode ?? (editing || !(READER_AVAILABLE || demo) ? 'manual' : 'start');
  /** Whether a box is needed for this field (it wasn't read). */
  const need = (k: ReadKey) => !(step === 'review' && locked.has(k));
  const unlock = (k: ReadKey) =>
    setLocked((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });

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

  /** Fills the form from what the reader found and locks those fields;
   * leaves blanks alone. */
  const applyFields = (f: DocumentFields) => {
    const read = new Set<ReadKey>();
    const put = <T,>(k: ReadKey, set: (v: T) => void, v: T) => {
      set(v);
      read.add(k);
    };
    if (f.document_type === 'bill_of_sale') {
      setKind('sale');
      read.add('kind');
    }
    if (f.document_type === 'purchase_order' || f.document_type === 'cost_estimate') {
      setKind('purchase');
      setIsDen(f.document_type === 'cost_estimate' || Boolean(f.stock_number?.toUpperCase().startsWith('DEN')));
      read.add('kind');
    }
    if (f.deal_number) put('dealNumber', setDealNumber, f.deal_number);
    if (f.stock_number) put('stockNumber', setStockNumber, f.stock_number);
    if (f.vin) put('vin', setVin, f.vin);
    if (f.vehicle_year) put('year', setYear, String(f.vehicle_year));
    if (f.vehicle_make) put('make', setMake, f.vehicle_make);
    if (f.vehicle_model) put('model', setModel, f.vehicle_model);
    if (f.vehicle_color) put('color', setColor, f.vehicle_color);
    if (f.odometer !== null) put('odometer', setOdometer, String(f.odometer));
    if (f.total_price !== null) put('totalPrice', setTotalPrice, String(f.total_price));
    if (f.deposit !== null && f.document_type === 'purchase_order') put('deposit', setDeposit, String(f.deposit));
    if (f.document_date && /^\d{4}-\d{2}-\d{2}$/.test(f.document_date))
      put('documentDate', setDocumentDate, f.document_date);
    if (f.salesperson_name) {
      setSalespersonName(f.salesperson_name);
      const digits = f.salesperson_phone ? normalizeWhatsapp(f.salesperson_phone) : null;
      // Only locked with a number too; otherwise the chips fill it in.
      if (digits) put('salesperson', setSalespersonWhatsapp, `+${digits}`);
    }
    const location = DEALERSHIPS.find((d) => f.dealership_location?.toLowerCase().includes(d.toLowerCase()));
    if (location) put('dealership', setDealership, location);
    setLocked(read);
    setErrors({});
  };

  /** "Scan my paperwork": the app reads it and fills the form in. */
  const readPaperwork = () => {
    const go = async (source: 'scan' | 'pdf') => {
      const pdf = source === 'pdf' ? await pickPdf() : await scanPages(paperwork, null);
      if (!pdf) return;
      setReading(true);
      const result = await readDocument(pdf.uri);
      setReading(false);
      if (!result.ok) {
        Alert.alert("Couldn't read it", readFailureMessage[result.reason]);
        return;
      }
      if (
        result.fields.document_type === 'ae550a' ||
        result.fields.document_type === 'ae550b' ||
        result.fields.document_type === 'other'
      ) {
        Alert.alert(
          "That doesn't look like your paperwork",
          'Use the Purchase Order, Cost Estimate or Bill of Sale your salesperson gave you.',
        );
        return;
      }
      applyFields(result.fields);
      setPaperworkPdf(pdf);
      setReadNote({ sample: result.sample, unclear: result.fields.unclear });
      setMode('review');
    };
    Alert.alert('Your paperwork', 'How do you want to add it?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add the PDF (e.g. from WhatsApp)', onPress: () => go('pdf') },
      { text: 'Scan the Paper Copy', onPress: () => go('scan') },
    ]);
  };

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

  const save = async (vinConfirmed = false) => {
    const next: Record<string, string> = {};
    if (!dealNumber.trim()) next.dealNumber = `Top right of your ${paperwork}.`;
    if (!stockNumber.trim()) next.stockNumber = `On your ${paperwork}.`;
    const cleanVin = vin.replace(/\s/g, '').toUpperCase();
    if (cleanVin.length < 11 || cleanVin.length > 17)
      next.vin = 'The VIN is 17 characters (older cars can be shorter).';
    else if (/[IOQ]/.test(cleanVin)) next.vin = 'A VIN never has the letters I, O or Q. Those are the numbers 1 and 0.';
    const price = parseMoney(totalPrice);
    if (!totalPrice.trim() || !Number.isFinite(price)) next.totalPrice = 'Copy it from your paperwork.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(documentDate.trim())) next.documentDate = 'Use YYYY-MM-DD, e.g. 2026-11-17.';
    const yearNum = year.trim() ? Number(year) : null;
    if (yearNum !== null && (!Number.isInteger(yearNum) || yearNum < 1950 || yearNum > 2100))
      next.year = 'Four digits.';
    const whatsappDigits = salespersonWhatsapp.trim() ? normalizeWhatsapp(salespersonWhatsapp) : null;
    if (salespersonWhatsapp.trim() && !whatsappDigits)
      next.salespersonWhatsapp = 'Include the country code, e.g. +49 151 2345 6789.';
    setErrors(next);
    if (next.documentDate) setShowMore(true);
    if (Object.keys(next).length > 0) {
      // A read value that fails a check gets a box to fix it in.
      (Object.keys(next) as ReadKey[]).forEach(unlock);
      return;
    }
    // North American VINs (starting 1-5) carry a check digit, so one
    // mistyped character shows. European VINs often don't, so only those.
    if (!vinConfirmed && cleanVin.length === 17 && /^[1-5]/.test(cleanVin) && !vinCheckDigitOk(cleanVin)) {
      unlock('vin');
      Alert.alert(
        'Check the VIN',
        `${cleanVin}\n\nOne character looks wrong. Compare it with your ${paperwork}, letter by letter.`,
        [
          { text: 'Fix It', style: 'cancel' },
          { text: "It's Right", onPress: () => save(true) },
        ],
      );
      return;
    }

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
    const result =
      editing && id ? await updateDeal(id, input) : await createMyDeal(input, user?.id ?? DEMO_CUSTOMER_ID);
    setSaving(false);
    if (!result.ok) {
      Alert.alert("Couldn't save", result.message ?? 'Check your connection and try again.');
      return;
    }
    // The paperwork the app read goes into the deal's documents too.
    if (!editing && paperworkPdf) {
      const docType = kind === 'sale' ? 'bill_of_sale' : isDen ? 'cost_estimate' : 'purchase_order';
      await uploadDealFile({
        dealId: result.deal.id,
        docType,
        localPdfUri: paperworkPdf.uri,
        pageCount: paperworkPdf.pageCount,
        role: 'customer',
        userId: user?.id ?? DEMO_CUSTOMER_ID,
      }).catch(() =>
        Alert.alert('Plan saved', 'Your plan is ready, but the paperwork scan didn’t save. Add it again in Documents.'),
      );
    }
    selectDeal(result.deal.id);
    await refresh();
    goBack();
  };

  const remove = () => {
    if (!id) return;
    Alert.alert(
      'Remove this deal?',
      'It and its documents are removed from the app. Your real deal with UCG is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMyDeal(id);
              await refresh();
              goBack();
            } catch {
              Alert.alert("Couldn't remove it", 'Check your connection and try again.');
            }
          },
        },
      ],
    );
  };

  const money = (v: string) => `$${parseMoney(v).toLocaleString('en-US')}`;
  /** What was read, as locked rows (review step). */
  const readRows: { key: ReadKey; label: string; value: string }[] = [
    { key: 'kind' as const, label: 'Paperwork', value: paperwork },
    { key: 'dealNumber' as const, label: 'Deal #', value: dealNumber },
    { key: 'stockNumber' as const, label: 'Stock #', value: stockNumber },
    { key: 'vin' as const, label: 'VIN', value: vin },
    { key: 'year' as const, label: 'Year', value: year },
    { key: 'make' as const, label: 'Make', value: make },
    { key: 'model' as const, label: 'Model', value: model },
    { key: 'color' as const, label: 'Color', value: color },
    { key: 'odometer' as const, label: 'Odometer', value: odometer },
    {
      key: 'totalPrice' as const,
      label: kind === 'sale' ? 'Total Vehicle Price' : 'Total Price',
      value: money(totalPrice),
    },
    { key: 'deposit' as const, label: 'Deposit paid', value: money(deposit) },
    { key: 'documentDate' as const, label: 'Date', value: documentDate },
    {
      key: 'salesperson' as const,
      label: 'Salesperson',
      value: `${salespersonName} · ${salespersonWhatsapp}`,
    },
    {
      key: 'dealership' as const,
      label: 'Dealership',
      value: dealership ?? '',
    },
  ].filter((r) => step === 'review' && locked.has(r.key));

  const scanButton = (
    <Pressable style={[styles.readButton, reading && { opacity: 0.7 }]} onPress={readPaperwork} disabled={reading}>
      {reading ? <ActivityIndicator color="#fff" /> : null}
      <Text style={styles.readButtonLabel}>{reading ? 'Reading your paperwork…' : 'Scan My Paperwork'}</Text>
    </Pressable>
  );

  const numbersNeeded =
    need('dealNumber') ||
    need('stockNumber') ||
    need('vin') ||
    need('totalPrice') ||
    (purchaseNonDen && need('deposit'));
  const carNeeded = need('year') || need('make') || need('model');
  const subtitle =
    step === 'start'
      ? 'The app reads your paperwork for you'
      : step === 'review'
        ? `Read from your ${paperwork}`
        : `Copy these from your ${paperwork}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={editing ? 'Edit My Deal' : 'Start My Car Plan'} subtitle={subtitle} />
      {loading ? (
        <ActivityIndicator color={Colors.navy} style={{ marginTop: 32 }} />
      ) : step === 'start' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Grab the paperwork your salesperson gave you when you paid your deposit: the Purchase Order (a Cost Estimate
            for DEN cars, or a Bill of Sale if you&apos;re selling). The app reads it, so there&apos;s nothing to copy.
          </Text>
          <View style={styles.readCard}>
            <Text style={styles.readTitle}>Scan your paperwork</Text>
            <Text style={styles.readBody}>
              Scan the paper copy with your camera, or add the PDF your salesperson sent you on WhatsApp. It stays on
              your phone and in your deal&apos;s documents.
            </Text>
            {scanButton}
          </View>
          <Text style={styles.fallback}>
            No paperwork with you?{' '}
            <Text style={styles.inlineLink} onPress={() => setMode('manual')}>
              Type the numbers in instead
            </Text>
          </Text>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {demo && step === 'manual' && !editing && (
              <Pressable style={styles.sampleButton} onPress={fillSample}>
                <Text style={styles.sampleLabel}>
                  Demo: fill in a sample {kind === 'sale' ? 'Bill of Sale' : isDen ? 'Cost Estimate' : 'Purchase Order'}
                </Text>
              </Pressable>
            )}
            {step === 'manual' && !editing && (
              <Text style={styles.intro}>
                About two minutes. You need four numbers from your paperwork, and the app builds your step-by-step plan
                for your base. Type them exactly as they&apos;re printed.
              </Text>
            )}

            {step === 'review' && (
              <View style={styles.readCard}>
                <Text style={styles.readTitle}>
                  {readNote?.sample ? 'Demo: sample paperwork' : `Here's what your ${paperwork} says`}
                </Text>
                <Text style={styles.readBody}>
                  Hold it next to your paper. If anything doesn&apos;t match, tap Wrong and fix just that one.
                </Text>
                <View style={styles.readList}>
                  {readRows.map((r, i) => (
                    <View key={r.key} style={[styles.readRow, i === readRows.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={styles.readLabel}>{r.label}</Text>
                      <Text style={[styles.readValue, r.key === 'vin' && styles.readVin]} selectable>
                        {r.value}
                      </Text>
                      <Text style={styles.readWrong} onPress={() => unlock(r.key)} suppressHighlighting>
                        Wrong?
                      </Text>
                    </View>
                  ))}
                </View>
                {readNote && readNote.unclear.length > 0 && (
                  <Text style={styles.readUnclear}>
                    Couldn&apos;t read {readNote.unclear.join(', ').replace(/_/g, ' ')}. Type{' '}
                    {readNote.unclear.length > 1 ? 'those' : 'that'} below, or scan again with the page flat and well
                    lit.
                  </Text>
                )}
                <Text style={styles.rescan} onPress={readPaperwork} suppressHighlighting>
                  {reading ? 'Reading…' : 'Scan again'}
                </Text>
              </View>
            )}

            {step === 'review' && <Text style={styles.section}>Just a few more things</Text>}

            {need('kind') && (
              <>
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
              </>
            )}

            {need('salesperson') && (
              <>
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
                <Field
                  label="Salesperson's name"
                  value={salespersonName}
                  onChangeText={setSalespersonName}
                  autoCapitalize="words"
                />
                <Field
                  label="Salesperson's WhatsApp"
                  value={salespersonWhatsapp}
                  onChangeText={setSalespersonWhatsapp}
                  keyboardType="phone-pad"
                  placeholder="+49 151 2345 6789"
                  error={errors.salespersonWhatsapp}
                />
              </>
            )}
            {need('dealership') && (
              <>
                <Text style={styles.label}>Dealership</Text>
                <View style={[styles.chips, { marginBottom: 18 }]}>
                  {DEALERSHIPS.map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setDealership(d)}
                      style={[styles.chip, dealership === d && styles.chipActive]}>
                      <Text style={[styles.chipLabel, dealership === d && styles.chipLabelActive]}>{d}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {carNeeded && (
              <>
                <Text style={styles.section}>The car</Text>
                <Text style={styles.sectionHint}>
                  So you know which plan is which. Leave out anything you don&apos;t know.
                </Text>
                <View style={styles.row}>
                  {need('year') && (
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Year"
                        value={year}
                        onChangeText={setYear}
                        keyboardType="number-pad"
                        error={errors.year}
                      />
                    </View>
                  )}
                  {need('make') && (
                    <View style={{ flex: 2 }}>
                      <Field
                        label="Make"
                        value={make}
                        onChangeText={setMake}
                        autoCapitalize="words"
                        placeholder="e.g. Toyota"
                      />
                    </View>
                  )}
                </View>
                {need('model') && (
                  <Field
                    label="Model"
                    value={model}
                    onChangeText={setModel}
                    autoCapitalize="words"
                    placeholder="e.g. RAV4"
                  />
                )}
              </>
            )}

            {numbersNeeded && (
              <>
                <Text style={styles.section}>From your {paperwork}</Text>
                <Text style={styles.sectionHint}>
                  Type {step === 'review' ? 'these' : 'them'} exactly as printed. Not sure where they are?{' '}
                  <Text style={styles.inlineLink} onPress={askForNumbers}>
                    Ask {salespersonName.trim().split(/\s+/)[0] || 'your salesperson'} to send them on WhatsApp
                  </Text>
                </Text>
                <View style={styles.row}>
                  {need('dealNumber') && (
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Deal #"
                        value={dealNumber}
                        onChangeText={setDealNumber}
                        keyboardType="number-pad"
                        error={errors.dealNumber}
                        hint="Top right"
                      />
                    </View>
                  )}
                  {need('stockNumber') && (
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Stock #"
                        value={stockNumber}
                        onChangeText={setStockNumber}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        error={errors.stockNumber}
                      />
                    </View>
                  )}
                </View>
                {need('vin') && (
                  <Field
                    label="VIN"
                    value={vin}
                    onChangeText={(v) => setVin(v.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    spellCheck={false}
                    maxLength={20}
                    error={errors.vin}
                    hint={`The car's 17-character ID number${vin.replace(/\s/g, '').length ? ` (${vin.replace(/\s/g, '').length} typed)` : ''}`}
                  />
                )}
                {need('totalPrice') && (
                  <>
                    <Field
                      label={kind === 'sale' ? 'Total Vehicle Price, $' : 'Total Price, $'}
                      value={totalPrice}
                      onChangeText={setTotalPrice}
                      keyboardType="decimal-pad"
                      error={errors.totalPrice}
                    />
                    {isDen && kind === 'purchase' && (
                      <Text style={styles.hint}>
                        Use the Total Price — not the larger Total Amount that includes MWST.
                      </Text>
                    )}
                  </>
                )}
                {purchaseNonDen && need('deposit') && (
                  <Field label="Deposit paid, $" value={deposit} onChangeText={setDeposit} keyboardType="decimal-pad" />
                )}
              </>
            )}

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
                {paymentMethod === 'finance' && (
                  <Field label="Lender" value={lender} onChangeText={setLender} autoCapitalize="words" />
                )}
              </>
            )}

            {isDen && kind === 'purchase' && need('documentDate') && dateField}

            {(need('color') || need('odometer') || (!(isDen && kind === 'purchase') && need('documentDate'))) && (
              <Pressable onPress={() => setShowMore((v) => !v)} hitSlop={6} style={styles.moreToggle}>
                <Text style={styles.moreLabel}>{showMore ? '−' : '+'} More details (optional)</Text>
              </Pressable>
            )}
            {showMore && (
              <>
                <View style={styles.row}>
                  {need('color') && (
                    <View style={{ flex: 1 }}>
                      <Field label="Color" value={color} onChangeText={setColor} autoCapitalize="words" />
                    </View>
                  )}
                  {need('odometer') && (
                    <View style={{ flex: 1 }}>
                      <Field label="Odometer" value={odometer} onChangeText={setOdometer} keyboardType="number-pad" />
                    </View>
                  )}
                </View>
                {!(isDen && kind === 'purchase') && need('documentDate') && dateField}
              </>
            )}

            <View style={{ height: 10 }} />
            <Button
              label={saving ? 'Saving…' : editing ? 'Save Changes' : 'Build My Plan'}
              onPress={() => save()}
              disabled={saving}
            />
            {step === 'manual' && !editing && (READER_AVAILABLE || demo) && (
              <Text style={styles.fallback}>
                Got your paperwork now?{' '}
                <Text style={styles.inlineLink} onPress={readPaperwork}>
                  Scan it instead
                </Text>
              </Text>
            )}
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
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}>
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
  intro: {
    fontFamily: Fonts.body,
    fontSize: 13.5,
    color: Colors.textMuted,
    lineHeight: 19,
    marginBottom: 16,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
    color: Colors.amber,
    marginTop: -8,
    marginBottom: 14,
    lineHeight: 17,
  },
  section: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  sectionHint: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
    color: Colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 12,
  },
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
  segmentLabel: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
  },
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
  chipLabel: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.text,
  },
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
  sampleLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13.5,
    color: Colors.amber,
    textAlign: 'center',
  },
  readCard: {
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.md,
    padding: 14,
    gap: 8,
    marginBottom: 18,
  },
  readTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.navy },
  readBody: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  readButton: {
    minHeight: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readButtonLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: '#fff' },
  readList: {
    backgroundColor: '#fff',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  readLabel: {
    width: 92,
    fontFamily: Fonts.bodySemibold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  readValue: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.text,
  },
  readVin: { fontSize: 13, letterSpacing: 0.6 },
  readWrong: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 12,
    color: Colors.navy,
    textDecorationLine: 'underline',
  },
  readUnclear: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 12.5,
    color: Colors.amber,
    lineHeight: 17,
  },
  rescan: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.navy,
    textAlign: 'center',
    paddingVertical: 4,
  },
  fallback: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  inlineLink: {
    fontFamily: Fonts.bodySemibold,
    color: Colors.green,
    textDecorationLine: 'underline',
  },
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, CheckCircleIcon, ClockIcon, MapPinIcon, PlusIcon, ShieldIcon } from '@/components/icons';
import { DocumentCard } from '@/components/document-card';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { SUPPORT_WHATSAPP, ucgLocations, usareurBases, whatsappChatUrl } from '@/constants/mock-data';
import { buildSellBackBillOfSaleHtml, type SellBackDealInput } from '@/lib/deal-documents';
import { compressPhoto } from '@/lib/image';
import { isValidEmail } from '@/lib/validation';
import { useVinScan } from '@/lib/vin-scan-context';

const conditions = ['Fair', 'Good', 'Excellent'] as const;
const mileageUnits = ['mi', 'km'] as const;
const specs = ['US', 'EU'] as const;
// Real dealership workflow here is more like 8-10+ photos per car, not 3 —
// this is a soft ceiling to keep the screen from growing unbounded, not a
// realistic limit anyone should actually hit.
const MAX_PHOTOS = 15;

// A pre-buy inspection happens once UCG is about to buy a car FROM a
// customer — after an offer is made and the customer accepts it, not
// before (this was originally, incorrectly, placed on the car detail
// screen for the opposite direction — buying FROM UCG — and moved here
// once that was caught). Only Ramstein/KMC's real booking link exists so
// far; see ucgLocations in mock-data.ts.
const preBuyInspectionLocation = ucgLocations.find((l) => l.bookingUrl);

// 'enteringAmount' — added 2026-09-21 (Terry: a real sell-side Bill of
// Sale needs a real accepted-offer amount, not a fabricated one). Sits
// between "we've asked, waiting on a text" and "confirmed" so the
// customer types in the actual number their specialist texted them
// before anything gets generated from it.
type OfferStatus = 'form' | 'awaitingAccept' | 'enteringAmount' | 'accepted';

// Draft-autosave (Terry, 2026-10-15, catching a real gap): deal-intake.tsx
// persists continuously specifically because losing a filled-in form
// happened twice in testing — this screen's own form grew to 10+ fields
// plus up to 15 photos with the Oct 13 rework and had zero persistence of
// its own. Scoped to just the main form (not the post-offer
// accepted-amount/lien fields reached only after a specialist has texted
// a real number) — that stage is shorter-lived and lower-stakes to lose.
const SELL_BACK_DRAFT_KEY = 'ucg.sellBackDraft';

interface SellBackDraft {
  sellerName: string;
  sellerContact: string;
  sellerEmail: string;
  plate: string;
  vehicleYear: string;
  mileage: string;
  mileageUnit: (typeof mileageUnits)[number];
  spec: (typeof specs)[number];
  condition: (typeof conditions)[number];
  photos: string[];
  dutyStation: string | null;
  otherDutyStation: string;
  notes: string;
}

export default function SellBackScreen() {
  const { lastScannedVin, clearLastScannedVin } = useVinScan();
  const [offerStatus, setOfferStatus] = useState<OfferStatus>('form');

  // Name/email/phone are mandatory and collected up front now (Terry,
  // Oct 13) — right before "Get My Offer," matching usedcarguys.net's own
  // 9-step flow, which asks for them right after the vehicle questions
  // rather than only once an offer's been accepted. sellerName/
  // sellerContact still double as the real inputs for the sell-side Bill
  // of Sale (buildSellBackBillOfSaleHtml) later — collecting them earlier
  // doesn't change that, it just means OfferStatusView no longer has to
  // ask again.
  const [sellerName, setSellerName] = useState('');
  const [sellerContact, setSellerContact] = useState('');
  const [sellerEmail, setSellerEmail] = useState('');
  const [acceptedAmountText, setAcceptedAmountText] = useState('');
  const [hasLien, setHasLien] = useState(false);
  const [lienHolder, setLienHolder] = useState('');
  const [lienAccountNumber, setLienAccountNumber] = useState('');
  const [payoffAmountText, setPayoffAmountText] = useState('');
  const [payoffDate, setPayoffDate] = useState('');

  // Deliberately NOT pre-filled from useDeal()'s car (Terry, 2026-10-15,
  // catching a real bug): that value is whatever car the customer is
  // currently shopping to BUY, not a car they're selling back — nothing
  // in this app actually tracks past purchases, so pre-filling from it
  // silently attached the wrong vehicle's VIN/year to the generated Bill
  // of Sale for anyone mid-shopping a different car at the same time.
  const [plate, setPlate] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [mileageUnit, setMileageUnit] = useState<(typeof mileageUnits)[number]>('mi');
  const [spec, setSpec] = useState<(typeof specs)[number]>('US');
  const [condition, setCondition] = useState<(typeof conditions)[number]>('Good');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [dutyStation, setDutyStation] = useState<string | null>(null);
  const [otherDutyStation, setOtherDutyStation] = useState('');
  const [notes, setNotes] = useState('');
  const isOtherDutyStation = dutyStation === 'Other';
  const effectiveDutyStation = isOtherDutyStation ? otherDutyStation.trim() : dutyStation;
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  // Load once on mount — before the save-effect below runs, so it doesn't
  // immediately overwrite a real saved draft with the screen's just-
  // mounted blank defaults.
  useEffect(() => {
    AsyncStorage.getItem(SELL_BACK_DRAFT_KEY)
      .then((raw) => {
        if (raw) {
          const draft: Partial<SellBackDraft> = JSON.parse(raw);
          if (draft.sellerName) setSellerName(draft.sellerName);
          if (draft.sellerContact) setSellerContact(draft.sellerContact);
          if (draft.sellerEmail) setSellerEmail(draft.sellerEmail);
          if (draft.plate) setPlate(draft.plate);
          if (draft.vehicleYear) setVehicleYear(draft.vehicleYear);
          if (draft.mileage) setMileage(draft.mileage);
          if (draft.mileageUnit) setMileageUnit(draft.mileageUnit);
          if (draft.spec) setSpec(draft.spec);
          if (draft.condition) setCondition(draft.condition);
          if (draft.photos) setPhotos(draft.photos);
          if (draft.dutyStation) setDutyStation(draft.dutyStation);
          if (draft.otherDutyStation) setOtherDutyStation(draft.otherDutyStation);
          if (draft.notes) setNotes(draft.notes);
        }
      })
      .catch(() => {
        // Corrupt or inaccessible storage — start clean rather than crash.
      })
      .finally(() => setHasLoadedDraft(true));
  }, []);

  // Save on every change, same pattern as deal-intake-context.tsx's
  // saveDraft — skipped until the load above finishes, so this doesn't
  // immediately stomp a real saved draft with blank initial state.
  useEffect(() => {
    if (!hasLoadedDraft) return;
    const draft: SellBackDraft = {
      sellerName,
      sellerContact,
      sellerEmail,
      plate,
      vehicleYear,
      mileage,
      mileageUnit,
      spec,
      condition,
      photos,
      dutyStation,
      otherDutyStation,
      notes,
    };
    AsyncStorage.setItem(SELL_BACK_DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [
    hasLoadedDraft,
    sellerName,
    sellerContact,
    sellerEmail,
    plate,
    vehicleYear,
    mileage,
    mileageUnit,
    spec,
    condition,
    photos,
    dutyStation,
    otherDutyStation,
    notes,
  ]);

  /** index === null means "append a new photo" rather than replace one. */
  const captureInto = async (index: number | null, useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Allow ${useCamera ? 'camera' : 'photo library'} access to add a photo.`);
      return;
    }

    const launch = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    setIsAdding(true);
    try {
      const compressed = await compressPhoto(result.assets[0].uri);
      setPhotos((prev) => {
        if (index === null) return [...prev, compressed];
        const next = [...prev];
        next[index] = compressed;
        return next;
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Shares straight from this device's own storage — doesn't depend on
  // WhatsApp's in-chat attach-photo picker being able to find the file,
  // which it may not: compressPhoto saves into this app's own private
  // sandbox, not the system Photos library (Terry, 2026-10-15, catching a
  // real gap — the WhatsApp message below used to promise these photos
  // were "ready to send," which wasn't guaranteed).
  const sharePhoto = async (uri: string) => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert('Sharing not available', "This device can't open the share sheet.");
    }
  };

  const handleExistingPhotoPress = (index: number) => {
    Alert.alert('Photo', undefined, [
      { text: 'Share', onPress: () => sharePhoto(photos[index]) },
      { text: 'Replace', onPress: () => promptSource(index) },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setPhotos((prev) => prev.filter((_, i) => i !== index)),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const promptSource = (index: number | null) => {
    Alert.alert('Add Photo', undefined, [
      { text: 'Take Photo', onPress: () => captureInto(index, true) },
      { text: 'Choose from Library', onPress: () => captureInto(index, false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  useEffect(() => {
    if (lastScannedVin) {
      // Genuinely needs an effect, not just local derived state — this
      // also has to clear the source signal in vin-scan-context (an
      // external system), which is the actual textbook case an effect is
      // for. eslint-disable justified: the "avoid setState in an effect"
      // rule can't tell this apart from the pure prop-mirroring anti-
      // pattern it's meant to catch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlate(lastScannedVin);
      clearLastScannedVin();
    }
  }, [lastScannedVin, clearLastScannedVin]);

  const handleSubmit = async () => {
    if (!plate.trim() || !vehicleYear.trim() || !mileage.trim() || !effectiveDutyStation) {
      Alert.alert('Almost there', 'Add your VIN, model year, mileage, and duty station so we can put together an offer.');
      return;
    }
    // Was maxLength={4} + non-empty only — "0000" or a future-enough year
    // both passed (Terry, 2026-10-15, catching a real gap). Upper bound is
    // current year + 1, not just the current year — dealerships (including
    // UCG's own real listings) sell next-model-year cars before the
    // calendar year turns over.
    const yearNum = Number(vehicleYear.trim());
    const maxPlausibleYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(yearNum) || yearNum < 1980 || yearNum > maxPlausibleYear) {
      Alert.alert('Almost there', `Model year should be between 1980 and ${maxPlausibleYear}.`);
      return;
    }
    if (!sellerName.trim() || !sellerEmail.trim() || !sellerContact.trim()) {
      Alert.alert('Almost there', 'Add your name, email, and phone number so we can actually reach you with an offer.');
      return;
    }
    // Was non-empty-only here while create-account.tsx/log-in.tsx both
    // actually validate the format — a garbage email sailed straight into
    // this message and the generated Bill of Sale (Terry, 2026-10-15).
    if (!isValidEmail(sellerEmail.trim())) {
      Alert.alert('Almost there', "That email doesn't look quite right — double-check it.");
      return;
    }
    // No real offer-generation backend yet, so there's no real dollar
    // amount to show here — showing a made-up number would look like a
    // working pricing engine when it isn't. What IS real: moving the
    // screen into "awaiting your accept" so the next real step (booking
    // a pre-buy inspection once you've accepted the offer texted to you)
    // is reachable without a backend to drive it yet.
    //
    // This now also actually tells someone (Terry, Oct 13) — it didn't
    // before. usedcarguys.net's own "Sell Your Vehicle" page does the
    // same thing: one tap straight into WhatsApp with the details, no
    // in-app compose-and-review step first (unlike the main buying
    // flow's salesperson.tsx, which deliberately doesn't auto-launch —
    // there's no equivalent in-app chat screen here to review it in
    // first, so matching the real site's own pattern is the honest
    // option, not a shortcut). wa.me is text-only — it can't carry the
    // photos above, so the message says so instead of pretending they're
    // attached.
    const message = [
      "Hi! I'd like to sell my car back to UCG.",
      `Name: ${sellerName.trim()}`,
      `Email: ${sellerEmail.trim()}`,
      `Phone: ${sellerContact.trim()}`,
      `Year: ${vehicleYear.trim()}`,
      `VIN: ${plate.trim()}`,
      `Mileage: ${mileage.trim()} ${mileageUnit}`,
      `Spec: ${spec}`,
      `Condition: ${condition}`,
      `Duty station: ${effectiveDutyStation}`,
      notes.trim() ? `Notes: ${notes.trim()}` : '',
      // Doesn't claim they're "ready to send here in the chat" — that's
      // not guaranteed (compressPhoto saves into this app's own private
      // sandbox, not the system Photos library, so they may not show up
      // in WhatsApp's own attach-photo picker). The Share button on each
      // photo above (uses the native share sheet directly) is the real,
      // guaranteed-to-work path (Terry, 2026-10-15).
      photos.length
        ? `I have ${photos.length} photo${photos.length > 1 ? 's' : ''} taken — tap Share on each one above to send them separately.`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    // Awaited now, and only advances on real success (Terry, 2026-10-15,
    // catching a real bug) — this used to fire-and-forget and show
    // "Your Request Is In" regardless of whether WhatsApp actually opened.
    try {
      await Linking.openURL(whatsappChatUrl(SUPPORT_WHATSAPP, message));
    } catch {
      Alert.alert('Could not open WhatsApp', "Make sure WhatsApp is installed, then try again — nothing's been sent yet.");
      return;
    }
    setOfferStatus('awaitingAccept');
    // The submission succeeded — nothing left to recover a draft of.
    AsyncStorage.removeItem(SELL_BACK_DRAFT_KEY).catch(() => {});
  };

  // "Start Over" used to only flip offerStatus back to 'form', leaving
  // every field (including the accepted-offer amount and lien details)
  // holding whatever the previous round left there (Terry, 2026-10-15,
  // catching a real bug) — a second submission could re-render pre-filled
  // with a stale dollar amount and generate a Bill of Sale with the wrong
  // price. A real restart clears everything back to a blank form.
  const startOver = () => {
    setOfferStatus('form');
    setPlate('');
    setVehicleYear('');
    setMileage('');
    setMileageUnit('mi');
    setSpec('US');
    setCondition('Good');
    setPhotos([]);
    setDutyStation(null);
    setOtherDutyStation('');
    setNotes('');
    setSellerName('');
    setSellerContact('');
    setSellerEmail('');
    setAcceptedAmountText('');
    setHasLien(false);
    setLienHolder('');
    setLienAccountNumber('');
    setPayoffAmountText('');
    setPayoffDate('');
    AsyncStorage.removeItem(SELL_BACK_DRAFT_KEY).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Sell It Back</Text>
      </View>

      {offerStatus !== 'form' ? (
        <OfferStatusView
          status={offerStatus}
          dutyStation={effectiveDutyStation}
          onAccept={() => setOfferStatus('enteringAmount')}
          onStartOver={startOver}
          acceptedAmountText={acceptedAmountText}
          setAcceptedAmountText={setAcceptedAmountText}
          hasLien={hasLien}
          setHasLien={setHasLien}
          lienHolder={lienHolder}
          setLienHolder={setLienHolder}
          lienAccountNumber={lienAccountNumber}
          setLienAccountNumber={setLienAccountNumber}
          payoffAmountText={payoffAmountText}
          setPayoffAmountText={setPayoffAmountText}
          payoffDate={payoffDate}
          setPayoffDate={setPayoffDate}
          onConfirmAccept={() => {
            if (!acceptedAmountText.trim()) {
              Alert.alert('Almost there', 'Add the offer amount you accepted.');
              return;
            }
            setOfferStatus('accepted');
          }}
          sellBackInput={{
            plateOrVin: plate,
            vehicleYear,
            mileage,
            mileageUnit,
            spec,
            condition,
            sellerName,
            sellerContact,
            sellerEmail,
            acceptedAmount: Number(acceptedAmountText.replace(/[^0-9.]/g, '')) || 0,
            hasLien,
            lienHolder: hasLien ? lienHolder : undefined,
            lienAccountNumber: hasLien ? lienAccountNumber : undefined,
            payoffAmount: hasLien ? Number(payoffAmountText.replace(/[^0-9.]/g, '')) || 0 : undefined,
            payoffDate: hasLien ? payoffDate : undefined,
          }}
        />
      ) : (
        <>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.intro}>
              Already own a Used Car Guys vehicle? Get a real offer in minutes — no obligation.
            </Text>

            <Field label="VIN">
              <View style={styles.plateRow}>
                <TextInput
                  value={plate}
                  onChangeText={setPlate}
                  placeholder="e.g. 1HGCM82633A004352"
                  placeholderTextColor={Colors.textFaint}
                  autoCapitalize="characters"
                  style={[styles.input, styles.plateInput]}
                />
                <Pressable style={styles.scanButton} onPress={() => router.push('/scan-vin')}>
                  <CameraIcon color="#fff" strokeWidth={2.2} />
                  <Text style={styles.scanButtonLabel}>Scan</Text>
                </Pressable>
              </View>
            </Field>

            <Field label="Model Year">
              <TextInput
                value={vehicleYear}
                onChangeText={setVehicleYear}
                placeholder="e.g. 2019"
                placeholderTextColor={Colors.textFaint}
                keyboardType="number-pad"
                maxLength={4}
                style={styles.input}
              />
            </Field>

            <Field label="Current Mileage / Kilometers">
              <View style={styles.mileageRow}>
                <TextInput
                  value={mileage}
                  onChangeText={setMileage}
                  placeholder={mileageUnit === 'mi' ? 'e.g. 41,200' : 'e.g. 66,300'}
                  placeholderTextColor={Colors.textFaint}
                  keyboardType="number-pad"
                  style={[styles.input, styles.mileageInput]}
                />
                <View style={styles.unitToggle}>
                  {mileageUnits.map((unit) => (
                    <Pressable
                      key={unit}
                      onPress={() => setMileageUnit(unit)}
                      style={[styles.unitOption, mileageUnit === unit && styles.unitOptionActive]}
                    >
                      <Text style={[styles.unitLabel, mileageUnit === unit && styles.unitLabelActive]}>{unit}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Text style={styles.mileageHint}>
                US-spec cars in miles, EU-spec in kilometers — whichever&apos;s on the odometer.
              </Text>
            </Field>

            <Field label="Is Your Car US or EU Spec?">
              <View style={styles.segRow}>
                {specs.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSpec(s)}
                    style={[styles.segOption, spec === s && styles.segOptionActive]}
                  >
                    <Text style={[styles.segLabel, spec === s && styles.segLabelActive]}>{s} Spec</Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            <Field label="Overall Condition">
              <View style={styles.segRow}>
                {conditions.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCondition(c)}
                    style={[styles.segOption, condition === c && styles.segOptionActive]}
                  >
                    <Text style={[styles.segLabel, condition === c && styles.segLabelActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            <Field label={`Add Photos${photos.length ? ` (${photos.length})` : ''}`}>
              <View style={styles.photoRow}>
                {photos.map((uri, i) => (
                  <Pressable
                    key={uri + i}
                    style={[styles.photoTile, styles.photoTileFilled]}
                    onPress={() => handleExistingPhotoPress(i)}
                  >
                    <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  </Pressable>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <Pressable style={styles.photoTile} disabled={isAdding} onPress={() => promptSource(null)}>
                    <PlusIcon color={Colors.red} />
                  </Pressable>
                )}
              </View>
              <Text style={styles.photoHint}>
                Photos are automatically resized to keep things quick to send — take as many as you need. Tap a
                photo to share it directly, replace it, or remove it.
              </Text>
            </Field>

            <Field label="Current Duty Station">
              <View style={styles.chipRow}>
                {[...usareurBases, 'Other'].map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => setDutyStation(b)}
                    style={[styles.chip, dutyStation === b && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, dutyStation === b && styles.chipLabelActive]}>{b}</Text>
                  </Pressable>
                ))}
              </View>
              {isOtherDutyStation && (
                <TextInput
                  value={otherDutyStation}
                  onChangeText={setOtherDutyStation}
                  placeholder="Which base?"
                  placeholderTextColor={Colors.textFaint}
                  style={[styles.input, { marginTop: 10 }]}
                />
              )}
            </Field>

            <Field label="Anything Else We Should Know? (optional)">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="General condition, service history, damage, etc."
                placeholderTextColor={Colors.textFaint}
                multiline
                style={[styles.input, styles.notesInput]}
              />
            </Field>

            <Text style={styles.sectionHeading}>Last step — how should we reach you?</Text>

            <Field label="Your Name">
              <TextInput
                value={sellerName}
                onChangeText={setSellerName}
                placeholder="Full name"
                placeholderTextColor={Colors.textFaint}
                style={styles.input}
              />
            </Field>

            <Field label="Email Address">
              <TextInput
                value={sellerEmail}
                onChangeText={setSellerEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </Field>

            <Field label="Phone / WhatsApp Number">
              <TextInput
                value={sellerContact}
                onChangeText={setSellerContact}
                placeholder="e.g. +1 555 123 4567 (WhatsApp)"
                placeholderTextColor={Colors.textFaint}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </Field>
          </ScrollView>

          <View style={styles.footer}>
            <Button label="Get My Offer" onPress={handleSubmit} />
            <View style={styles.trustRow}>
              <Trust icon={<ShieldIcon size={20} />} label="No obligation" />
              <Trust icon={<ClockIcon size={20} />} label="Real offers, real fast" />
              <Trust icon={<MapPinIcon size={20} />} label="We come to you" />
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function OfferStatusView({
  status,
  dutyStation,
  onAccept,
  onStartOver,
  acceptedAmountText,
  setAcceptedAmountText,
  hasLien,
  setHasLien,
  lienHolder,
  setLienHolder,
  lienAccountNumber,
  setLienAccountNumber,
  payoffAmountText,
  setPayoffAmountText,
  payoffDate,
  setPayoffDate,
  onConfirmAccept,
  sellBackInput,
}: {
  status: Exclude<OfferStatus, 'form'>;
  dutyStation: string | null;
  onAccept: () => void;
  onStartOver: () => void;
  acceptedAmountText: string;
  setAcceptedAmountText: (v: string) => void;
  hasLien: boolean;
  setHasLien: (v: boolean) => void;
  lienHolder: string;
  setLienHolder: (v: string) => void;
  lienAccountNumber: string;
  setLienAccountNumber: (v: string) => void;
  payoffAmountText: string;
  setPayoffAmountText: (v: string) => void;
  payoffDate: string;
  setPayoffDate: (v: string) => void;
  onConfirmAccept: () => void;
  sellBackInput: SellBackDealInput;
}) {
  // The one status with real inputs to fill in gets its own scrollable
  // form instead of the centered "here's what happened" layout the other
  // two statuses use — there's meaningfully more to type here (name,
  // contact, the real accepted amount, optionally lien details).
  if (status === 'enteringAmount') {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={[]}>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={styles.intro}>
            What did your specialist actually offer? This fills in your real Bill of Sale — nothing here is guessed.
          </Text>

          <Field label="Accepted Offer Amount ($)">
            <TextInput
              value={acceptedAmountText}
              onChangeText={setAcceptedAmountText}
              placeholder="e.g. 5000"
              placeholderTextColor={Colors.textFaint}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </Field>

          <Pressable style={styles.lienToggleRow} onPress={() => setHasLien(!hasLien)}>
            <View style={[styles.checkbox, hasLien && styles.checkboxChecked]}>
              {hasLien && <CheckCircleIcon size={14} color="#fff" />}
            </View>
            <Text style={styles.lienToggleLabel}>I still owe money on this car (there&apos;s a lien/loan)</Text>
          </Pressable>

          {hasLien && (
            <>
              <Field label="Lien Holder (Bank/Lender)">
                <TextInput
                  value={lienHolder}
                  onChangeText={setLienHolder}
                  placeholder="e.g. Service Federal Credit Union"
                  placeholderTextColor={Colors.textFaint}
                  style={styles.input}
                />
              </Field>
              <Field label="Account Number">
                <TextInput
                  value={lienAccountNumber}
                  onChangeText={setLienAccountNumber}
                  placeholder="Loan account number"
                  placeholderTextColor={Colors.textFaint}
                  style={styles.input}
                />
              </Field>
              <Field label="Payoff Amount ($)">
                <TextInput
                  value={payoffAmountText}
                  onChangeText={setPayoffAmountText}
                  placeholder="e.g. 1200"
                  placeholderTextColor={Colors.textFaint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </Field>
              <Field label="Payoff Date">
                <TextInput
                  value={payoffDate}
                  onChangeText={setPayoffDate}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={Colors.textFaint}
                  style={styles.input}
                />
              </Field>
            </>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Confirm" onPress={onConfirmAccept} />
          <Text style={styles.statusStartOver} onPress={onStartOver}>
            Start Over
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.statusScreen}>
      <View style={styles.statusIconWrap}>
        <CheckCircleIcon size={40} />
      </View>

      {status === 'awaitingAccept' ? (
        <>
          <Text style={styles.statusTitle}>Your Request Is In</Text>
          <Text style={styles.statusBody}>
            A specialist will text you a real offer within one business day. Once you&apos;ve accepted it over text or
            WhatsApp, come back here to confirm and book your inspection.
          </Text>
          <Button label="I've Accepted My Offer" onPress={onAccept} style={styles.statusButton} />
        </>
      ) : (
        <>
          <Text style={styles.statusTitle}>Offer Accepted</Text>
          <Text style={styles.statusBody}>
            Last step: a specialist needs to physically inspect your car before the sale is final.
          </Text>
          {preBuyInspectionLocation?.bookingUrl ? (
            <>
              <Button
                label={`Book a Pre-Buy Inspection (${preBuyInspectionLocation.name})`}
                onPress={() => Linking.openURL(preBuyInspectionLocation.bookingUrl!)}
                style={styles.statusButton}
              />
              {/* This is the only real booking link that exists (Terry,
                  2026-10-15, catching a real inconsistency) — now that this
                  same flow asks for a Duty Station, suggesting Ramstein
                  regardless reads as a bigger mismatch than before for
                  anyone stationed elsewhere. */}
              {dutyStation && !dutyStation.toLowerCase().includes('ramstein') && (
                <Text style={styles.statusBody}>
                  This is the only location with a real booking link so far — your specialist will schedule your
                  inspection near {dutyStation} directly.
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.statusBody}>
              Booking links for the other locations aren&apos;t set up yet — your specialist will schedule this with you
              directly.
            </Text>
          )}
          <Pressable style={styles.clearLinkRow} onPress={() => router.push('/vro-checklist?mode=sell')}>
            <Text style={styles.clearLink}>What to bring to clear the car at the VRO  →</Text>
          </Pressable>

          <View style={{ width: '100%' }}>
            <DocumentCard
              docId="sell-back-bill-of-sale"
              title="Bill of Sale / Kaufvertrag"
              description="UCG purchasing this vehicle from you — print or share to sign with your specialist."
              buildHtml={() => buildSellBackBillOfSaleHtml(sellBackInput)}
              context={{
                customerName: sellBackInput.sellerName,
                customerContact: sellBackInput.sellerContact,
                carTitle: sellBackInput.vehicleYear
                  ? `${sellBackInput.vehicleYear} model year, VIN ${sellBackInput.plateOrVin}`
                  : sellBackInput.plateOrVin,
              }}
            />
          </View>
        </>
      )}

      <Text style={styles.statusStartOver} onPress={onStartOver}>
        Start Over
      </Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.trustItem}>
      {icon}
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  navbar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  body: { flex: 1, paddingHorizontal: Spacing.xxl },
  bodyContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20, marginBottom: 20 },
  lienToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingVertical: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  lienToggleLabel: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.text },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    marginTop: 7,
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 14.5,
    color: Colors.text,
  },
  plateRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  plateInput: { flex: 1, marginTop: 7 },
  scanButton: {
    marginTop: 7,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanButtonLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: '#fff' },
  mileageRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  mileageInput: { flex: 1, marginTop: 7 },
  mileageHint: {
    fontFamily: Fonts.body,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  unitToggle: {
    marginTop: 7,
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 3,
    gap: 3,
  },
  unitOption: {
    width: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitOptionActive: { backgroundColor: Colors.navy },
  unitLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.textMuted },
  unitLabelActive: { color: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 7 },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.textMuted },
  chipLabelActive: { color: '#fff' },
  notesInput: { height: 84, paddingTop: 12, textAlignVertical: 'top' },
  sectionHeading: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13.5,
    color: Colors.text,
    marginTop: 4,
    marginBottom: 14,
  },
  segRow: { flexDirection: 'row', gap: 8, marginTop: 7 },
  segOption: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOptionActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  segLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13.5, color: Colors.textMuted },
  segLabelActive: { color: '#fff' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 7 },
  photoHint: {
    fontFamily: Fonts.body,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
  photoTile: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9CDD9',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoTileFilled: {
    borderStyle: 'solid',
    borderColor: Colors.border,
  },
  footer: { paddingHorizontal: Spacing.xxl, paddingTop: 8, paddingBottom: 8 },
  trustRow: { flexDirection: 'row', marginTop: 20, paddingHorizontal: 4 },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
  trustLabel: { fontFamily: Fonts.bodySemibold, fontSize: 10.5, color: Colors.textMuted, textAlign: 'center' },
  statusScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
  statusIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  statusTitle: { fontFamily: Fonts.display, fontSize: 21, color: Colors.text, marginBottom: 8 },
  statusBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  statusButton: { width: '100%' },
  clearLinkRow: { marginTop: 16, paddingVertical: 4 },
  clearLink: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.navy,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  statusStartOver: {
    marginTop: 22,
    fontFamily: Fonts.bodySemibold,
    fontSize: 13.5,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});

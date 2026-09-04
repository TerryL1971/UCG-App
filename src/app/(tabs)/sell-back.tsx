import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, CheckCircleIcon, ClockIcon, MapPinIcon, PlusIcon, ShieldIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { ucgLocations } from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';
import { compressPhoto } from '@/lib/image';
import { useVinScan } from '@/lib/vin-scan-context';

const conditions = ['Fair', 'Good', 'Excellent'] as const;
const mileageUnits = ['mi', 'km'] as const;
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

type OfferStatus = 'form' | 'awaitingAccept' | 'accepted';

export default function SellBackScreen() {
  const { car } = useDeal();
  const { lastScannedVin, clearLastScannedVin } = useVinScan();
  const [offerStatus, setOfferStatus] = useState<OfferStatus>('form');

  // If they chose this car from our own inventory earlier in the app, we
  // already know its VIN — no reason to make them type it again. If they
  // never went through that flow (or came here for a car we didn't sell
  // them), this just stays blank and they fill it in like normal.
  const [plate, setPlate] = useState(() => car?.vin ?? '');
  const [mileage, setMileage] = useState('');
  const [mileageUnit, setMileageUnit] = useState<(typeof mileageUnits)[number]>('mi');
  const [condition, setCondition] = useState<(typeof conditions)[number]>('Good');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

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

  const handleExistingPhotoPress = (index: number) => {
    Alert.alert('Photo', undefined, [
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
      setPlate(lastScannedVin);
      clearLastScannedVin();
    }
  }, [lastScannedVin, clearLastScannedVin]);

  const handleSubmit = () => {
    if (!plate.trim() || !mileage.trim()) {
      Alert.alert('Almost there', 'Add your license plate/VIN and mileage so we can put together an offer.');
      return;
    }
    // No real offer-generation backend yet, so there's no real dollar
    // amount to show here — showing a made-up number would look like a
    // working pricing engine when it isn't. What IS real: moving the
    // screen into "awaiting your accept" so the next real step (booking
    // a pre-buy inspection once you've accepted the offer texted to you)
    // is reachable without a backend to drive it yet.
    setOfferStatus('awaitingAccept');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Sell It Back</Text>
      </View>

      {offerStatus !== 'form' ? (
        <OfferStatusView
          status={offerStatus}
          onAccept={() => setOfferStatus('accepted')}
          onStartOver={() => setOfferStatus('form')}
        />
      ) : (
        <>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.intro}>
              Already own a Used Car Guys vehicle? Get a real offer in minutes — no obligation.
            </Text>

            {car && (
              <View style={styles.recognizedCard}>
                <Text style={styles.recognizedTitle}>
                  Selling back your {car.year} {car.title}?
                </Text>
                <Text style={styles.recognizedBody}>
                  {car.vin ? "We've filled in the VIN below." : 'Add its VIN below to get started.'}
                </Text>
              </View>
            )}

            <Field label="License Plate or VIN">
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
                Photos are automatically resized to keep things quick to send — take as many as you need.
              </Text>
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
  onAccept,
  onStartOver,
}: {
  status: Exclude<OfferStatus, 'form'>;
  onAccept: () => void;
  onStartOver: () => void;
}) {
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
            <Button
              label={`Book a Pre-Buy Inspection (${preBuyInspectionLocation.name})`}
              onPress={() => Linking.openURL(preBuyInspectionLocation.bookingUrl!)}
              style={styles.statusButton}
            />
          ) : (
            <Text style={styles.statusBody}>
              Booking links for the other locations aren&apos;t set up yet — your specialist will schedule this with you
              directly.
            </Text>
          )}
          <Pressable style={styles.clearLinkRow} onPress={() => router.push('/vro-checklist?mode=sell')}>
            <Text style={styles.clearLink}>What to bring to clear the car at the VRO  →</Text>
          </Pressable>
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
  recognizedCard: {
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 18,
  },
  recognizedTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.navy },
  recognizedBody: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.navy, marginTop: 2, opacity: 0.8 },
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

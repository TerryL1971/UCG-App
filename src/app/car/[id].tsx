import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, DrivetrainIcon, FuelIcon, GaugeIcon, HeartIcon, TransmissionIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';
import { useDealDocuments } from '@/lib/documents-context';
import { useDealSync } from '@/lib/deal-sync';
import { useSaved } from '@/lib/saved-context';
import { fetchInventoryDetail, type InventoryDetail } from '@/lib/ucg-inventory';
import { useWarranty } from '@/lib/warranty-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { car: currentCar, chooseCar } = useDeal();
  const { demoteIntakeToDraft } = useDealIntake();
  const { clearChoice: clearWarrantyChoice } = useWarranty();
  const { resetDocument } = useDealDocuments();
  const { reset: resetDealSync } = useDealSync();
  const { isSaved, toggleSaved } = useSaved();
  const [car, setCar] = useState<InventoryDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchInventoryDetail(id)
      .then((d) => {
        if (!cancelled) setCar(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <SafeAreaView style={styles.centerScreen} edges={['top']}>
        <Text style={styles.centerTitle}>Couldn&apos;t load this listing</Text>
        <Text style={styles.centerBody}>It may have sold, or usedcarguys.net didn&apos;t respond.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.red, fontFamily: Fonts.bodySemibold }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!car) {
    return (
      <SafeAreaView style={styles.centerScreen} edges={['top']}>
        <ActivityIndicator color={Colors.red} />
      </SafeAreaView>
    );
  }

  // Everything below this car's price/eligibility depends on THIS car —
  // switching to a different one part-way through a deal isn't just
  // "update the car," it invalidates work already done for the old one
  // (Terry, 2026-09-05): a 2-Year PPP decision made for a 2019 sedan means
  // nothing for a 2025 EV (different eligibility, different price), the
  // 7-step timeline and any financing terms were built around the old
  // car's numbers, and Proof of Insurance is issued against a specific
  // vehicle in Germany, not the person. Driver's License, Orders, and
  // Proof of Residence stay untouched — those are about the customer, same
  // reasoning `demoteIntakeToDraft` already applies to the rest of intake.
  //
  // `needsReset` also has to be true the very FIRST time anyone chooses a
  // car (`currentCar` is null), not just on an actual switch — deal-sync's
  // mock starts every session pre-advanced to "Picked Up" as a demo
  // convenience (mock-data.ts's `dealSteps`), a leftover state that was
  // never tied to any real car. Terry, 2026-09-05: choosing a fresh car
  // and landing on step 7 with zero paperwork done for it is exactly the
  // bug this whole reset was supposed to prevent — skipping the reset just
  // because there was no *previous* car to invalidate missed that case.
  // `needsConfirm` stays narrower (an actual previously-different car) —
  // a first-ever pick has nothing to warn about losing.
  const needsReset = !currentCar || currentCar.slug !== car.slug;
  const needsConfirm = !!currentCar && currentCar.slug !== car.slug;

  const proceedWithThisCar = (shouldReset: boolean) => {
    demoteIntakeToDraft();
    chooseCar(car);
    if (shouldReset) {
      clearWarrantyChoice();
      resetDocument('insurance');
      resetDealSync();
    }
    router.push('/deal-intake');
  };

  const handleChooseCar = () => {
    if (!needsConfirm) {
      proceedWithThisCar(needsReset);
      return;
    }
    Alert.alert(
      'Switch to this car?',
      `You already have the ${currentCar!.year} ${currentCar!.title} in progress. Switching to the ${car.year} ${
        car.title
      } resets your 2-Year Protection Plan choice, Proof of Insurance, and deal timeline for the new car — your ` +
        `Driver's License, Orders, and Proof of Residence stay as they are. If you already paid a deposit or ` +
        `reservation fee on the other car, message your specialist about transferring or refunding it — that part ` +
        `isn't something this app can do on its own.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch Cars', style: 'destructive', onPress: () => proceedWithThisCar(true) },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']}>
        <View style={styles.hero}>
          {car.images.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {car.images.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={{ width: SCREEN_WIDTH, height: 240 }}
                  contentFit="cover"
                  // usedcarguys.net's own listing photos have a "UCG Used
                  // Car Guys / Military Sales" banner baked into the top
                  // of the shot itself — cover-fit crops from the center
                  // by default, which left that banner sitting right at
                  // the top edge of the hero, crowding the safe area
                  // (Terry, 2026-09-06). Biasing the crop toward the
                  // bottom of the source photo pushes the banner out of
                  // frame instead — the app already has its own header,
                  // it doesn't need the dealer's watermark repeated here.
                  contentPosition="bottom"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.navyTint }]} />
          )}
          <Pressable style={[styles.circleButton, styles.backButton]} onPress={() => router.back()} hitSlop={4}>
            <ArrowLeftIcon />
          </Pressable>
          <Pressable style={[styles.circleButton, styles.heartButton]} onPress={() => toggleSaved(car)} hitSlop={4}>
            <HeartIcon color={isSaved(car.slug) ? Colors.red : Colors.textFaint} filled={isSaved(car.slug)} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.title}>
          {car.year} {car.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.meta}>Stock #{car.stockNumber}</Text>
          <Text style={styles.price}>${car.price.toLocaleString()}</Text>
        </View>

        <View style={styles.specGrid}>
          <Spec icon={<GaugeIcon color={Colors.navy} />} label={car.mileage ? `${(car.mileage / 1000).toFixed(1)}k mi` : '—'} />
          <Spec icon={<TransmissionIcon color={Colors.navy} />} label={car.transmission ?? '—'} />
          <Spec icon={<DrivetrainIcon color={Colors.navy} />} label={car.mpg && car.mpg !== '/' ? `${car.mpg} mpg` : '—'} />
          <Spec icon={<FuelIcon color={Colors.navy} />} label={car.exteriorColor ? car.exteriorColor.split(' - ')[0] : '—'} />
        </View>

        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <DetailRow label="Exterior" value={car.exteriorColor ?? 'Not listed'} />
        <DetailRow label="Engine" value={car.engine ?? 'Not listed'} />
        {car.vin ? <DetailRow label="VIN" value={car.vin} /> : null}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.ctaBar}>
        <Button label="Choose This Car  →" onPress={handleChooseCar} />
      </SafeAreaView>
    </View>
  );
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.spec}>
      {icon}
      <Text style={styles.specLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  centerScreen: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  centerTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text, marginBottom: 4 },
  centerBody: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  hero: {
    height: 240,
    backgroundColor: '#DCE2F2',
  },
  circleButton: {
    position: 'absolute',
    top: 16,
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: { left: 16 },
  heartButton: { right: 16 },
  body: { flex: 1, paddingHorizontal: Spacing.xl },
  bodyContent: { paddingTop: Spacing.lg, paddingBottom: Spacing.xl },
  title: { fontFamily: Fonts.display, fontSize: 23, color: Colors.text, lineHeight: 26 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  meta: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted },
  price: { fontFamily: Fonts.display, fontSize: 26, color: Colors.red },
  specGrid: { flexDirection: 'row', gap: 10, marginTop: 18 },
  spec: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 6,
  },
  specLabel: { fontFamily: Fonts.bodySemibold, fontSize: 11.5, color: Colors.textMuted },
  sectionTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text, marginTop: 20, marginBottom: 4 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted },
  detailValue: { fontFamily: Fonts.bodySemibold, fontSize: 14, color: Colors.text },
  ctaBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

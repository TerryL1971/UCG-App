import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, DrivetrainIcon, FuelIcon, GaugeIcon, HeartIcon, TransmissionIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useDeal } from '@/lib/deal-context';
import { useSaved } from '@/lib/saved-context';
import { fetchInventoryDetail, type InventoryDetail } from '@/lib/ucg-inventory';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chooseCar } = useDeal();
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

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']}>
        <View style={styles.hero}>
          {car.images.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {car.images.map((uri) => (
                <Image key={uri} source={{ uri }} style={{ width: SCREEN_WIDTH, height: 240 }} contentFit="cover" />
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
        <Button
          label="Choose This Car  →"
          onPress={() => {
            chooseCar(car);
            router.push('/deal-intake');
          }}
        />
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

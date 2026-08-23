import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  CarFrontIllustration,
  DrivetrainIcon,
  FuelIcon,
  GaugeIcon,
  HeartIcon,
  TransmissionIcon,
} from '@/components/icons';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { cars } from '@/constants/mock-data';

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const car = cars.find((c) => c.id === id) ?? cars[0];
  const [saved, setSaved] = useState(false);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']}>
        <View style={styles.hero}>
          <CarFrontIllustration size={340} bodyColor="#273368" />
          <Pressable style={[styles.circleButton, styles.backButton]} onPress={() => router.back()} hitSlop={4}>
            <ArrowLeftIcon />
          </Pressable>
          <Pressable style={[styles.circleButton, styles.heartButton]} onPress={() => setSaved((s) => !s)} hitSlop={4}>
            <HeartIcon color={saved ? Colors.red : Colors.textFaint} filled={saved} />
          </Pressable>
          {car.certified && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Certified Pre-Owned</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.title}>
          {car.year} {car.make} {car.model} {car.trim}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.meta}>
            {car.mileage.toLocaleString()} mi · {car.lot}
          </Text>
          <Text style={styles.price}>${car.price.toLocaleString()}</Text>
        </View>

        <View style={styles.specGrid}>
          <Spec icon={<GaugeIcon color={Colors.navy} />} label={`${(car.mileage / 1000).toFixed(1)}k mi`} />
          <Spec icon={<TransmissionIcon color={Colors.navy} />} label={car.transmission} />
          <Spec icon={<DrivetrainIcon color={Colors.navy} />} label={car.drivetrain} />
          <Spec icon={<FuelIcon color={Colors.navy} />} label={car.fuel} />
        </View>

        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <DetailRow label="Exterior" value={car.exteriorColor} />
        <DetailRow label="Interior" value={car.interiorColor} />
        <DetailRow label="Engine" value={car.engine} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.ctaBar}>
        <Button label="Choose This Car  →" onPress={() => router.push('/salesperson')} />
      </SafeAreaView>
    </View>
  );
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.spec}>
      {icon}
      <Text style={styles.specLabel}>{label}</Text>
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
  hero: {
    height: 240,
    backgroundColor: '#DCE2F2',
    alignItems: 'center',
    justifyContent: 'center',
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
  badge: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    backgroundColor: Colors.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  badgeText: { color: '#fff', fontFamily: Fonts.bodyBold, fontSize: 12 },
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

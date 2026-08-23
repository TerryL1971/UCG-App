import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CarFrontIllustration, HeartIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import type { Car } from '@/constants/mock-data';

const illustrationBg: Record<Car['illustrationColor'], [string, string]> = {
  navy: ['#DCE2F2', '#C9D2EC'],
  red: ['#F3DEDD', '#EBC9C7'],
  slate: ['#E3E5EC', '#D2D5E1'],
};

const illustrationBody: Record<Car['illustrationColor'], string> = {
  navy: '#273368',
  red: '#C33531',
  slate: '#4B5266',
};

export function CarCard({ car }: { car: Car }) {
  const [saved, setSaved] = useState(false);
  const [bgFrom, bgTo] = illustrationBg[car.illustrationColor];

  return (
    <Pressable style={[styles.card, Shadow.card]} onPress={() => router.push(`/car/${car.id}`)}>
      <View style={[styles.photo, { backgroundColor: bgTo }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bgFrom, opacity: 0.6 }]} />
        <CarFrontIllustration size={200} bodyColor={illustrationBody[car.illustrationColor]} />
        <Pressable
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            setSaved((s) => !s);
          }}
          style={styles.saveButton}>
          <HeartIcon color={saved ? Colors.red : Colors.textFaint} filled={saved} />
        </Pressable>
      </View>
      <View style={styles.info}>
        <View style={styles.infoTop}>
          <Text style={styles.name} numberOfLines={1}>
            {car.year} {car.make} {car.model}
          </Text>
          <Text style={styles.price}>${car.price.toLocaleString()}</Text>
        </View>
        <Text style={styles.meta}>
          {car.mileage.toLocaleString()} mi · {car.transmission} · {car.lot}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
  },
  photo: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: Spacing.lg,
    paddingTop: 14,
  },
  infoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 15.5,
    color: Colors.text,
  },
  price: {
    fontFamily: Fonts.display,
    fontSize: 19,
    color: Colors.red,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

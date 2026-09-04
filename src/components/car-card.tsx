import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CarFrontIllustration, HeartIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useSaved } from '@/lib/saved-context';
import type { InventoryListItem } from '@/lib/ucg-inventory';

export function CarCard({ car }: { car: InventoryListItem }) {
  const { isSaved, toggleSaved } = useSaved();
  const saved = isSaved(car.slug);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Pressable
      style={[styles.card, Shadow.card]}
      onPress={() => router.push(`/car/${encodeURIComponent(car.slug)}`)}>
      <View style={styles.photo}>
        {imageFailed ? (
          <View style={styles.photoFallback}>
            <CarFrontIllustration size={130} bodyColor={Colors.navy} />
          </View>
        ) : (
          <Image
            source={{ uri: car.thumbnail }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            onError={() => setImageFailed(true)}
          />
        )}
        <Pressable
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            toggleSaved(car);
          }}
          style={styles.saveButton}>
          <HeartIcon color={saved ? Colors.red : Colors.textFaint} filled={saved} />
        </Pressable>
      </View>
      <View style={styles.info}>
        <View style={styles.infoTop}>
          <Text style={styles.name} numberOfLines={1}>
            {car.year} {car.title}
          </Text>
          <Text style={styles.price}>${car.price.toLocaleString()}</Text>
        </View>
        <Text style={styles.meta}>
          {car.perMonth ? `From $${car.perMonth.toLocaleString()}/mo` : 'Tap for pricing details'}
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
    backgroundColor: Colors.navyTint,
  },
  photoFallback: {
    ...StyleSheet.absoluteFill,
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

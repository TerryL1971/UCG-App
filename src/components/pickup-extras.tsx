import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CameraIcon, StarIcon } from '@/components/icons';
import { dealershipForBase } from '@/constants/salespeople';
import { ucgLocations } from '@/constants/ucg-info';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import type { Deal } from '@/lib/deals';
import { openUrlWithFeedback } from '@/lib/linking';
import { salespersonLabel } from '@/lib/whatsapp';

/**
 * Pick-up day (Terry, 2026-11-17): a photo with the new car that goes to
 * the salesperson, and a Google review for the dealership that sold it.
 *
 * WhatsApp can't be handed a photo for one specific chat from another
 * app, so "Send" opens the share sheet: the customer taps WhatsApp, then
 * their salesperson. UCG has a separate Google listing per location, so
 * the review goes to the deal's dealership (or the customer picks one).
 */
export function PickupExtras({ deal }: { deal: Deal }) {
  const { base } = useAuth();
  const dealership = deal.dealership ?? dealershipForBase(base);
  const [photo, setPhoto] = useState<string | null>(null);
  const who = salespersonLabel(deal);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take your pickup photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    setPhoto(result.assets[0].uri);
  };

  const sendPhoto = async () => {
    if (!photo) return;
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Not available', "Sharing isn't available on this device.");
      return;
    }
    await Sharing.shareAsync(photo, { mimeType: 'image/jpeg', dialogTitle: `Send to ${who} on WhatsApp` });
  };

  const openReview = (url: string) => openUrlWithFeedback(url, "Couldn't open Google. Check your connection and try again.");

  const leaveReview = () => {
    const location = ucgLocations.find((l) => l.name === dealership);
    if (location) {
      openReview(location.reviewUrl);
      return;
    }
    Alert.alert('Which UCG location?', 'Each UCG location has its own Google page.', [
      ...ucgLocations.map((l) => ({ text: l.name, onPress: () => openReview(l.reviewUrl) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <View style={styles.wrap}>
      {photo ? (
        <View style={styles.photoCard}>
          <Image source={{ uri: photo }} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={styles.caption}>Great shot! Send it to {who}: tap Send, then WhatsApp.</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.secondary} onPress={takePhoto}>
                <Text style={styles.secondaryLabel}>Retake</Text>
              </Pressable>
              <Pressable style={styles.send} onPress={sendPhoto}>
                <Text style={styles.sendLabel}>Send to {who}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          <Pressable style={styles.primary} onPress={takePhoto}>
            <CameraIcon color="#fff" strokeWidth={2.2} />
            <Text style={styles.primaryLabel}>Take My Pickup Photo</Text>
          </Pressable>
          <Text style={styles.hint}>Hand your phone to {who === 'UCG' ? 'your salesperson' : who} for a photo of you with your new car.</Text>
        </View>
      )}

      <Pressable style={styles.review} onPress={leaveReview}>
        <StarIcon size={18} color={Colors.amber} />
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewTitle}>Leave UCG a Google Review</Text>
          <Text style={styles.reviewSub}>
            {dealership ? `For UCG ${dealership}` : 'Tell other Americans how it went'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  primary: {
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryLabel: { fontFamily: Fonts.bodyBold, fontSize: 14.5, color: '#fff' },
  hint: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  photoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    padding: 10,
  },
  thumb: { width: 76, height: 76, borderRadius: Radius.sm, backgroundColor: Colors.navyTint },
  caption: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.text, lineHeight: 17 },
  secondary: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: Colors.textMuted },
  send: { height: 34, paddingHorizontal: 12, borderRadius: Radius.sm, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  sendLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#fff' },
  review: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
  },
  reviewTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  reviewSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginTop: 1 },
});

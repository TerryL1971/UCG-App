import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, MessageIcon } from '@/components/icons';
import { SalespersonAvatarMini } from '@/components/salesperson-avatar';
import { DashedLine, FlowLine, SolidLine, TimelineDot } from '@/components/timeline-dot';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { dealSteps, salesperson } from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';

const ROW_HEIGHT = 80;
const CURRENT_ROW_HEIGHT = 132;
const READY_ROW_HEIGHT = 190;
const LAST_ROW_HEIGHT = 70;

/** The camera/share action under "Picked Up" — its own component (not
 * inlined in the steps loop) since it needs its own local state for the
 * captured photo, and hooks can't live directly inside a .map() callback. */
function PickupPhotoAction() {
  const [photo, setPhoto] = useState<string | null>(null);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take the pickup photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    setPhoto(result.assets[0].uri);
  };

  const share = async () => {
    if (!photo) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Not available', "Sharing isn't available on this device.");
      return;
    }
    await Sharing.shareAsync(photo);
  };

  if (photo) {
    return (
      <View style={styles.pickupCard}>
        <Image source={{ uri: photo }} style={styles.pickupThumb} contentFit="cover" />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.pickupCaption}>Nice shot — ready to post?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.pickupSecondaryBtn} onPress={takePhoto}>
              <Text style={styles.pickupSecondaryLabel}>Retake</Text>
            </Pressable>
            <Pressable style={styles.pickupPrimaryBtn} onPress={share}>
              <Text style={styles.pickupPrimaryLabel}>Share</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={styles.pickupButton} onPress={takePhoto}>
      <CameraIcon color="#fff" strokeWidth={2.2} />
      <Text style={styles.pickupButtonLabel}>Take Pickup Photo</Text>
    </Pressable>
  );
}

export default function TimelineScreen() {
  const { car } = useDeal();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Your Journey</Text>
      </View>

      <View style={[styles.pinnedBar, Shadow.card]}>
        <SalespersonAvatarMini size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.pinnedName}>{salesperson.name.split(' ')[0]} is helping you</Text>
          <Text style={styles.pinnedMeta}>
            {car ? `${car.year} ${car.title} · $${car.price.toLocaleString()}` : 'No car selected yet'}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={() => Linking.openURL(salesperson.phone.replace('tel:', 'sms:'))}>
          <MessageIcon />
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {dealSteps.map((step, i) => {
          const isLast = i === dealSteps.length - 1;
          const showsReadyPhoto = step.id === 'ready' && step.status !== 'upcoming' && !!car;
          const rowHeight = showsReadyPhoto
            ? READY_ROW_HEIGHT
            : step.status === 'current'
              ? CURRENT_ROW_HEIGHT
              : isLast
                ? LAST_ROW_HEIGHT
                : ROW_HEIGHT;
          const lineHeight = rowHeight - 34;

          return (
            <View key={step.id} style={{ flexDirection: 'row', gap: 16, minHeight: rowHeight }}>
              <View style={{ width: 34, alignItems: 'center' }}>
                <TimelineDot status={step.status} isLast={isLast} />
                {!isLast && step.status === 'done' && <SolidLine height={lineHeight} />}
                {!isLast && step.status === 'current' && <FlowLine height={lineHeight} />}
                {!isLast && step.status === 'upcoming' && <DashedLine height={lineHeight} />}
              </View>

              <View style={{ flex: 1, paddingTop: 2 }}>
                <Text
                  style={[
                    styles.stepTitle,
                    step.status === 'current' && styles.stepTitleCurrent,
                    step.status === 'upcoming' && styles.stepTitleUpcoming,
                  ]}>
                  {step.title}
                </Text>
                {step.detail ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}

                {step.id === 'documents' && step.status === 'current' && (
                  <Pressable style={styles.miniChip} onPress={() => router.push('/(tabs)/deal/documents')}>
                    <SalespersonAvatarMini size={24} />
                    <Text style={styles.miniChipText}>
                      {salesperson.name.split(' ')[0]} is reviewing your documents
                    </Text>
                  </Pressable>
                )}

                {showsReadyPhoto && car && (
                  <View style={styles.readyCard}>
                    <Image source={{ uri: car.thumbnail }} style={styles.readyImage} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.readyTitle} numberOfLines={1}>
                        {car.year} {car.title}
                      </Text>
                      <Text style={styles.readySubtitle}>Washed, inspected, and waiting for you.</Text>
                    </View>
                  </View>
                )}

                {step.id === 'pickup' && step.status === 'current' && (
                  <View style={{ marginTop: 10 }}>
                    <PickupPhotoAction />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
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
  pinnedBar: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinnedName: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  pinnedMeta: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, marginTop: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl },
  stepTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  stepTitleCurrent: { color: Colors.red },
  stepTitleUpcoming: { color: Colors.textFaint },
  stepDetail: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  miniChip: {
    marginTop: 10,
    backgroundColor: Colors.redTint,
    borderRadius: Radius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    maxWidth: 220,
  },
  miniChipText: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 11.5, color: Colors.navy, lineHeight: 15 },
  readyCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 300,
    ...Shadow.card,
  },
  readyImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.navyTint,
  },
  readyTitle: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: Colors.text },
  readySubtitle: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, marginTop: 2, lineHeight: 15 },
  pickupButton: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  pickupButtonLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: '#fff' },
  pickupCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    maxWidth: 320,
    ...Shadow.card,
  },
  pickupThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.navyTint,
  },
  pickupCaption: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.text },
  pickupSecondaryBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupSecondaryLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: Colors.textMuted },
  pickupPrimaryBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupPrimaryLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: '#fff' },
});

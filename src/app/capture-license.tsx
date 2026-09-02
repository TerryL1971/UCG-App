import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { compressPhoto } from '@/lib/image';
import { useLicenseCapture, type LicenseSide } from '@/lib/license-capture-context';

/**
 * Custom camera screen for the license photo (Terry, Sept 2: "there should
 * be a rectangular block that the customer would line up with"). Plain
 * ImagePicker.launchCameraAsync — what deal-intake.tsx used before — opens
 * the native OS camera app and can't draw an overlay on it, so this mirrors
 * scan-vin.tsx's approach instead: a real CameraView with a frame drawn on
 * top. The frame here is ID-card shaped (a driver's license's actual
 * proportions, ISO/IEC 7810 ID-1 ≈ 1.586:1) rather than the wide/short VIN
 * barcode frame, since it's a different-shaped object to align.
 */
export default function CaptureLicenseScreen() {
  const { side } = useLocalSearchParams<{ side: LicenseSide }>();
  const { setLastCapturedLicensePhoto } = useLicenseCapture();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const sideLabel = side === 'back' ? 'Back' : 'Front';

  const handleCapture = async () => {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) return;
      const compressed = await compressPhoto(photo.uri);
      setLastCapturedLicensePhoto(side === 'back' ? 'back' : 'front', compressed);
      router.back();
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen} edges={['top', 'bottom']}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          To scan your license, Used Car Guys needs permission to use your camera. We only use it to save the
          photo to your deal — nothing else.
        </Text>
        <View style={{ width: '100%', gap: 10, marginTop: 20 }}>
          <Button label="Grant Camera Access" onPress={requestPermission} />
          <Text style={styles.manualLink} onPress={() => router.back()}>
            Cancel
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeftIcon color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Scan License — {sideLabel}</Text>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame} />
          <Text style={styles.hint}>Line up the {sideLabel.toLowerCase()} of your license inside the box</Text>
        </View>

        <View style={styles.shutterRow}>
          <Pressable style={styles.shutterButton} onPress={handleCapture} disabled={isCapturing} hitSlop={8}>
            {isCapturing ? <ActivityIndicator color={Colors.navy} /> : <View style={styles.shutterInner} />}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Real ID-1 card proportions (driver's licenses, credit cards, etc.) —
// 85.60mm × 53.98mm ≈ 1.586:1 — not an arbitrary rectangle, so the guide
// actually matches the object being photographed.
const FRAME_WIDTH = 300;
const FRAME_HEIGHT = Math.round(FRAME_WIDTH / 1.586);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: Fonts.display, fontSize: 19, color: '#fff' },
  frameWrap: { alignItems: 'center', gap: 16, paddingHorizontal: Spacing.xxxl },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: '#fff',
  },
  hint: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13.5,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 19,
  },
  shutterRow: { alignItems: 'center', paddingBottom: Spacing.xxxl },
  shutterButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: Colors.bg,
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  permissionTitle: { fontFamily: Fonts.display, fontSize: 21, color: Colors.text, marginBottom: 8 },
  permissionBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  manualLink: { textAlign: 'center', fontFamily: Fonts.bodySemibold, fontSize: 14, color: Colors.red },
});

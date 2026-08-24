import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { isPlausibleVin, useVinScan } from '@/lib/vin-scan-context';

/** VIN stickers sometimes wrap the code in start/stop chars a scanner
 * doesn't always strip, or the decode includes stray whitespace — clean
 * up, then fall back to pulling a 17-char VIN-shaped run out of whatever
 * was decoded rather than rejecting anything that isn't already exact. */
function extractVin(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (isPlausibleVin(cleaned)) return cleaned;
  const match = cleaned.match(/[A-HJ-NPR-Z0-9]{17}/);
  return match ? match[0] : null;
}

export default function ScanVinScreen() {
  const { setLastScannedVin } = useVinScan();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [notAVin, setNotAVin] = useState(false);

  const handleScan = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    const vin = extractVin(result.data);
    if (!vin) {
      setNotAVin(true);
      setTimeout(() => {
        setNotAVin(false);
        setScanned(false);
      }, 1200);
      return;
    }

    setLastScannedVin(vin);
    router.back();
  };

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen} edges={['top', 'bottom']}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          To scan a VIN barcode, Used Car Guys needs permission to use your camera. We only use it to read the
          barcode — nothing is recorded or stored.
        </Text>
        <View style={{ width: '100%', gap: 10, marginTop: 20 }}>
          <Button label="Grant Camera Access" onPress={requestPermission} />
          <Text style={styles.manualLink} onPress={() => router.back()}>
            Enter VIN manually instead
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['code39'] }}
        onBarcodeScanned={handleScan}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeftIcon color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Scan VIN</Text>
        </View>

        <View style={styles.frameWrap}>
          <View style={[styles.frame, notAVin && styles.frameError]} />
          <Text style={styles.hint}>
            {notAVin
              ? "That didn't look like a VIN — try again"
              : 'Align the VIN barcode — usually on the dashboard or door jamb sticker'}
          </Text>
        </View>

        <Text style={styles.manualLinkOnCamera} onPress={() => router.back()}>
          Enter VIN manually instead
        </Text>
      </SafeAreaView>
    </View>
  );
}

const FRAME_WIDTH = 280;
const FRAME_HEIGHT = 110;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
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
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 19,
    color: '#fff',
  },
  frameWrap: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: Spacing.xxxl,
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: '#fff',
  },
  frameError: {
    borderColor: Colors.red,
  },
  hint: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13.5,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 19,
  },
  manualLinkOnCamera: {
    textAlign: 'center',
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
    paddingBottom: Spacing.xxl,
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  permissionTitle: {
    fontFamily: Fonts.display,
    fontSize: 21,
    color: Colors.text,
    marginBottom: 8,
  },
  permissionBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  manualLink: {
    textAlign: 'center',
    fontFamily: Fonts.bodySemibold,
    fontSize: 14,
    color: Colors.red,
  },
});

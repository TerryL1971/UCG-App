import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';

import { AnimatedSplash } from '@/components/animated-splash';
import { AuthProvider } from '@/lib/auth-context';
import { DealProvider } from '@/lib/deal-context';
import { DealIntakeProvider } from '@/lib/deal-intake-context';
import { DealSyncProvider } from '@/lib/deal-sync';
import { DealDocumentsProvider } from '@/lib/documents-context';
import { LicenseCaptureProvider } from '@/lib/license-capture-context';
import { WarrantyProvider } from '@/lib/warranty-context';
import { SavedProvider } from '@/lib/saved-context';
import { VinScanProvider } from '@/lib/vin-scan-context';

SplashScreen.preventAutoHideAsync();

// NOTE: deliberately NOT also gating this on auth-context's isLoading.
// AsyncStorage never resolves during static web export's server-side
// prerender (no window/native bridge in that headless pass), so doing
// that made every single route render blank in `expo export --platform
// web` — harmless on a real device where AsyncStorage resolves near
// instantly, but it broke static prerendering entirely. index.tsx handles
// its own brief loading check locally instead, so only that one route is
// affected, not the whole app's render.
function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  // The native splash (app.json's expo-splash-screen plugin) is a static
  // OS-level image — it can't animate, that's a real platform limit, not
  // a missing setting. This state controls a REAL animated splash
  // (components/animated-splash.tsx) shown on top of the actual first
  // screen for one brief moment right after the native splash hides,
  // then fades away — see that file for why it's built this way.
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle={showAnimatedSplash ? 'light-content' : 'dark-content'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create-account" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="log-in" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="car/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="deal-intake" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="salesperson" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="deposit" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="warranty" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="insurance" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="vro-checklist" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="service" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="wire-instructions" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="scan-vin" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
        <Stack.Screen
          name="capture-license"
          options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
        />
      </Stack>
      {showAnimatedSplash && <AnimatedSplash onFinish={() => setShowAnimatedSplash(false)} />}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
  });

  return (
    <AuthProvider>
      <DealProvider>
        <DealIntakeProvider>
          <DealSyncProvider>
            <DealDocumentsProvider>
              <WarrantyProvider>
                <SavedProvider>
                  <VinScanProvider>
                    <LicenseCaptureProvider>
                      <AppShell fontsLoaded={fontsLoaded} />
                    </LicenseCaptureProvider>
                  </VinScanProvider>
                </SavedProvider>
              </WarrantyProvider>
            </DealDocumentsProvider>
          </DealSyncProvider>
        </DealIntakeProvider>
      </DealProvider>
    </AuthProvider>
  );
}

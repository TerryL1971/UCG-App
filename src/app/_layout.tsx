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
import { useEffect } from 'react';
import { StatusBar } from 'react-native';

import { AuthProvider } from '@/lib/auth-context';
import { DealProvider } from '@/lib/deal-context';
import { DealIntakeProvider } from '@/lib/deal-intake-context';
import { DealStepsProvider } from '@/lib/deal-steps-context';
import { DealDocumentsProvider } from '@/lib/documents-context';
import { LicenseCaptureProvider } from '@/lib/license-capture-context';
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
      <StatusBar barStyle="dark-content" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create-account" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="log-in" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="car/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="deal-intake" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="salesperson" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="deposit" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="wire-instructions" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="scan-vin" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
        <Stack.Screen
          name="capture-license"
          options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
        />
      </Stack>
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
          <DealStepsProvider>
            <DealDocumentsProvider>
              <SavedProvider>
                <VinScanProvider>
                  <LicenseCaptureProvider>
                    <AppShell fontsLoaded={fontsLoaded} />
                  </LicenseCaptureProvider>
                </VinScanProvider>
              </SavedProvider>
            </DealDocumentsProvider>
          </DealStepsProvider>
        </DealIntakeProvider>
      </DealProvider>
    </AuthProvider>
  );
}

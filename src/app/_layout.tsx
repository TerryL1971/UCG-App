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
import { SavedProvider } from '@/lib/saved-context';
import { VinScanProvider } from '@/lib/vin-scan-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <DealProvider>
        <SavedProvider>
          <VinScanProvider>
            <StatusBar barStyle="dark-content" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="create-account" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="log-in" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="car/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="salesperson" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="sell-back" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="scan-vin" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
            </Stack>
          </VinScanProvider>
        </SavedProvider>
      </DealProvider>
    </AuthProvider>
  );
}

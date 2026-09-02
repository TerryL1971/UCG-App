import { Redirect, router } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

const logo = require('@/assets/brand/ucg-logo-full.png');
// Same mark used in the animated splash (animated-splash.tsx) — reused
// here instead of the old car illustration (Terry, Sept 2: "the car in
// the background looks bad and needs to go") so the hero ties back to
// the brand mark rather than a generic geometric car shape.
const mark = require('@/assets/images/splash-icon.png');

export default function OnboardingScreen() {
  const { user, isLoading } = useAuth();

  // Briefly true while AsyncStorage resolves (near-instant on device) —
  // render nothing rather than flash "Create Account" for someone who's
  // actually already logged in.
  if (isLoading) {
    return null;
  }

  // Already logged in from a previous session — skip straight past
  // onboarding instead of making them look at "Create Account" again.
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.starSmall} />
        <Image source={mark} style={styles.heroMark} contentFit="contain" />
      </View>

      <SafeAreaView style={styles.body} edges={['bottom']}>
        <View style={[styles.card, Shadow.card]}>
          <Image source={logo} style={styles.logo} contentFit="contain" />
          <Text style={styles.title}>Your next car,{'\n'}one step at a time.</Text>
          <Text style={styles.subtitle}>
            Browse the lot, get matched with a real specialist, and track your whole deal — financing to
            pickup — in one place.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Create Account" onPress={() => router.push('/create-account')} />
          <Button label="Log In" variant="secondary" onPress={() => router.push('/log-in')} />
          <Text style={styles.link} onPress={() => router.replace('/(tabs)')}>
            Browse cars without an account
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  hero: {
    height: 300,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 30,
    overflow: 'hidden',
  },
  starSmall: {
    position: 'absolute',
    top: 28,
    left: 26,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3A467F',
  },
  heroMark: {
    width: 150,
    height: 150,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    marginTop: -46,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 26,
    width: '100%',
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 62,
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14.5,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 'auto',
    marginBottom: 8,
  },
  link: {
    textAlign: 'center',
    marginTop: 6,
    fontFamily: Fonts.bodySemibold,
    fontSize: 14,
    color: Colors.red,
  },
});

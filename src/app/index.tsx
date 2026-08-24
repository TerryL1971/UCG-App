import { router } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CarFrontIllustration } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';

const logo = require('@/assets/brand/ucg-logo-full.png');

export default function OnboardingScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.starSmall} />
        <View style={styles.carWrap}>
          <View style={styles.carShadow} />
          <CarFrontIllustration size={280} bodyColor="#FBFBFD" />
          <View style={styles.roofAccent} />
        </View>
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
  carWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  carShadow: {
    position: 'absolute',
    bottom: -6,
    width: 220,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1B2450',
    opacity: 0.55,
  },
  roofAccent: {
    position: 'absolute',
    top: 18,
    width: 150,
    height: 16,
    backgroundColor: Colors.red,
    borderRadius: 4,
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

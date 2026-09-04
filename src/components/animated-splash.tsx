import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Fonts } from '@/constants/theme';

const mark = require('@/assets/images/splash-icon.png');

/**
 * The NATIVE splash screen (app.json's expo-splash-screen plugin) is a
 * static image — that's a real OS-level constraint, not a choice: it
 * renders before React (or even the JS engine) is running, so it can
 * never animate. This component is the actual "animated splash" — a
 * real React overlay shown the instant JS takes over, using the exact
 * same navy background and mark image as the native splash so there's
 * no visible jump between the two, then animating the mark and wordmark
 * in before fading out. The real first screen is already mounted
 * underneath the whole time (see _layout.tsx) — this just sits on top
 * of it and gets out of the way, rather than delaying it.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const markScale = useSharedValue(0.6);
  const markOpacity = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTranslateY = useSharedValue(10);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    markScale.value = withSpring(1, { damping: 9, stiffness: 120 });
    wordmarkOpacity.value = withDelay(320, withTiming(1, { duration: 380 }));
    wordmarkTranslateY.value = withDelay(320, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
    overlayOpacity.value = withDelay(
      1300,
      withTiming(0, { duration: 380 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
    // Animation is intentionally fire-and-forget on mount — no deps to
    // re-trigger on, this only ever plays once per cold launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkTranslateY.value }],
  }));

  return (
    <Animated.View style={[styles.screen, overlayStyle]}>
      <Animated.Image source={mark} style={[styles.mark, markStyle]} resizeMode="contain" />
      <Animated.View style={wordmarkStyle}>
        <Text style={styles.wordmark}>
          USED <Text style={styles.wordmarkAccent}>CAR GUYS</Text>
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mark: {
    width: 96,
    height: 96,
    marginBottom: 14,
  },
  wordmark: {
    fontFamily: Fonts.display,
    fontSize: 24,
    letterSpacing: 1.5,
    color: '#fff',
    textAlign: 'center',
  },
  wordmarkAccent: {
    color: Colors.red,
  },
});

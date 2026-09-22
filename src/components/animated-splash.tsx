import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { StarIcon } from '@/components/icons';
import { Colors } from '@/constants/theme';

const mark = require('@/assets/images/splash-icon.png');
// The real "USED CAR GUYS" wordmark, cropped from the brand PDF Terry
// provided (2026-09-22) — replaces a locally re-styled Text approximation
// with the actual typeface/color. Red-only (like `mark` above), which is
// why it still reads fine against this screen's navy background — the
// full navy+red "UCG" lettermark (assets/brand/ucg-icon.png) would not:
// its navy letters would vanish against this same navy, which is exactly
// why `mark` here was always just the red star/swoosh, not the full mark.
const wordmarkImage = require('@/assets/brand/ucg-wordmark-text.png');

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
 *
 * Livelier pass (Terry, 2026-09-22: "everything looks great... I wonder
 * if I can make it a bit more lively"): the mark now bounces in with a
 * slight rotational settle instead of a plain scale/fade, two small
 * stars twinkle in beside it — echoing the star cluster in the real
 * logo, without duplicating it (this mark is just the star/swoosh, no
 * cluster of its own) — and the wordmark is the actual brand asset.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const markScale = useSharedValue(0.5);
  const markRotate = useSharedValue(-12);
  const markOpacity = useSharedValue(0);
  const star1Scale = useSharedValue(0);
  const star2Scale = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTranslateY = useSharedValue(10);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) });
    markScale.value = withSpring(1, { damping: 7, stiffness: 140 });
    markRotate.value = withSpring(0, { damping: 8, stiffness: 140 });

    // Staggered right after the mark lands — a quick pop past 1x then
    // settle, like a twinkle rather than a slide-in.
    star1Scale.value = withDelay(
      360,
      withSequence(withTiming(1.3, { duration: 140 }), withTiming(1, { duration: 120 })),
    );
    star2Scale.value = withDelay(
      460,
      withSequence(withTiming(1.3, { duration: 140 }), withTiming(1, { duration: 120 })),
    );

    wordmarkOpacity.value = withDelay(340, withTiming(1, { duration: 380 }));
    wordmarkTranslateY.value = withDelay(340, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));

    overlayOpacity.value = withDelay(
      1350,
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
    transform: [{ scale: markScale.value }, { rotate: `${markRotate.value}deg` }],
  }));
  const star1Style = useAnimatedStyle(() => ({ transform: [{ scale: star1Scale.value }] }));
  const star2Style = useAnimatedStyle(() => ({ transform: [{ scale: star2Scale.value }] }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkTranslateY.value }],
  }));

  return (
    <Animated.View style={[styles.screen, overlayStyle]}>
      <View style={styles.markWrap}>
        <Animated.Image source={mark} style={[styles.mark, markStyle]} resizeMode="contain" />
        <Animated.View style={[styles.twinkle, styles.twinkleTopRight, star1Style]}>
          <StarIcon size={13} color="#fff" />
        </Animated.View>
        <Animated.View style={[styles.twinkle, styles.twinkleBottomLeft, star2Style]}>
          <StarIcon size={10} color={Colors.red} />
        </Animated.View>
      </View>
      <Animated.Image source={wordmarkImage} style={[styles.wordmarkImage, wordmarkStyle]} resizeMode="contain" />
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
  markWrap: {
    width: 100,
    height: 100,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 100,
    height: 100,
  },
  twinkle: {
    position: 'absolute',
  },
  twinkleTopRight: {
    top: -4,
    right: -6,
  },
  twinkleBottomLeft: {
    bottom: 6,
    left: -10,
  },
  wordmarkImage: {
    // Explicit width+height rather than `aspectRatio` — on web,
    // `aspectRatio` wasn't being respected on an Animated.Image here (it
    // rendered at the source PNG's raw 1200x355 pixel ratio squished into
    // just the 210 width, i.e. 210x355 — a tall sliver overlapping
    // everything below it — instead of scaling proportionally). The
    // source is 1200x355; 210/1200*355 ≈ 62.
    width: 210,
    height: 62,
  },
});

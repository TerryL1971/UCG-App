import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CheckIcon, PackageIcon } from '@/components/icons';
import { Colors } from '@/constants/theme';
import type { DealStepStatus } from '@/constants/mock-data';

const DONE_SIZE = 34;
const CURRENT_SIZE = 40;

/** The dot marker for one timeline row — filled/checked, pulsing, or hollow. */
export function TimelineDot({ status, isLast }: { status: DealStepStatus; isLast?: boolean }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (status === 'current') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    }
  }, [status, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.22 - pulse.value * 0.14,
    transform: [{ scale: 1 + pulse.value * 0.55 }],
  }));

  if (status === 'done') {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <CheckIcon size={16} color="#fff" strokeWidth={3} />
      </View>
    );
  }

  if (status === 'current') {
    return (
      <View style={styles.currentWrap}>
        <Animated.View style={[styles.pulseRing, ringStyle]} />
        <View style={[styles.dot, styles.dotCurrent]} />
      </View>
    );
  }

  return (
    <View style={[styles.dot, styles.dotUpcoming]}>
      {isLast ? <PackageIcon size={15} color="#B7BBCB" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: DONE_SIZE,
    height: DONE_SIZE,
    borderRadius: DONE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: Colors.red,
  },
  dotUpcoming: {
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: '#D6D9E4',
  },
  currentWrap: {
    width: DONE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrent: {
    width: CURRENT_SIZE,
    height: CURRENT_SIZE,
    borderRadius: CURRENT_SIZE / 2,
    backgroundColor: Colors.navy,
  },
  pulseRing: {
    position: 'absolute',
    width: CURRENT_SIZE + 20,
    height: CURRENT_SIZE + 20,
    borderRadius: (CURRENT_SIZE + 20) / 2,
    backgroundColor: Colors.red,
  },
  particle: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.red,
    shadowColor: Colors.red,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});

/** Solid connector for a completed segment. */
export function SolidLine({ height }: { height: number }) {
  return <View style={{ width: 3, height, backgroundColor: Colors.red, borderRadius: 1.5 }} />;
}

/** Dashed connector for an upcoming segment. */
export function DashedLine({ height }: { height: number }) {
  const dash = 6;
  const gap = 7;
  const count = Math.max(1, Math.floor(height / (dash + gap)));
  return (
    <View style={{ width: 3, height, alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: dash,
            borderRadius: 1.5,
            backgroundColor: '#D6D9E4',
            marginBottom: i < count - 1 ? gap : 0,
          }}
        />
      ))}
    </View>
  );
}

/** The "in progress" segment: solid near the current dot fading into a dashed
 * lead-in for what's next, with a small glowing particle animating downward
 * to read as motion without being distracting. */
export function FlowLine({ height }: { height: number }) {
  const solidPortion = Math.round(height * 0.35);
  const dashPortion = height - solidPortion;
  const travel = useSharedValue(0);

  useEffect(() => {
    travel.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1);
  }, [travel]);

  const particleStyle = useAnimatedStyle(() => ({
    opacity: travel.value < 0.1 || travel.value > 0.9 ? 0 : 1,
    transform: [{ translateY: travel.value * (height - 9) }],
  }));

  return (
    <View style={{ width: 12, height, alignItems: 'center' }}>
      <View style={{ position: 'absolute', left: 4.5 }}>
        <SolidLine height={solidPortion} />
      </View>
      <View style={{ position: 'absolute', left: 4.5, top: solidPortion }}>
        <DashedLine height={dashPortion} />
      </View>
      <Animated.View style={[styles.particle, particleStyle]} />
    </View>
  );
}

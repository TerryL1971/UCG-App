import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { CarSideIcon, CheckIcon, PackageIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';
import type { DealStep } from '@/constants/mock-data';
import type { InventoryDetail } from '@/lib/ucg-inventory';

const AnimatedG = Animated.createAnimatedComponent(G);

// Vertical (portrait): road runs top-to-bottom, swinging between these two
// x positions. Horizontal (landscape): road runs left-to-right instead,
// swinging between two y positions — the same idea, axes swapped.
const NEAR_EDGE = 72;
const FAR_EDGE_V = 320 - NEAR_EDGE; // road width in vertical mode
const FAR_EDGE_H = 220 - NEAR_EDGE; // road "height" (cross-axis) in horizontal mode
const STEP_SPACING = 150; // distance between consecutive stops along the road
const START_PAD = 40;
const END_PAD = 70;
const SIGN_SIZE = 40;
const CAR_SIZE = 52;
/** How much of a full step's travel it takes for a passed stop/segment to
 * fully fade out — 1 = fully gone exactly one step behind the car. */
const FADE_TRAIL = 1;

interface Waypoint {
  x: number;
  y: number;
}

function buildWaypoints(count: number, horizontal: boolean): Waypoint[] {
  return Array.from({ length: count }, (_, i) => {
    const along = START_PAD + i * STEP_SPACING;
    const cross = i % 2 === 0 ? NEAR_EDGE : horizontal ? FAR_EDGE_H : FAR_EDGE_V;
    return horizontal ? { x: along, y: cross } : { x: cross, y: along };
  });
}

/** One cubic-bezier segment between two waypoints, pulled toward the
 * midline so the road swings smoothly rather than zigzagging. */
function buildSegmentPath(p0: Waypoint, p1: Waypoint, horizontal: boolean): string {
  if (horizontal) {
    const midX = (p0.x + p1.x) / 2;
    return `M ${p0.x} ${p0.y} C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const midY = (p0.y + p1.y) / 2;
  return `M ${p0.x} ${p0.y} C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
}

/** One road segment (three layered strokes for the asphalt/shadow/dashed
 * center line), fading out once the car has driven a step past it, fading
 * back in as the car retreats — this is what makes completed road "go
 * away" and reappear on Back rather than just sitting there passively. */
function RoadSegment({
  p0,
  p1,
  index,
  totalSteps,
  horizontal,
  progress,
}: {
  p0: Waypoint;
  p1: Waypoint;
  index: number;
  totalSteps: number;
  horizontal: boolean;
  progress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const carStepPos = progress.value * (totalSteps - 1);
    const opacity = interpolate(carStepPos - index, [0, FADE_TRAIL], [1, 0], 'clamp');
    return { opacity };
  });
  const d = buildSegmentPath(p0, p1, horizontal);
  return (
    <AnimatedG animatedProps={animatedProps}>
      <Path d={d} stroke="#3A3F4E" strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.18} />
      <Path d={d} stroke="#575D6E" strokeWidth={42} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={d} stroke="#F4F4F8" strokeWidth={3} strokeDasharray="12 12" strokeLinecap="round" fill="none" opacity={0.85} />
    </AnimatedG>
  );
}

/** One step's marker, styled as a small road sign on a post rather than a
 * plain dot — done/current/upcoming shown through fill color the same way
 * the rest of the app already does (red = complete, matching StatusChip
 * etc.), just on a sign-shaped body instead of a circle. Fades in step
 * with its outgoing road segment (same index, same threshold) so the sign
 * and the road leaving it recede together, not independently. */
function RoadStop({
  step,
  index,
  totalSteps,
  wp,
  containerWidth,
  containerHeight,
  horizontal,
  isLast,
  isViewed,
  progress,
  onPress,
}: {
  step: DealStep;
  index: number;
  totalSteps: number;
  wp: Waypoint;
  containerWidth: number;
  containerHeight: number;
  horizontal: boolean;
  isLast: boolean;
  isViewed: boolean;
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const isNear = index % 2 === 0; // "near edge" side — left (vertical) or top (horizontal)

  const fadeStyle = useAnimatedStyle(() => {
    const carStepPos = progress.value * (totalSteps - 1);
    const opacity = interpolate(carStepPos - index, [0, FADE_TRAIL], [1, 0], 'clamp');
    return { opacity };
  });

  // Position goes on the outer (absolutely-placed, fading) wrapper; the
  // flex direction that arranges [sign, label] goes on the Pressable
  // itself — the wrapper only ever has that one child, so flexDirection
  // on it wouldn't do anything.
  const posStyle = horizontal
    ? isNear
      ? { left: wp.x - SIGN_SIZE / 2, top: wp.y - SIGN_SIZE / 2 }
      : { left: wp.x - SIGN_SIZE / 2, bottom: containerHeight - wp.y - SIGN_SIZE / 2 }
    : isNear
      ? { left: wp.x - SIGN_SIZE / 2, top: wp.y - SIGN_SIZE / 2 }
      : { right: containerWidth - wp.x - SIGN_SIZE / 2, top: wp.y - SIGN_SIZE / 2 };

  const pressableDirection = horizontal
    ? isNear
      ? ('column' as const)
      : ('column-reverse' as const)
    : isNear
      ? ('row' as const)
      : ('row-reverse' as const);

  const labelSpacing = horizontal
    ? isNear
      ? { marginTop: 6, alignItems: 'center' as const }
      : { marginBottom: 6, alignItems: 'center' as const }
    : isNear
      ? { marginLeft: 8 }
      : { marginRight: 8, alignItems: 'flex-end' as const };

  return (
    <Animated.View pointerEvents="box-none" style={[styles.stopRow, posStyle, fadeStyle]}>
      <Pressable
        onPress={onPress}
        style={[styles.stopPressable, { flexDirection: pressableDirection }, isViewed && styles.stopRowViewed]}>
        <View style={{ alignItems: 'center' }}>
          <View
            style={[
              signStyles.face,
              step.status === 'done' && signStyles.faceDone,
              step.status === 'current' && signStyles.faceCurrent,
              step.status === 'upcoming' && signStyles.faceUpcoming,
            ]}>
            {step.status === 'done' && <CheckIcon size={17} color="#fff" strokeWidth={3} />}
            {step.status === 'current' && <View style={signStyles.currentDot} />}
            {step.status === 'upcoming' && isLast && <PackageIcon size={16} color="#B7BBCB" />}
          </View>
          <View style={signStyles.post} />
        </View>
        <View style={[styles.labelWrap, labelSpacing, horizontal && { maxWidth: 90 }]}>
          <Text
            style={[
              styles.label,
              horizontal && { textAlign: 'center' },
              step.status === 'current' && styles.labelCurrent,
              step.status === 'upcoming' && styles.labelUpcoming,
            ]}
            numberOfLines={2}>
            {step.title}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const signStyles = StyleSheet.create({
  face: {
    width: SIGN_SIZE,
    height: SIGN_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    ...Shadow.card,
  },
  faceDone: { backgroundColor: Colors.red },
  faceCurrent: { backgroundColor: Colors.navy },
  faceUpcoming: { backgroundColor: '#fff', borderColor: '#D6D9E4' },
  currentDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  post: { width: 4, height: 12, backgroundColor: '#B9BDC9', marginTop: -2, borderRadius: 2 },
});

interface TimelineRoadProps {
  steps: DealStep[];
  car: InventoryDetail | null;
  /** Which stop the car is currently sitting at / showing detail for —
   * controlled by the parent so a back/forward control can drive it. */
  viewedIndex: number;
  onStepPress: (index: number) => void;
  /** Landscape: road runs left-to-right instead of top-to-bottom. */
  horizontal?: boolean;
}

export function TimelineRoad({ steps, car, viewedIndex, onStepPress, horizontal = false }: TimelineRoadProps) {
  const waypoints = buildWaypoints(steps.length, horizontal);
  const alongTotal = START_PAD + (steps.length - 1) * STEP_SPACING + END_PAD;
  const crossTotal = (horizontal ? FAR_EDGE_H : FAR_EDGE_V) + NEAR_EDGE;
  const containerWidth = horizontal ? alongTotal : crossTotal;
  const containerHeight = horizontal ? crossTotal : alongTotal;
  const lastIndex = steps.length - 1;
  const isAtFinalStop = viewedIndex === lastIndex && steps[lastIndex].status !== 'upcoming';

  const progress = useSharedValue(0);
  const morph = useSharedValue(0);
  const [showPhoto, setShowPhoto] = useState(false);

  useEffect(() => {
    const target = steps.length > 1 ? viewedIndex / (steps.length - 1) : 0;
    // Slower and more deliberate than a fixed duration — a full end-to-end
    // drive should feel like a real trip, not a snap; a single back/forward
    // step should still feel responsive. Scales with distance traveled.
    const stepsMoved = Math.abs(target - progress.value) * (steps.length - 1);
    const duration = Math.max(550, stepsMoved * 900);
    progress.value = withTiming(target, { duration, easing: Easing.inOut(Easing.cubic) });

    if (isAtFinalStop && car) {
      setShowPhoto(true);
      morph.value = withTiming(1, { duration: 450 });
    } else {
      morph.value = withTiming(0, { duration: 300 });
      const t = setTimeout(() => setShowPhoto(false), 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedIndex, horizontal]);

  const xs = waypoints.map((w) => w.x);
  const ys = waypoints.map((w) => w.y);
  const inputRange = waypoints.map((_, i) => (steps.length > 1 ? i / (steps.length - 1) : 0));

  const carStyle = useAnimatedStyle(() => {
    const x = interpolate(progress.value, inputRange, xs, 'clamp');
    const y = interpolate(progress.value, inputRange, ys, 'clamp');
    return {
      left: x - CAR_SIZE / 2,
      top: y - CAR_SIZE / 2 - 6,
      opacity: 1 - morph.value,
      transform: [{ scale: 1 - morph.value * 0.2 }],
    };
  });

  const photoStyle = useAnimatedStyle(() => ({
    opacity: morph.value,
    transform: [{ scale: 0.7 + morph.value * 0.3 }],
  }));

  const finalStop = waypoints[lastIndex];

  return (
    <View style={{ width: containerWidth, height: containerHeight, alignSelf: 'center' }}>
      <Svg width={containerWidth} height={containerHeight} style={StyleSheet.absoluteFill}>
        {waypoints.slice(0, -1).map((wp, i) => (
          <RoadSegment
            key={i}
            p0={wp}
            p1={waypoints[i + 1]}
            index={i}
            totalSteps={steps.length}
            horizontal={horizontal}
            progress={progress}
          />
        ))}
      </Svg>

      {waypoints.map((wp, i) => (
        <RoadStop
          key={steps[i].id}
          step={steps[i]}
          index={i}
          totalSteps={steps.length}
          wp={wp}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          horizontal={horizontal}
          isLast={i === lastIndex}
          isViewed={i === viewedIndex}
          progress={progress}
          onPress={() => onStepPress(i)}
        />
      ))}

      {showPhoto && car && (
        <Animated.View
          pointerEvents="none"
          style={[styles.photoWrap, { left: finalStop.x - 34, top: finalStop.y - 34 - 6 }, photoStyle]}>
          <Image source={{ uri: car.thumbnail }} style={styles.photo} contentFit="cover" />
        </Animated.View>
      )}

      <Animated.View pointerEvents="none" style={[styles.carShadow, carStyle]} />
      <Animated.View pointerEvents="none" style={[styles.carWrap, carStyle]}>
        <CarSideIcon size={CAR_SIZE} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stopRow: {
    position: 'absolute',
    alignItems: 'center',
  },
  stopPressable: {
    alignItems: 'center',
    padding: 4,
    borderRadius: Radius.md,
  },
  stopRowViewed: {
    backgroundColor: 'rgba(39,51,104,0.08)',
  },
  labelWrap: {
    maxWidth: 110,
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    color: Colors.text,
    lineHeight: 15,
  },
  labelCurrent: { color: Colors.red },
  labelUpcoming: { color: Colors.textFaint },
  carWrap: {
    position: 'absolute',
    width: CAR_SIZE,
    height: CAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carShadow: {
    position: 'absolute',
    width: CAR_SIZE * 0.7,
    height: 10,
    marginTop: CAR_SIZE - 8,
    marginLeft: CAR_SIZE * 0.15,
    borderRadius: 6,
    backgroundColor: '#000',
    opacity: 0.15,
  },
  photoWrap: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.navyTint,
    borderWidth: 3,
    borderColor: '#fff',
    ...Shadow.card,
  },
  photo: { width: '100%', height: '100%' },
});

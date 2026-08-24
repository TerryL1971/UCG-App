import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { CarSideIcon, CheckIcon, PackageIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';
import type { DealStep } from '@/constants/mock-data';
import type { InventoryDetail } from '@/lib/ucg-inventory';

const ROAD_WIDTH = 320;
const LEFT_X = 72;
const RIGHT_X = ROAD_WIDTH - 72;
const Y_STEP = 150;
const TOP_PAD = 40;
const BOTTOM_PAD = 70;
const SIGN_SIZE = 40;
const CAR_SIZE = 52;

interface Waypoint {
  x: number;
  y: number;
}

function buildWaypoints(count: number): Waypoint[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i % 2 === 0 ? LEFT_X : RIGHT_X,
    y: TOP_PAD + i * Y_STEP,
  }));
}

/** Smooth S-curve road connecting each waypoint — a cubic bezier per
 * segment with control points pulled toward the midline, which is what
 * makes it swing side to side rather than zigzag with sharp corners. */
function buildRoadPath(points: Waypoint[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midY = (p0.y + p1.y) / 2;
    d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
  }
  return d;
}

/** One step's marker, styled as a small road sign on a post rather than a
 * plain dot — done/current/upcoming shown through fill color the same way
 * the rest of the app already does (red = complete, matching StatusChip
 * etc.), just on a sign-shaped body instead of a circle. */
function RoadSign({ status, isLast }: { status: DealStep['status']; isLast: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={[
          signStyles.face,
          status === 'done' && signStyles.faceDone,
          status === 'current' && signStyles.faceCurrent,
          status === 'upcoming' && signStyles.faceUpcoming,
        ]}>
        {status === 'done' && <CheckIcon size={17} color="#fff" strokeWidth={3} />}
        {status === 'current' && <View style={signStyles.currentDot} />}
        {status === 'upcoming' && isLast && <PackageIcon size={16} color="#B7BBCB" />}
      </View>
      <View style={signStyles.post} />
    </View>
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
}

export function TimelineRoad({ steps, car, viewedIndex, onStepPress }: TimelineRoadProps) {
  const waypoints = buildWaypoints(steps.length);
  const totalHeight = TOP_PAD + (steps.length - 1) * Y_STEP + BOTTOM_PAD;
  const roadPath = buildRoadPath(waypoints);
  const lastIndex = steps.length - 1;
  const isAtFinalStop = viewedIndex === lastIndex && steps[lastIndex].status !== 'upcoming';

  const progress = useSharedValue(0);
  const morph = useSharedValue(0);
  const [showPhoto, setShowPhoto] = useState(false);

  useEffect(() => {
    const target = steps.length > 1 ? viewedIndex / (steps.length - 1) : 0;
    progress.value = withTiming(target, { duration: 650, easing: Easing.inOut(Easing.cubic) });

    if (isAtFinalStop && car) {
      setShowPhoto(true);
      morph.value = withTiming(1, { duration: 450 });
    } else {
      morph.value = withTiming(0, { duration: 300 });
      const t = setTimeout(() => setShowPhoto(false), 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedIndex]);

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
    <View style={{ width: ROAD_WIDTH, height: totalHeight, alignSelf: 'center' }}>
      <Svg width={ROAD_WIDTH} height={totalHeight} style={StyleSheet.absoluteFill}>
        <Path d={roadPath} stroke="#3A3F4E" strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.18} />
        <Path d={roadPath} stroke="#575D6E" strokeWidth={42} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path
          d={roadPath}
          stroke="#F4F4F8"
          strokeWidth={3}
          strokeDasharray="12 12"
          strokeLinecap="round"
          fill="none"
          opacity={0.85}
        />
      </Svg>

      {waypoints.map((wp, i) => {
        const step = steps[i];
        const isLeft = i % 2 === 0;
        const isViewed = i === viewedIndex;
        return (
          <Pressable
            key={step.id}
            onPress={() => onStepPress(i)}
            style={[
              styles.stopRow,
              isViewed && styles.stopRowViewed,
              isLeft
                ? { left: wp.x - SIGN_SIZE / 2, top: wp.y - SIGN_SIZE / 2, flexDirection: 'row' }
                : { right: ROAD_WIDTH - wp.x - SIGN_SIZE / 2, top: wp.y - SIGN_SIZE / 2, flexDirection: 'row-reverse' },
            ]}>
            <RoadSign status={step.status} isLast={i === lastIndex} />
            <View style={[styles.labelWrap, isLeft ? { marginLeft: 8 } : { marginRight: 8, alignItems: 'flex-end' }]}>
              <Text
                style={[
                  styles.label,
                  step.status === 'current' && styles.labelCurrent,
                  step.status === 'upcoming' && styles.labelUpcoming,
                ]}
                numberOfLines={2}>
                {step.title}
              </Text>
            </View>
          </Pressable>
        );
      })}

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

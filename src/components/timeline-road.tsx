import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { CarSideIcon } from '@/components/icons';
import { TimelineDot } from '@/components/timeline-dot';
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';
import type { DealStep } from '@/constants/mock-data';
import type { InventoryDetail } from '@/lib/ucg-inventory';

const ROAD_WIDTH = 320;
const LEFT_X = 72;
const RIGHT_X = ROAD_WIDTH - 72;
const Y_STEP = 150;
const TOP_PAD = 40;
const BOTTOM_PAD = 70;
const DOT_SIZE = 34;
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

interface TimelineRoadProps {
  steps: DealStep[];
  car: InventoryDetail | null;
  onStepPress: (step: DealStep) => void;
}

export function TimelineRoad({ steps, car, onStepPress }: TimelineRoadProps) {
  const waypoints = buildWaypoints(steps.length);
  const totalHeight = TOP_PAD + (steps.length - 1) * Y_STEP + BOTTOM_PAD;
  const roadPath = buildRoadPath(waypoints);

  // Furthest point reached: the last step that's 'done' or 'current'. If
  // every step is somehow 'upcoming' (shouldn't happen in practice), the
  // car just sits at the start rather than driving nowhere.
  let targetIndex = 0;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].status !== 'upcoming') targetIndex = i;
  }
  const reachedFinalStop = targetIndex === steps.length - 1 && steps[targetIndex].status !== 'upcoming';

  const progress = useSharedValue(0);
  const morph = useSharedValue(0);
  const [morphed, setMorphed] = useState(false);

  useEffect(() => {
    const target = steps.length > 1 ? targetIndex / (steps.length - 1) : 0;
    progress.value = withTiming(
      target,
      { duration: 900 + target * 2200, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished && reachedFinalStop && car) {
          morph.value = withTiming(1, { duration: 500 });
          runOnJS(setMorphed)(true);
        }
      },
    );
    // Intentionally runs once on mount — this is a "reveal" animation for
    // wherever the deal currently stands, not a live step-by-step tracker
    // (dealSteps is static mock data; there's no real "just advanced one
    // step" moment to animate yet).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const finalStop = waypoints[waypoints.length - 1];

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
        return (
          <Pressable
            key={step.id}
            onPress={() => onStepPress(step)}
            style={[
              styles.stopRow,
              isLeft
                ? { left: wp.x - DOT_SIZE / 2, top: wp.y - DOT_SIZE / 2, flexDirection: 'row' }
                : { right: ROAD_WIDTH - wp.x - DOT_SIZE / 2, top: wp.y - DOT_SIZE / 2, flexDirection: 'row-reverse' },
            ]}>
            <TimelineDot status={step.status} isLast={i === steps.length - 1} />
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

      {/* Photo takes over the final stop once the car "arrives" there. */}
      {car && (
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

      {morphed && car && (
        <View pointerEvents="none" style={[styles.arrivedBadge, { left: finalStop.x - 60, top: finalStop.y + 26 }]}>
          <Text style={styles.arrivedText} numberOfLines={1}>
            {car.year} {car.title}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stopRow: {
    position: 'absolute',
    alignItems: 'center',
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
  arrivedBadge: {
    position: 'absolute',
    width: 120,
    alignItems: 'center',
  },
  arrivedText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11.5,
    color: Colors.navy,
    textAlign: 'center',
  },
});

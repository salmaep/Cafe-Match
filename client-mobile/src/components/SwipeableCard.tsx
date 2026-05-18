import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors } from '../theme';

const { width } = Dimensions.get('window');

const SWIPE_THRESHOLD = 120;
const SWIPE_OUT_X = width * 1.5;
const SPRING_OUT = { damping: 20, stiffness: 90, mass: 1, overshootClamping: true };
const SPRING_BACK = { damping: 15, stiffness: 150, mass: 0.7 };

export type SwipeableCardProps = {
  top: number;
  left: number;
  width: number;
  height: number;
  onSwipeComplete: (dir: 'left' | 'right') => void;
  onTap?: () => void;
  tapFailGesture?: ReturnType<typeof Gesture.Native>;
  leftLabel?: string;
  rightLabel?: string;
  children: React.ReactNode;
};

export default function SwipeableCard({
  top,
  left,
  width: cardW,
  height: cardH,
  onSwipeComplete,
  onTap,
  tapFailGesture,
  leftLabel = 'NOPE',
  rightLabel = 'SHORTLIST ★',
  children,
}: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SWIPE_OUT_X, SPRING_OUT);
        runOnJS(onSwipeComplete)('right');
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SWIPE_OUT_X, SPRING_OUT);
        runOnJS(onSwipeComplete)('left');
      } else {
        translateX.value = withSpring(0, SPRING_BACK);
        translateY.value = withSpring(0, SPRING_BACK);
      }
    });

  const baseTap = Gesture.Tap().maxDistance(10).onEnd((_e, success) => {
    if (success && onTap) runOnJS(onTap)();
  });
  const tap = tapFailGesture
    ? baseTap.requireExternalGestureToFail(tapFailGesture)
    : baseTap;

  const composedGesture = Gesture.Exclusive(pan, tap);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-width, 0, width],
          [-8, 0, 8],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  const nopeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top,
            left,
            width: cardW,
            height: cardH,
          },
          animatedCardStyle,
        ]}
      >
        {children}

        <Animated.View
          pointerEvents="none"
          style={[styles.overlayLeftWrapper, nopeOverlayStyle]}
        >
          <Text style={styles.overlayLabelNope}>{leftLabel}</Text>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[styles.overlayRightWrapper, likeOverlayStyle]}
        >
          <Text style={styles.overlayLabelLike}>{rightLabel}</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  overlayLeftWrapper: {
    position: 'absolute',
    top: 32,
    right: 24,
    transform: [{ rotate: '20deg' }],
  },
  overlayRightWrapper: {
    position: 'absolute',
    top: 32,
    left: 24,
    transform: [{ rotate: '-20deg' }],
  },
  overlayLabelNope: {
    backgroundColor: colors.error,
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    letterSpacing: 1,
    overflow: 'hidden',
  },
  overlayLabelLike: {
    backgroundColor: colors.accent,
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    letterSpacing: 1,
    overflow: 'hidden',
  },
});

/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - Named springs (`gentle`, `snappy`, `bouncy`, `settle`) instead of magic
 *     numbers sprinkled across components. Design language is a vocabulary;
 *     `withSpring(value, springs.snappy)` reads like English, whereas
 *     `withSpring(value, { damping: 20, stiffness: 260, mass: 0.8 })` is
 *     noise.
 *   - Damping is tuned slightly higher than Reanimated defaults on every
 *     preset. The app's motion language is "settle, don't snap" — physics
 *     should feel grounded, never perky.
 *   - `useSpringPress` hook bundles the very common pattern of "scale down
 *     slightly on press, settle back on release" into a one-liner. It
 *     exposes `animatedStyle`, `onPressIn`, `onPressOut` — drop them onto
 *     any `Pressable`-like component and you get the interaction.
 */

import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

export type SpringConfig = {
  damping: number;
  stiffness: number;
  mass: number;
};

/**
 * `gentle` — slow, smooth, no overshoot.
 * Use for: major layout transitions (expanding sections, screen entry).
 */
const gentle: SpringConfig = { damping: 22, stiffness: 120, mass: 1 };

/**
 * `snappy` — quick, minimal overshoot.
 * Use for: tabs, toggles, fast state switches.
 */
const snappy: SpringConfig = { damping: 20, stiffness: 260, mass: 0.8 };

/**
 * `bouncy` — playful, visible overshoot.
 * Use for: celebratory reveals, badges, confetti moments.
 */
const bouncy: SpringConfig = { damping: 10, stiffness: 180, mass: 0.9 };

/**
 * `settle` — a press releasing back to rest.
 * Use for: button and card press feedback (see `useSpringPress`).
 */
const settle: SpringConfig = { damping: 18, stiffness: 240, mass: 0.9 };

export const springs = { gentle, snappy, bouncy, settle } as const;

/**
 * Hook for "press scales down, release scales back up" interactions.
 *
 * Usage:
 *   const { animatedStyle, onPressIn, onPressOut } = useSpringPress();
 *   <Animated.View style={animatedStyle}>
 *     <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>...</Pressable>
 *   </Animated.View>
 */
export function useSpringPress(options?: {
  scale?: number;
  spring?: SpringConfig;
}): {
  animatedStyle: StyleProp<ViewStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const targetScale = options?.scale ?? 0.97;
  const config = options?.spring ?? springs.settle;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ scale: scale.value }] };
  });

  const onPressIn = () => {
    scale.value = withSpring(targetScale, config);
  };

  const onPressOut = () => {
    scale.value = withSpring(1, config);
  };

  return { animatedStyle, onPressIn, onPressOut };
}

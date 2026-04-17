/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - A production-grade button with a 4×4 variant/size matrix, loading
 *     states that swap to a contextual verb after 2 s ("Saving…",
 *     "Creating…"), and a width-lock that prevents the label swap from
 *     causing layout jitter.
 *   - The "outer Animated.View + inner plain Pressable" pattern. This
 *     sidesteps a real bug in React Native where
 *     `Animated.createAnimatedComponent(Pressable)` combined with a
 *     `style={(state) => [...]}` function and a `useAnimatedStyle` transform
 *     silently drops `backgroundColor` and `shadow*` on iOS Simulator and
 *     Expo Go — leaving the button invisible but still tappable. The fix:
 *     the outer `Animated.View` carries the visible surface, the inner plain
 *     `Pressable` handles touch and a11y only.
 *   - Accessibility roles, labels, and the `busy: true` state reported to
 *     screen readers while the button is loading.
 *
 * Dependencies inlined for portability:
 *   - `tokens` from `03-design-tokens.ts`
 *   - `shadow` from `04-shadow-helper.ts`
 *   - `haptics` from `05-haptics-reduced-motion.ts`
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from './03-design-tokens';
import { shadow } from './04-shadow-helper';
import { haptics } from './05-haptics-reduced-motion';

export type ButtonSize = 'large' | 'medium' | 'small' | 'text';
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonLoadingIntent = 'create' | 'save' | 'send' | 'confirm' | 'delete' | 'default';

export type ButtonProps = {
  children: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  loading?: boolean;
  loadingIntent?: ButtonLoadingIntent;
  disabled?: boolean;
  onPress?: () => void;
  fullWidth?: boolean;
  accessibilityLabel?: string;
};

const LOADING_VERBS: Record<ButtonLoadingIntent, string> = {
  create: 'Creating…',
  save: 'Saving…',
  send: 'Sending…',
  confirm: 'Confirming…',
  delete: 'Deleting…',
  default: 'Processing…',
};

const SIZE_HEIGHT: Record<ButtonSize, number | undefined> = {
  large: 56,
  medium: 48,
  small: 40,
  text: undefined,
};

const SIZE_PADDING: Record<ButtonSize, number> = {
  large: tokens.spacing.md,
  medium: tokens.spacing.md,
  small: tokens.spacing.sm,
  text: 0,
};

const LOADING_VERB_DELAY_MS = 2000;
const FADE_DURATION = tokens.motion.duration.fast;
const EASING = Easing.bezier(0.4, 0, 0.2, 1);

export function Button({
  children,
  size = 'medium',
  variant = 'primary',
  loading = false,
  loadingIntent = 'default',
  disabled = false,
  onPress,
  fullWidth,
  accessibilityLabel,
}: ButtonProps) {
  const [lockedWidth, setLockedWidth] = useState<number | null>(null);
  const [showVerb, setShowVerb] = useState(false);
  const [pressed, setPressed] = useState(false);

  const verbOpacity = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const measuredWidth = useRef<number | null>(null);

  const isDisabled = disabled || loading;

  // Lock the button's width the moment `loading` flips, so the label
  // swap ("Save" → "Saving…") doesn't cause the button to expand.
  useEffect(() => {
    if (!loading) {
      setShowVerb(false);
      setLockedWidth(null);
      verbOpacity.value = 0;
      return;
    }
    if (measuredWidth.current != null) {
      setLockedWidth(measuredWidth.current);
    }
    const timeout = setTimeout(() => {
      setShowVerb(true);
      verbOpacity.value = withTiming(1, { duration: FADE_DURATION, easing: EASING });
    }, LOADING_VERB_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [loading, verbOpacity]);

  const verbStyle = useAnimatedStyle(() => ({ opacity: verbOpacity.value }));
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    if (!loading) {
      measuredWidth.current = event.nativeEvent.layout.width;
    }
  };

  const palette = getPalette(variant);
  const height = SIZE_HEIGHT[size];

  const containerStyle: ViewStyle = {
    height,
    minWidth: lockedWidth ?? undefined,
    paddingHorizontal: SIZE_PADDING[size],
    borderRadius: tokens.radius.control,
    backgroundColor: palette.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: disabled ? 0.4 : 1,
    gap: tokens.spacing.xs,
  };

  const shadowStyle =
    !disabled && (variant === 'primary' || variant === 'destructive')
      ? shadow.standard
      : undefined;

  const labelStyle: TextStyle | undefined =
    variant === 'ghost' && pressed ? { textDecorationLine: 'underline' } : undefined;

  return (
    // Outer Animated.View carries the visible surface (background, shadow,
    // radius, transform). The scale transform and any future animated style
    // live here — NEVER on the Pressable itself. See the header note for why.
    <Animated.View style={[containerStyle, shadowStyle, pressStyle]}>
      <Pressable
        onPress={() => {
          haptics.light();
          onPress?.();
        }}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? children}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        onLayout={handleLayout}
        onPressIn={() => {
          setPressed(true);
          pressScale.value = withTiming(0.97, { duration: 80 });
        }}
        onPressOut={() => {
          setPressed(false);
          pressScale.value = withTiming(1, { duration: 120 });
        }}
        // Inner Pressable is invisible-by-design: no background, no shadow,
        // just fills the parent to capture touches and carry a11y metadata.
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
      >
        {loading ? (
          <>
            <ActivityIndicator
              size="small"
              color={variant === 'destructive' ? '#FFFFFF' : palette.text}
            />
            {showVerb && (
              <Animated.View style={verbStyle}>
                <Text style={[{ color: palette.text, fontSize: 15, fontWeight: '600' }]}>
                  {LOADING_VERBS[loadingIntent]}
                </Text>
              </Animated.View>
            )}
          </>
        ) : (
          <Text style={[{ color: palette.text, fontSize: 15, fontWeight: '600' }, labelStyle]}>
            {children}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function getPalette(variant: ButtonVariant): { background: string; text: string } {
  switch (variant) {
    case 'primary':
      return { background: tokens.colors.primary, text: tokens.colors.text.inverse };
    case 'secondary':
      return { background: tokens.colors.surface.secondary, text: tokens.colors.text.hero };
    case 'destructive':
      return { background: tokens.colors.error.solid, text: '#FFFFFF' };
    case 'ghost':
      return { background: 'transparent', text: tokens.colors.text.hero };
  }
}

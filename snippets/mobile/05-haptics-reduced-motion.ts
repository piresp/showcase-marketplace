/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - Haptics exposed as semantic events (`selection`, `light`, `success`)
 *     rather than raw `expo-haptics` primitives. Call sites describe intent,
 *     not physical mechanics. If Apple ships a new haptic class tomorrow, we
 *     remap one place and every call site benefits.
 *   - **Reduced-motion as an accessibility axis covers haptics too.** Users
 *     who enable "Reduce Motion" on iOS (or the equivalent on Android) often
 *     do so because motion and vibration are physically uncomfortable. We
 *     treat the setting as a global kill switch for haptic feedback.
 *   - A tiny HMR cleanup: the accessibility listener is process-global, so
 *     a hot reload without cleanup leaks listeners and fires multiple
 *     updates. The `module.hot.dispose` guard removes the subscription when
 *     the dev server swaps this file.
 *   - Errors from `Haptics.*` are swallowed intentionally. A haptic failure
 *     is never worth interrupting a user flow — it's ornamental feedback.
 */

import * as Haptics from 'expo-haptics';
import { AccessibilityInfo } from 'react-native';

let reducedMotion = false;

AccessibilityInfo.isReduceMotionEnabled()
  .then((value) => {
    reducedMotion = value;
  })
  .catch(() => {
    // Platform hasn't reported yet — default stays `false`, call sites fire.
  });

const subscription = AccessibilityInfo.addEventListener(
  'reduceMotionChanged',
  (value) => {
    reducedMotion = value;
  },
);

// Fast-refresh cleanup: without it, every save during dev accumulates another
// listener, and the `reducedMotion` flag starts flipping from stale closures.
declare const module: { hot?: { dispose: (cb: () => void) => void } };
if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => subscription.remove());
}

function fire(fn: () => Promise<void>): void {
  if (reducedMotion) return;
  fn().catch(() => {
    // Haptic failures are never user-facing.
  });
}

export const haptics = {
  selection: () => fire(() => Haptics.selectionAsync()),
  light:     () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium:    () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success:   () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error:     () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

// Usage:
//   haptics.selection();       // scrolling through a segmented control
//   haptics.light();            // tap on a button
//   haptics.success();          // order confirmed
//   haptics.error();            // validation failed

/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - A self-contained React hook that fires a callback when the user taps
 *     a target N times inside a time window. Production use: a hidden
 *     developer route that surfaces only when the splash logo is tapped
 *     seven times within three seconds. No menu entry, no build flag.
 *   - Tap count stored in a `ref`, not state — no rerender per tap. The
 *     state is mirrored for cases where a caller wants to show visual feedback
 *     (e.g. a faint "5/7" indicator once the sequence begins).
 *   - The `onTrigger` callback is kept in a ref too, so callers can inline
 *     a lambda (`onTrigger={() => router.push('/dev')}`) without the hook
 *     re-subscribing on every render.
 *   - Window resets automatically: if the user pauses longer than `windowMs`
 *     between taps, the sequence starts over from 1. Nothing to clean up.
 */

import { useCallback, useRef, useState } from 'react';

type Options = {
  onTrigger: () => void;
  /** How many taps are required to fire. Default 7. */
  taps?: number;
  /** Time window (ms) in which all taps must occur. Default 3000. */
  windowMs?: number;
};

export function useSecretGesture({
  onTrigger,
  taps = 7,
  windowMs = 3000,
}: Options): { onPress: () => void; count: number } {
  const [count, setCount] = useState(0);

  const firstTapRef = useRef<number | null>(null);
  const countRef = useRef(0);

  // Keep the callback current without causing the `onPress` identity to
  // change — consumers can memoize around this hook safely.
  const triggerRef = useRef(onTrigger);
  triggerRef.current = onTrigger;

  const onPress = useCallback(() => {
    const now = Date.now();
    const first = firstTapRef.current;

    // Starting a new window (first tap, or previous window timed out).
    if (first === null || now - first > windowMs) {
      firstTapRef.current = now;
      countRef.current = 1;
      setCount(1);
      return;
    }

    const next = countRef.current + 1;

    if (next >= taps) {
      // Sequence complete: reset and fire.
      firstTapRef.current = null;
      countRef.current = 0;
      setCount(0);
      triggerRef.current();
    } else {
      countRef.current = next;
      setCount(next);
    }
  }, [taps, windowMs]);

  return { onPress, count };
}

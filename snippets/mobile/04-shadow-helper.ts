/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - A small trick: `shadow` is both a callable function and a namespace of
 *     preset objects. You can write `shadow('hero')` or `shadow.hero` and
 *     both work. No ambiguity, no naming collision, no consumers broken when
 *     we swap between idioms.
 *   - Every preset pairs iOS shadow props with Android `elevation`. On RN,
 *     the legacy `shadowColor/Offset/Opacity/Radius` props only render on
 *     iOS — Android needs `elevation`. Forgetting the pair is a classic bug
 *     ("looks flat on my Pixel"). The helper makes it impossible to forget.
 *   - Typed via `satisfies` so autocomplete shows the exact preset keys, and
 *     a misspelled `shadow('heero')` is caught at compile time.
 */

import type { ViewStyle } from 'react-native';
import { tokens } from './03-design-tokens';

type ShadowKey = keyof typeof tokens.shadow;

// Cast each preset up to `ViewStyle` once — the tokens file keeps them
// narrower for autocomplete on the design-system side.
const _presets = {
  standard: tokens.shadow.standard as ViewStyle,
  floating: tokens.shadow.floating as ViewStyle,
  hero:     tokens.shadow.hero as ViewStyle,
  pressed:  tokens.shadow.pressed as ViewStyle,
} satisfies Record<ShadowKey, ViewStyle>;

// The callable form — returns a fresh object so accidental mutation on one
// consumer doesn't leak into another.
function _shadowFn(token: ShadowKey): ViewStyle {
  return { ..._presets[token] };
}

// Merge the function with the preset record. TypeScript sees both halves.
export const shadow = Object.assign(_shadowFn, _presets) as typeof _shadowFn &
  typeof _presets;

// Usage:
//   <View style={shadow('hero')} />     // call form, fresh object
//   <View style={shadow.hero} />        // namespace form, shared reference

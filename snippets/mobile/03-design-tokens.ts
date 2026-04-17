/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - A single source of truth for visual language. Every screen in the app
 *     imports from this file and nothing else for design decisions — no
 *     hardcoded colors, spacings, radii, or motion constants anywhere else.
 *   - Semantic color naming (`text.hero`, `surface.secondary`, `success.bg`)
 *     instead of raw hex exposed to components. When the brand shifts, we
 *     change one file.
 *   - A tight radius scale — only four values. Most design systems drown in
 *     `radius.sm / md / lg / xl / 2xl / 3xl`; experience has shown that three
 *     or four radii cover 99% of cases and more just produce drift.
 *   - Shadow presets paired for iOS and Android. RN's legacy shadow props
 *     (`shadowColor/Offset/Opacity/Radius`) only render on iOS; Android needs
 *     `elevation`. Shipping both together from a token avoids the
 *     "looks-good-on-iOS-flat-on-Android" bug.
 *   - Motion kept minimal: two durations (fast/standard) and one easing. The
 *     real runtime motion lives in springs (see `06-spring-presets.ts`);
 *     `motion.duration.*` is for CSS-style timing where springs don't fit.
 *
 * The palette below is a neutral demo palette — swap it for your brand tokens.
 */

export const tokens = {
  colors: {
    // Brand
    primary: '#4F46E5', // indigo
    primaryHover: '#4338CA',
    secondary: '#0F172A', // slate-900
    secondaryLight: '#E2E8F0',

    // Surfaces
    background: '#F8FAFC',
    surface: {
      primary: '#FFFFFF',
      secondary: '#F1F5F9',
      tertiary: '#E2E8F0',
    },

    // Text — hero > body > meta (largest → smallest visual weight)
    text: {
      hero: '#0F172A',
      body: '#1E293B',
      meta: '#64748B',
      inverse: '#FFFFFF',
    },

    // Borders — used sparingly. Prefer tonal surface shifts over visible borders.
    border: {
      default: '#E2E8F0',
      strong: '#CBD5E1',
    },

    // Semantic — each pair is (text, background tint, solid action color)
    success: { text: '#15803D', bg: '#DCFCE7', solid: '#16A34A' },
    warning: { text: '#9A3412', bg: '#FFEDD5', solid: '#EA580C' },
    error:   { text: '#B91C1C', bg: '#FEE2E2', solid: '#DC2626' },
    info:    { text: '#1E40AF', bg: '#DBEAFE', solid: '#2563EB' },

    overlay: 'rgba(15, 23, 42, 0.4)',

    // Chart palette — ordered so the first three are always safe contrast pairs
    chart: ['#4F46E5', '#0F172A', '#EA580C', '#DC2626', '#16A34A', '#0891B2'],
  },

  // 4-pt base grid
  spacing: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
    '4xl': 64,
  },

  // Only four radii — anything more is usually noise.
  radius: {
    none: 0,
    control: 8,   // buttons, chips, inputs
    card: 14,     // cards, sheets, tiles
    modal: 20,    // full modals, large cards
    full: 9999,   // pills, avatars
  },

  // Each shadow ships iOS props + Android elevation together.
  // Use via a helper (see `04-shadow-helper.ts`) to avoid hand-pairing.
  shadow: {
    standard: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    floating: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    hero: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    pressed: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
  },

  // Typography is kept flat on purpose — one style per role, no "override this
  // style when used inside a card" exceptions. If a variant is needed, add a
  // new role instead of branching.
  typography: {
    h1Display:   { fontSize: 30, lineHeight: 36, letterSpacing: -0.6,  fontWeight: '700', fontFamily: 'Inter' },
    h2Section:   { fontSize: 22, lineHeight: 28, letterSpacing: -0.3,  fontWeight: '600', fontFamily: 'Inter' },
    h3Subtitle:  { fontSize: 16, lineHeight: 22, letterSpacing: -0.16, fontWeight: '500', fontFamily: 'Inter' },
    body:        { fontSize: 15, lineHeight: 22, letterSpacing: 0,     fontWeight: '400', fontFamily: 'Inter' },
    bodySmall:   { fontSize: 13, lineHeight: 18, letterSpacing: 0.13,  fontWeight: '400', fontFamily: 'Inter' },
    caption:     { fontSize: 11, lineHeight: 14, letterSpacing: 0.88,  fontWeight: '700', fontFamily: 'Inter' },
    label:       { fontSize: 13, lineHeight: 17, letterSpacing: 0.13,  fontWeight: '500', fontFamily: 'Inter' },
    buttonLarge: { fontSize: 16, lineHeight: 16, letterSpacing: -0.08, fontWeight: '600', fontFamily: 'Inter' },
    buttonMedium:{ fontSize: 15, lineHeight: 15, letterSpacing: 0,     fontWeight: '600', fontFamily: 'Inter' },
    buttonSmall: { fontSize: 14, lineHeight: 14, letterSpacing: 0,     fontWeight: '500', fontFamily: 'Inter' },
    // Numeric displays use a monospaced face so tabular columns of digits
    // don't shift width as values change (tabular-nums via `fontVariant`).
    metric:      { fontSize: 32, lineHeight: 36, letterSpacing: -0.64, fontWeight: '700', fontFamily: 'JetBrainsMono' },
    metricLarge: { fontSize: 40, lineHeight: 44, letterSpacing: -0.8,  fontWeight: '700', fontFamily: 'JetBrainsMono' },
  },

  motion: {
    duration: {
      fast: 200,
      standard: 300,
    },
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

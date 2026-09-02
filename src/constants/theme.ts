import { Platform } from 'react-native';

/**
 * Used Car Guys brand theme.
 * Colors are lifted directly from the logo (brand/ucg-logo-wide.pdf) — see
 * design-mockup/ for the source-of-truth visual mockup this app is built from.
 */
export const Colors = {
  navy: '#273368',
  navyDark: '#1B2450',
  navyTint: '#E7EAF5',
  red: '#C33531',
  redDark: '#A32A27',
  redTint: '#FBEAEA',
  bg: '#F7F7FB',
  card: '#FFFFFF',
  text: '#20263F',
  textMuted: '#6B7280',
  textFaint: '#9AA0B4',
  border: '#E7E7EE',
  green: '#2F9E60',
  greenTint: '#E7F5EC',
  amber: '#C97C10',
  amberTint: '#FBF0DF',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 18,
  pill: 999,
} as const;

/**
 * Display font (Barlow Condensed) for headlines/nav titles, matching the
 * bold condensed feel of the UCG wordmark. Body font (Barlow) for everything
 * readable. Loaded via @expo-google-fonts in src/app/_layout.tsx.
 */
export const Fonts = {
  display: 'BarlowCondensed_800ExtraBold',
  displaySemibold: 'BarlowCondensed_700Bold',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemibold: 'Barlow_600SemiBold',
  bodyBold: 'Barlow_700Bold',
} as const;

// react-native-web warns that the classic shadow* style props are
// deprecated there in favor of CSS `boxShadow` — but boxShadow doesn't
// exist on native (iOS reads shadow*, Android reads elevation), so
// switching to it outright would silently drop shadows on a real device.
// Platform.select gives each platform the form it actually understands:
// boxShadow (a CSS string) on web only, shadow*/elevation everywhere else.
export const Shadow = {
  card: Platform.select({
    web: { boxShadow: '0px 6px 18px rgba(39, 51, 104, 0.08)' },
    default: {
      shadowColor: '#273368',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 3,
    },
  }),
  button: Platform.select({
    web: { boxShadow: '0px 8px 16px rgba(195, 53, 49, 0.3)' },
    default: {
      shadowColor: '#C33531',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 4,
    },
  }),
} as const;

/** Minimum comfortable tap target, per Apple/Google HIG. */
export const MinHitSlop = 44;

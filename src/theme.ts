import { Platform, StyleSheet, type TextStyle } from 'react-native';
import { type CSSTransitionProperties, cubicBezier } from 'react-native-reanimated';

import { useStore } from './store';

export const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export const SANS_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
});

export const CAN_BLUR = Platform.OS === 'ios';

export const type = {
  displayLarge: {
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    fontWeight: '700' as const,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
  } as TextStyle,
  displayMedium: {
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    fontWeight: '700' as const,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  } as TextStyle,
  displaySmall: {
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    fontWeight: '700' as const,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  } as TextStyle,
  headline: {
    fontFamily: SANS_FONT,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  } as TextStyle,
  title2: {
    fontFamily: SANS_FONT,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  } as TextStyle,
  title3: {
    fontFamily: SANS_FONT,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
  } as TextStyle,
  subheadBold: {
    fontFamily: SANS_FONT,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
  } as TextStyle,
  subhead: {
    fontFamily: SANS_FONT,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400' as const,
  } as TextStyle,
  body: {
    fontFamily: SANS_FONT,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  } as TextStyle,
  bodyMedium: {
    fontFamily: SANS_FONT,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  } as TextStyle,
  callout: {
    fontFamily: SANS_FONT,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  } as TextStyle,
  footnote: {
    fontFamily: SANS_FONT,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  } as TextStyle,
  caption: {
    fontFamily: SANS_FONT,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400' as const,
  } as TextStyle,
  overline: {
    fontFamily: SANS_FONT,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    fontWeight: '600' as const,
  } as TextStyle,
};

export const space = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 28, xxl: 40 };

export const radius = {
  xs: 6,
  sm: 10,
  row: 14,
  badge: 12,
  button: 999,
  card: 16,
  cardLg: 20,
  pill: 999,
};

export const hairline = StyleSheet.hairlineWidth;

export const TAB_BAR_HEIGHT = 76;

export const ROW_INSET = space.base;

export type Palette = {
  scheme: 'light' | 'dark';
  // Core brand
  coral: string;
  coralPulse: string;
  primary: string;
  onPrimary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  neutral: string;
  
  // Surfaces & Text (Matching Figma ee & te)
  bg: string;
  surface: string;
  elevated: string;
  border: string;
  text: string;
  textSub: string;
  textMuted: string;
  
  // Backwards compatibility mappings
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  fill: string;
  separator: string;
  warm: string;
  glass: string;
  glassBorder: string;
  blurTint: 'light' | 'dark';
  headerBlur: 'light' | 'dark';
  indicator: 'default' | 'white';
};

const light: Palette = {
  scheme: 'light',
  coral: '#FF4B3E',
  coralPulse: '#FF8A7D',
  primary: '#FF4B3E',
  onPrimary: '#FFFFFF',
  accent: '#FF4B3E',
  success: '#2ECC71',
  warning: '#F5A623',
  error: '#A83232',
  neutral: '#707070',

  bg: '#F7F6F1',
  surface: '#FFFFFF',
  elevated: '#EDECE7',
  border: '#E8E6E0',
  text: '#141414',
  textSub: '#5C5C5C',
  textMuted: '#9A9A9A',

  label: '#141414',
  secondaryLabel: '#5C5C5C',
  tertiaryLabel: '#9A9A9A',
  fill: 'rgba(20,20,20,0.05)',
  separator: '#E8E6E0',
  warm: '#FF4B3E',
  glass: 'rgba(255,255,255,0.88)',
  glassBorder: '#E8E6E0',
  blurTint: 'light',
  headerBlur: 'light',
  indicator: 'default',
};

const dark: Palette = {
  scheme: 'dark',
  coral: '#FF4B3E',
  coralPulse: '#FF8A7D',
  primary: '#FF4B3E',
  onPrimary: '#FFFFFF',
  accent: '#FF4B3E',
  success: '#2ECC71',
  warning: '#F5A623',
  error: '#A83232',
  neutral: '#707070',

  bg: '#0F0F0F',
  surface: '#212121',
  elevated: '#3F3F3F',
  border: '#303030',
  text: '#F1F1F1',
  textSub: '#AAAAAA',
  textMuted: '#666666',

  label: '#F1F1F1',
  secondaryLabel: '#AAAAAA',
  tertiaryLabel: '#666666',
  fill: 'rgba(241,241,241,0.08)',
  separator: '#303030',
  warm: '#FF4B3E',
  glass: 'rgba(33,33,33,0.88)',
  glassBorder: '#303030',
  blurTint: 'dark',
  headerBlur: 'dark',
  indicator: 'white',
};

export function useTheme(): Palette {
  return useStore((s) => s.themePref) === 'Dark' ? dark : light;
}

export const THEME_TRANSITION = {};
export const PRESS_TRANSITION = {};

export const tabular = { fontVariant: ['tabular-nums' as const] };

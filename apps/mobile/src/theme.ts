/**
 * The SmartSchool mobile design tokens.
 *
 * The palette follows the reference design: a light lavender canvas, a purple
 * gradient for hero/banner surfaces, white rounded cards with soft purple
 * shadows, and a small set of semantic colors for status. Spacing/radius tokens
 * keep the layouts consistent across every screen.
 */

export const colors = {
  /** App canvas behind the cards. */
  background: '#f4f2fb',
  /** Card / sheet surface. */
  surface: '#ffffff',
  /** Slightly tinted surface for chips, inputs and inert buttons. */
  surfaceMuted: '#f6f4fd',

  primary: '#6d28d9',
  primaryDark: '#4c1d95',
  primaryLight: '#ede9fe',
  primarySoft: '#f5f3ff',

  /** Purple gradient used by the welcome banner and hero surfaces. */
  gradient: ['#7c3aed', '#5b21b6'] as const,

  text: '#1e293b',
  textMuted: '#64748b',
  textFaint: '#94a3b8',

  border: '#ece9f6',
  borderStrong: '#ded9f0',

  success: '#15803d',
  successSoft: '#dcfce7',
  warning: '#b45309',
  warningSoft: '#fef3c7',
  danger: '#b91c1c',
  dangerSoft: '#fee2e2',
  info: '#6d28d9',
  infoSoft: '#ede9fe',

  white: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** Soft purple card shadow (iOS shadow* + Android elevation). */
export const shadow = {
  shadowColor: '#4c1d95',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
} as const;

/** A slightly stronger shadow for floating/hero elements. */
export const shadowStrong = {
  shadowColor: '#4c1d95',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.16,
  shadowRadius: 18,
  elevation: 6,
} as const;

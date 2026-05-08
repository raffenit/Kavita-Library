export interface ColorScheme {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderLight: string;
  accent: string;
  accentDim: string;
  accentSoft: string;
  secondary: string;
  secondarySoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  success: string;
  error: string;
  warning: string;
  progressBar: string;
  progressTrack: string;
  overlay: string;
  cardShadow: string;
}

/**
 * Generate a rainbow gradient string for decorative UI elements (chips, tabs)
 * Uses accent → secondary → purple → pink for a chromatic effect
 *
 * TODO: Derive purple (#8B6DB8) and pink (#A85A95) from accent/secondary colors
 * instead of hardcoding. Could use hue rotation: purple = accent hue - 30°, pink = accent hue - 60°
 * Or use a color manipulation library like chroma.js or colord
 */
export function getRainbowGradient(colors: ColorScheme, angle: number = 135): string {
  return `linear-gradient(${angle}deg, ${colors.accent} 0%, ${colors.secondary} 40%, #8B6DB8 70%, #A85A95 100%)`;
}

/**
 * Generate a simplified gradient string for buttons and tabs
 * Uses only accent → secondary with 80% opacity for a cleaner, more opaque look
 */
export function getButtonGradient(colors: ColorScheme, angle: number = 135): string {
  return `linear-gradient(${angle}deg, ${colors.accent}CC 0%, ${colors.secondary}CC 100%)`;
}

/**
 * Get gradient color stops for SVG gradients (bottom tabs, icons)
 * Returns array of [offset, color] pairs
 */
export function getButtonGradientStops(colors: ColorScheme): Array<{ offset: string; color: string }> {
  return [
    { offset: '0%', color: colors.accent },
    { offset: '100%', color: colors.secondary },
  ];
}

export type ThemeName = 'midnight' | 'amoled' | 'sepia' | 'ocean' | 'forest' | 'starry' | 'custom';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type FontName =
  | 'georgia'
  | 'baskerville'
  | 'bookerly'
  | 'caroni'
  | 'roboto'
  | 'poppins'
  | 'mulish'
  | 'system'
  | 'opendyslexic';

export interface CustomFont {
  id: string;       // uuid-ish key
  name: string;     // display name (filename without extension)
  dataUrl: string;  // base64 data URL
}

// Placeholder custom theme — replaced at runtime by ThemeContext
export const defaultCustomTheme: ColorScheme = {
  background: '#0d0d12',
  surface: '#16161f',
  surfaceElevated: '#1e1e2a',
  border: '#2a2a3a',
  borderLight: '#353548',
  accent: '#e8a838',
  accentDim: '#b8832a',
  accentSoft: 'rgba(232, 168, 56, 0.15)',
  secondary: '#ffea4a',
  secondarySoft: 'rgba(255, 234, 74, 0.15)',
  textPrimary: '#f0ead8',
  textSecondary: '#b8b0b0',
  textMuted: '#7a7588',
  textOnAccent: '#0d0d12',
  success: '#4caf7d',
  error: '#e05c5c',
  warning: '#e8a838',
  progressBar: '#e8a838',
  progressTrack: '#2a2a3a',
  overlay: 'rgba(13, 13, 18, 0.85)',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
};

export const themes: Record<ThemeName, ColorScheme> = {
  midnight: {
    background: '#0d0d12',
    surface: '#16161f',
    surfaceElevated: '#1e1e2a',
    border: '#2a2a3a',
    borderLight: '#353548',
    accent: '#e8a838',
    accentDim: '#b8832a',
    accentSoft: 'rgba(232, 168, 56, 0.15)',
    secondary: '#ffea4a',
    secondarySoft: 'rgba(255, 234, 74, 0.15)',
    textPrimary: '#f0ead8',
    textSecondary: '#b8b0b0',
    textMuted: '#7a7588',
    textOnAccent: '#0d0d12',
    success: '#4caf7d',
    error: '#e05c5c',
    warning: '#e8a838',
    progressBar: '#e8a838',
    progressTrack: '#2a2a3a',
    overlay: 'rgba(13, 13, 18, 0.85)',
    cardShadow: 'rgba(0, 0, 0, 0.5)',
  },
  amoled: {
    background: '#000000',
    surface: '#0c0c0c',
    surfaceElevated: '#141414',
    border: '#222222',
    borderLight: '#2e2e2e',
    accent: '#9b7cf5',
    accentDim: '#7a5ed4',
    accentSoft: 'rgba(155, 124, 245, 0.15)',
    secondary: '#00f0e0',
    secondarySoft: 'rgba(0, 240, 224, 0.15)',
    textPrimary: '#f0eeff',
    textSecondary: '#a8a8c0',
    textMuted: '#707080',
    textOnAccent: '#0d0d12',
    success: '#4caf7d',
    error: '#e05c5c',
    warning: '#f0c040',
    progressBar: '#9b7cf5',
    progressTrack: '#222222',
    overlay: 'rgba(0, 0, 0, 0.88)',
    cardShadow: 'rgba(0, 0, 0, 0.7)',
  },
  sepia: {
    background: '#13100a',
    surface: '#1c1710',
    surfaceElevated: '#251e14',
    border: '#302818',
    borderLight: '#3d3322',
    accent: '#d4854a',
    accentDim: '#aa6838',
    accentSoft: 'rgba(212, 133, 74, 0.15)',
    secondary: '#ffc947',
    secondarySoft: 'rgba(255, 201, 71, 0.15)',
    textPrimary: '#ede0c8',
    textSecondary: '#b8a890',
    textMuted: '#7a6a58',
    textOnAccent: '#13100a',
    success: '#5aad6a',
    error: '#e05c5c',
    warning: '#d4854a',
    progressBar: '#d4854a',
    progressTrack: '#302818',
    overlay: 'rgba(19, 16, 10, 0.88)',
    cardShadow: 'rgba(0, 0, 0, 0.5)',
  },
  ocean: {
    background: '#060c14',
    surface: '#0d1520',
    surfaceElevated: '#14202e',
    border: '#1a2a3a',
    borderLight: '#243348',
    accent: '#4d9bd6',
    accentDim: '#3a7ab0',
    accentSoft: 'rgba(77, 155, 214, 0.15)',
    secondary: '#00e0c0',
    secondarySoft: 'rgba(0, 224, 192, 0.15)',
    textPrimary: '#e8f0f8',
    textSecondary: '#a0b0c8',
    textMuted: '#687898',
    textOnAccent: '#060c14',
    success: '#4caf7d',
    error: '#e05c5c',
    warning: '#f0c040',
    progressBar: '#4d9bd6',
    progressTrack: '#1a2a3a',
    overlay: 'rgba(6, 12, 20, 0.88)',
    cardShadow: 'rgba(0, 0, 0, 0.5)',
  },
  forest: {
    background: '#080e08',
    surface: '#101810',
    surfaceElevated: '#172017',
    border: '#1e2e1e',
    borderLight: '#283a28',
    accent: '#52b56b',
    accentDim: '#3d8f52',
    accentSoft: 'rgba(82, 181, 107, 0.15)',
    secondary: '#c8ff4a',
    secondarySoft: 'rgba(200, 255, 74, 0.15)',
    textPrimary: '#e8f0e8',
    textSecondary: '#a0b8a0',
    textMuted: '#687868',
    textOnAccent: '#080e08',
    success: '#52b56b',
    error: '#e05c5c',
    warning: '#d4a840',
    progressBar: '#52b56b',
    progressTrack: '#1e2e1e',
    overlay: 'rgba(8, 14, 8, 0.88)',
    cardShadow: 'rgba(0, 0, 0, 0.5)',
  },
  starry: {
    background: '#05060f',
    surface: '#0c0e1c',
    surfaceElevated: '#131628',
    border: '#1c2040',
    borderLight: '#252a52',
    accent: '#c8a8f8',
    accentDim: '#9a78d0',
    accentSoft: 'rgba(200, 168, 248, 0.12)',
    secondary: '#7de8e0',
    secondarySoft: 'rgba(125, 232, 224, 0.15)',
    textPrimary: '#eeeaf8',
    textSecondary: '#a0a8d8',
    textMuted: '#686ea0',
    textOnAccent: '#05060f',
    success: '#5ab88a',
    error: '#e05c6c',
    warning: '#f0c060',
    progressBar: '#c8a8f8',
    progressTrack: '#1c2040',
    overlay: 'rgba(5, 6, 15, 0.88)',
    cardShadow: 'rgba(0, 0, 30, 0.7)',
  },
  custom: defaultCustomTheme,
};

export const themeLabels: Record<ThemeName, string> = {
  midnight: 'Midnight',
  amoled: 'AMOLED',
  sepia: 'Sepia',
  ocean: 'Ocean',
  forest: 'Forest',
  starry: 'Starry',
  custom: 'Custom',
};

export const fontLabels: Record<FontName, string> = {
  georgia: 'Georgia',
  baskerville: 'Baskerville',
  bookerly: 'Bookerly',
  caroni: 'Caroni',
  roboto: 'Roboto',
  poppins: 'Poppins',
  mulish: 'Mulish',
  system: 'System',
  opendyslexic: 'OpenDyslexic',
};

// CSS font-family stacks used inside the epub iframe
export const fontFamilies: Record<FontName, string> = {
  georgia: "Georgia, 'Times New Roman', serif",
  baskerville: "'Libre Baskerville', Baskerville, Georgia, serif",
  bookerly: "Bookerly, Georgia, 'Times New Roman', serif",
  caroni: "Caroni, Georgia, 'Times New Roman', serif",
  roboto: "Roboto, system-ui, sans-serif",
  poppins: "Poppins, system-ui, sans-serif",
  mulish: "Mulish, system-ui, sans-serif",
  system: "system-ui, -apple-system, sans-serif",
  opendyslexic: "OpenDyslexic, Georgia, serif",
};

// For the font picker preview ("Aa" swatch) — single family name, no fallbacks
export const fontPreviewFamily: Record<FontName, string> = {
  georgia: 'Georgia',
  baskerville: 'Libre Baskerville',
  bookerly: 'Bookerly',
  caroni: 'Caroni',
  roboto: 'Roboto',
  poppins: 'Poppins',
  mulish: 'Mulish',
  system: 'system-ui',
  opendyslexic: 'OpenDyslexic',
};

// Fonts that need a file dropped in public/fonts/ (not loaded from Google Fonts or system)
export const selfHostedFonts: Partial<Record<FontName, { file: string; format: string }>> = {
  opendyslexic: { file: '/fonts/OpenDyslexic-Regular.otf', format: 'opentype' },
  bookerly:     { file: '/fonts/Bookerly.ttf',              format: 'truetype' },
  caroni:       { file: '/fonts/Caroni-Regular.otf',        format: 'opentype' },
};

// Fonts loaded via Google Fonts CDN
export const googleFontFamilies: string[] = [
  'Libre+Baskerville:ital,wght@0,400;0,700;1,400',
  'Roboto:wght@400;500;700',
  'Poppins:wght@400;500;600;700',
  'Mulish:wght@400;500;700',
];

// Light theme variants - generated from dark themes with inverted backgrounds
export const lightThemes: Record<Exclude<ThemeName, 'custom'>, ColorScheme> = {
  midnight: {
    background: '#f5f5f7',
    surface: '#ffffff',
    surfaceElevated: '#fafafa',
    border: '#e0e0e5',
    borderLight: '#eeeeef',
    accent: '#e8a838',
    accentDim: '#b8832a',
    accentSoft: 'rgba(232, 168, 56, 0.15)',
    secondary: '#ffea4a',
    secondarySoft: 'rgba(255, 234, 74, 0.15)',
    textPrimary: '#1a1a2e',
    textSecondary: '#5a5a6e',
    textMuted: '#8a8a9e',
    textOnAccent: '#1a1a2e',
    success: '#4caf7d',
    error: '#e05c5c',
    warning: '#e8a838',
    progressBar: '#e8a838',
    progressTrack: '#e0e0e5',
    overlay: 'rgba(255, 255, 255, 0.9)',
    cardShadow: 'rgba(0, 0, 0, 0.08)',
  },
  amoled: {
    background: '#f0f0f2',
    surface: '#ffffff',
    surfaceElevated: '#fafafb',
    border: '#d0d0d5',
    borderLight: '#e8e8eb',
    accent: '#7b5dc4',
    accentDim: '#5a3da3',
    accentSoft: 'rgba(123, 93, 196, 0.15)',
    secondary: '#00c0b0',
    secondarySoft: 'rgba(0, 192, 176, 0.15)',
    textPrimary: '#1a1a2e',
    textSecondary: '#5a5a6e',
    textMuted: '#8a8a9e',
    textOnAccent: '#ffffff',
    success: '#4caf7d',
    error: '#e05c5c',
    warning: '#e8a838',
    progressBar: '#7b5dc4',
    progressTrack: '#d0d0d5',
    overlay: 'rgba(255, 255, 255, 0.95)',
    cardShadow: 'rgba(0, 0, 0, 0.1)',
  },
  sepia: {
    background: '#faf6ed',
    surface: '#ffffff',
    surfaceElevated: '#fdfbf7',
    border: '#e5ddd0',
    borderLight: '#f0ebe3',
    accent: '#c4743a',
    accentDim: '#a05a28',
    accentSoft: 'rgba(196, 116, 58, 0.15)',
    secondary: '#e6b035',
    secondarySoft: 'rgba(230, 176, 53, 0.15)',
    textPrimary: '#2d2418',
    textSecondary: '#6b5d4d',
    textMuted: '#9a8b7a',
    textOnAccent: '#ffffff',
    success: '#4caf7d',
    error: '#e05c5c',
    warning: '#e8a838',
    progressBar: '#c4743a',
    progressTrack: '#e5ddd0',
    overlay: 'rgba(250, 246, 237, 0.95)',
    cardShadow: 'rgba(0, 0, 0, 0.06)',
  },
  ocean: {
    background: '#f0f4f8',
    surface: '#ffffff',
    surfaceElevated: '#f8fafc',
    border: '#d0dae5',
    borderLight: '#e8eef5',
    accent: '#3a8bc4',
    accentDim: '#2a6a9e',
    accentSoft: 'rgba(58, 139, 196, 0.15)',
    secondary: '#00b0a0',
    secondarySoft: 'rgba(0, 176, 160, 0.15)',
    textPrimary: '#0d1520',
    textSecondary: '#4a5a6e',
    textMuted: '#7a8a9e',
    textOnAccent: '#ffffff',
    success: '#4caf7d',
    error: '#e05c5c',
    warning: '#e8a838',
    progressBar: '#3a8bc4',
    progressTrack: '#d0dae5',
    overlay: 'rgba(240, 244, 248, 0.95)',
    cardShadow: 'rgba(0, 0, 0, 0.08)',
  },
  forest: {
    background: '#f0f4f0',
    surface: '#ffffff',
    surfaceElevated: '#f8faf8',
    border: '#d0dad0',
    borderLight: '#e8eee8',
    accent: '#42a05a',
    accentDim: '#2e7a42',
    accentSoft: 'rgba(66, 160, 90, 0.15)',
    secondary: '#a8d040',
    secondarySoft: 'rgba(168, 208, 64, 0.15)',
    textPrimary: '#080e08',
    textSecondary: '#4a5a4a',
    textMuted: '#7a8a7a',
    textOnAccent: '#ffffff',
    success: '#42a05a',
    error: '#e05c5c',
    warning: '#d4a840',
    progressBar: '#42a05a',
    progressTrack: '#d0dad0',
    overlay: 'rgba(240, 244, 240, 0.95)',
    cardShadow: 'rgba(0, 0, 0, 0.08)',
  },
  starry: {
    background: '#f5f5fa',
    surface: '#ffffff',
    surfaceElevated: '#fafafc',
    border: '#e0e0f0',
    borderLight: '#f0f0f8',
    accent: '#a888e0',
    accentDim: '#7a58b0',
    accentSoft: 'rgba(168, 136, 224, 0.15)',
    secondary: '#5dc8c0',
    secondarySoft: 'rgba(93, 200, 192, 0.15)',
    textPrimary: '#1a1a2e',
    textSecondary: '#5a5a6e',
    textMuted: '#8a8a9e',
    textOnAccent: '#ffffff',
    success: '#4caf7d',
    error: '#e05c5c',
    warning: '#e8a838',
    progressBar: '#a888e0',
    progressTrack: '#e0e0f0',
    overlay: 'rgba(245, 245, 250, 0.95)',
    cardShadow: 'rgba(0, 0, 0, 0.08)',
  },
};

export const themeModeLabels: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  auto: 'Auto (System)',
};

/**
 * Resolve the actual theme colors based on theme name and mode.
 * When mode is 'auto', it uses the system's color scheme preference.
 */
export function resolveTheme(
  themeName: ThemeName,
  mode: ThemeMode,
  systemColorScheme: 'light' | 'dark' = 'dark'
): ColorScheme {
  // Custom theme is always dark for now (could be extended later)
  if (themeName === 'custom') {
    return defaultCustomTheme;
  }

  // Determine if we should use light mode
  const useLight = mode === 'light' || (mode === 'auto' && systemColorScheme === 'light');

  if (useLight) {
    return lightThemes[themeName];
  }

  return themes[themeName];
}

// Default export for backward compat — components that haven't migrated to
// useTheme() yet will get the Midnight theme colors.
export const Colors: ColorScheme = themes.midnight;

export const Typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 38,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '500' as const,
  serif: 'Georgia',
  sans: 'System',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Palette of soft, harmonious hues for genre/tag chips (in degrees)
const GENRE_HUES = [25, 45, 170, 200, 270, 310, 340];

/**
 * Generate a soft gradient color set for genre/tag chips with consistent brightness.
 * Uses HSL color space for perceptually uniform lightness.
 */
export function getGenreChipColors(name: string): {
  gradientStart: string;
  gradientEnd: string;
  textColor: string;
  borderColor: string;
} {
  // Hash the name to pick a consistent hue
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }

  // Pick from curated palette for harmonious colors
  const hueIndex = Math.abs(hash) % GENRE_HUES.length;
  const baseHue = GENRE_HUES[hueIndex];

  // Add slight variation for gradient (10-20 degrees spread)
  const hueSpread = 15;
  const hue1 = baseHue;
  const hue2 = (baseHue + hueSpread) % 360;

  // Soft, consistent saturation and lightness for all chips
  const saturation = 55; // Lower saturation = softer colors
  const lightness1 = 22; // Dark background for contrast
  const lightness2 = 18; // Slightly darker for gradient end

  // Text color: light enough to read on dark background
  const textLightness = 88;

  return {
    gradientStart: `hsl(${hue1}, ${saturation}%, ${lightness1}%)`,
    gradientEnd: `hsl(${hue2}, ${saturation}%, ${lightness2}%)`,
    textColor: `hsl(${hue1}, ${saturation - 10}%, ${textLightness}%)`,
    borderColor: `hsla(${hue1}, ${saturation}%, 40%, 0.3)`,
  };
}

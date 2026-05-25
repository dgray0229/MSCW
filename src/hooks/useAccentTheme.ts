import { useColorScheme } from './use-color-scheme';
import { useAppStore } from '../store';

export type AccentTheme = 'crimson' | 'forest' | 'cosmic' | 'amber';

export interface ThemeColors {
  theme: AccentTheme;
  primary: string;
  secondary: string;
  tertiary: string;
  bgPrimary: string;
  textPrimary: string;
  borderPrimary: string;
  tint: string;
  primaryContainer: string;
  primaryBgOpacity: string;
}

export const ACCENT_THEMES: Record<AccentTheme, {
  name: string;
  light: { primary: string; secondary: string; tertiary: string };
  dark: { primary: string; secondary: string; tertiary: string };
  bgPrimary: string;
  textPrimary: string;
  borderPrimary: string;
  tint: string;
  primaryContainer: string;
  primaryBgOpacity: string;
}> = {
  crimson: {
    name: 'Crimson Rose',
    light: { primary: '#b61722', secondary: '#804e00', tertiary: '#00685f' },
    dark: { primary: '#ffb4a9', secondary: '#ffb86f', tertiary: '#51dbc9' },
    bgPrimary: 'bg-primary',
    textPrimary: 'text-primary',
    borderPrimary: 'border-primary',
    tint: 'bg-red-500/[0.08] dark:bg-red-950/20',
    primaryContainer: 'bg-red-500/[0.08] dark:bg-red-950/20 border-red-500/20 dark:border-red-950/30',
    primaryBgOpacity: 'bg-red-500/5 dark:bg-red-950/10',
  },
  forest: {
    name: 'Forest Zen',
    light: { primary: '#00685f', secondary: '#804e00', tertiary: '#b61722' },
    dark: { primary: '#51dbc9', secondary: '#ffb86f', tertiary: '#ffb4a9' },
    bgPrimary: 'bg-[#00685f] dark:bg-[#51dbc9]',
    textPrimary: 'text-[#00685f] dark:text-[#51dbc9]',
    borderPrimary: 'border-[#00685f] dark:border-[#51dbc9]',
    tint: 'bg-teal-500/[0.08] dark:bg-teal-950/20',
    primaryContainer: 'bg-teal-500/[0.08] dark:bg-teal-950/20 border-teal-500/20 dark:border-teal-950/30',
    primaryBgOpacity: 'bg-teal-500/5 dark:bg-teal-950/10',
  },
  cosmic: {
    name: 'Cosmic Indigo',
    light: { primary: '#6d28d9', secondary: '#0284c7', tertiary: '#e11d48' },
    dark: { primary: '#c084fc', secondary: '#7dd3fc', tertiary: '#fda4af' },
    bgPrimary: 'bg-[#6d28d9] dark:bg-[#c084fc]',
    textPrimary: 'text-[#6d28d9] dark:text-[#c084fc]',
    borderPrimary: 'border-[#6d28d9] dark:border-[#c084fc]',
    tint: 'bg-violet-500/[0.08] dark:bg-violet-950/20',
    primaryContainer: 'bg-violet-500/[0.08] dark:bg-violet-950/20 border-violet-500/20 dark:border-violet-950/30',
    primaryBgOpacity: 'bg-violet-500/5 dark:bg-violet-950/10',
  },
  amber: {
    name: 'Amber Gold',
    light: { primary: '#d97706', secondary: '#059669', tertiary: '#2563eb' },
    dark: { primary: '#fbbf24', secondary: '#34d399', tertiary: '#60a5fa' },
    bgPrimary: 'bg-[#d97706] dark:bg-[#fbbf24]',
    textPrimary: 'text-[#d97706] dark:text-[#fbbf24]',
    borderPrimary: 'border-[#d97706] dark:border-[#fbbf24]',
    tint: 'bg-amber-500/[0.08] dark:bg-amber-950/20',
    primaryContainer: 'bg-amber-500/[0.08] dark:bg-amber-950/20 border-amber-500/20 dark:border-amber-950/30',
    primaryBgOpacity: 'bg-amber-500/5 dark:bg-amber-950/10',
  },
};

export function useAccentTheme(): ThemeColors {
  const colorScheme = useColorScheme();
  const accentTheme = useAppStore((state) => state.settings.accentTheme) || 'crimson';
  const isDark = colorScheme === 'dark';

  const themeConfig = ACCENT_THEMES[accentTheme];
  const activeColors = isDark ? themeConfig.dark : themeConfig.light;

  return {
    theme: accentTheme,
    primary: activeColors.primary,
    secondary: activeColors.secondary,
    tertiary: activeColors.tertiary,
    bgPrimary: themeConfig.bgPrimary,
    textPrimary: themeConfig.textPrimary,
    borderPrimary: themeConfig.borderPrimary,
    tint: themeConfig.tint,
    primaryContainer: themeConfig.primaryContainer,
    primaryBgOpacity: themeConfig.primaryBgOpacity,
  };
}

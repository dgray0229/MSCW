import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '../../hooks/use-color-scheme';

interface AdaptiveGlassProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[] | any;
  isInteractive?: boolean;
  className?: string;
}

export function AdaptiveGlass({ children, style, isInteractive = false, className }: AdaptiveGlassProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Base styling for standard non-glass views (Web/Fallback)
  // Slate translucent fills (rgba(15, 23, 42, 0.65)) and refraction borders (rgba(255, 255, 255, 0.08) dark / 0.25 light)
  const fallbackBg = isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.65)';
  const fallbackBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.25)';

  if (Platform.OS === 'ios') {
    if (isLiquidGlassAvailable()) {
      return (
        <GlassView isInteractive={isInteractive} style={style} className={className}>
          {children}
        </GlassView>
      );
    }
    // Fallback to BlurView on older iOS (automatic dark/light adaptation)
    return (
      <BlurView
        tint="systemMaterial"
        intensity={85}
        style={[{ overflow: 'hidden', borderCurve: 'continuous' } as any, style]}
        className={className}
      >
        {children}
      </BlurView>
    );
  }

  if (Platform.OS === 'android') {
    // Android backdrop blur with expo-blur
    return (
      <BlurView
        tint={isDark ? 'dark' : 'light'}
        intensity={90}
        style={[{ overflow: 'hidden', borderCurve: 'continuous' } as any, style]}
        className={className}
      >
        {children}
      </BlurView>
    );
  }

  // Web and fallback platforms - use CSS backdrop-filter blur via styled View
  // Added deep, state-of-the-art physics-based shadows and high-performance frosted backdropFilters
  const webStyle: any = {
    backgroundColor: fallbackBg,
    borderColor: fallbackBorder,
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: 'continuous' as any,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: 24,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    ...StyleSheet.flatten(style),
  };

  return (
    <View style={webStyle} className={className}>
      {children}
    </View>
  );
}

import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useAccentTheme } from '../../hooks/useAccentTheme';
import { useColorScheme } from '../../hooks/use-color-scheme';

interface AmbientBackgroundProps {
  children?: React.ReactNode;
}

export function AmbientBackground({ children }: AmbientBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animation values for Orb 1
  const scale1 = useSharedValue(1);
  const translateX1 = useSharedValue(0);
  const translateY1 = useSharedValue(0);

  // Animation values for Orb 2
  const scale2 = useSharedValue(1);
  const translateX2 = useSharedValue(0);
  const translateY2 = useSharedValue(0);

  // Animation values for Orb 3
  const scale3 = useSharedValue(1);
  const translateX3 = useSharedValue(0);
  const translateY3 = useSharedValue(0);

  useEffect(() => {
    // Orb 1 animations: pulsing and swaying slowly
    scale1.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateX1.value = withRepeat(
      withSequence(
        withTiming(width * 0.15, { duration: 12000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-width * 0.15, { duration: 12000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateY1.value = withRepeat(
      withSequence(
        withTiming(height * 0.1, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-height * 0.1, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Orb 2 animations: countersymmetric motion
    scale2.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.15, { duration: 9000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateX2.value = withRepeat(
      withSequence(
        withTiming(-width * 0.2, { duration: 14000, easing: Easing.inOut(Easing.ease) }),
        withTiming(width * 0.1, { duration: 14000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateY2.value = withRepeat(
      withSequence(
        withTiming(-height * 0.15, { duration: 11000, easing: Easing.inOut(Easing.ease) }),
        withTiming(height * 0.1, { duration: 11000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Orb 3 animations
    scale3.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 7000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateX3.value = withRepeat(
      withSequence(
        withTiming(width * 0.1, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-width * 0.1, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateY3.value = withRepeat(
      withSequence(
        withTiming(height * 0.08, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-height * 0.08, { duration: 9000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [width, height]);

  // Color mapping based on the active accent theme
  const getOrbColors = () => {
    switch (theme.theme) {
      case 'forest':
        return {
          orb1: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.15)',
          orb2: isDark ? 'rgba(6, 182, 212, 0.18)' : 'rgba(6, 182, 212, 0.15)',
          orb3: isDark ? 'rgba(234, 179, 8, 0.12)' : 'rgba(234, 179, 8, 0.1)',
        };
      case 'cosmic':
        return {
          orb1: isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.15)',
          orb2: isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.15)',
          orb3: isDark ? 'rgba(244, 63, 94, 0.12)' : 'rgba(244, 63, 94, 0.1)',
        };
      case 'amber':
        return {
          orb1: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.15)',
          orb2: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)',
          orb3: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)',
        };
      case 'crimson':
      default:
        return {
          orb1: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.15)',
          orb2: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.15)',
          orb3: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.1)',
        };
    }
  };

  const orbColors = getOrbColors();

  // Animated styles
  const animStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX1.value },
      { translateY: translateY1.value },
      { scale: scale1.value },
    ],
  }));

  const animStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX2.value },
      { translateY: translateY2.value },
      { scale: scale2.value },
    ],
  }));

  const animStyle3 = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX3.value },
      { translateY: translateY3.value },
      { scale: scale3.value },
    ],
  }));

  const baseBackgroundStyle = {
    backgroundColor: isDark ? '#0B0F19' : '#FAFAFC',
  };

  const webBlur = Platform.OS === 'web' ? { filter: 'blur(70px)' } : {};

  return (
    <View style={[styles.container, baseBackgroundStyle]}>
      {/* Background Orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Orb 1: Upper Right */}
        <Animated.View
          style={[
            styles.orb,
            animStyle1,
            webBlur,
            {
              width: width * 0.7,
              height: width * 0.7,
              borderRadius: (width * 0.7) / 2,
              backgroundColor: orbColors.orb1,
              top: -width * 0.1,
              right: -width * 0.1,
            },
          ]}
        />

        {/* Orb 2: Middle Left */}
        <Animated.View
          style={[
            styles.orb,
            animStyle2,
            webBlur,
            {
              width: width * 0.8,
              height: width * 0.8,
              borderRadius: (width * 0.8) / 2,
              backgroundColor: orbColors.orb2,
              top: height * 0.25,
              left: -width * 0.2,
            },
          ]}
        />

        {/* Orb 3: Lower Right */}
        <Animated.View
          style={[
            styles.orb,
            animStyle3,
            webBlur,
            {
              width: width * 0.6,
              height: width * 0.6,
              borderRadius: (width * 0.6) / 2,
              backgroundColor: orbColors.orb3,
              bottom: height * 0.05,
              right: -width * 0.15,
            },
          ]}
        />
      </View>

      {/* Main Content Layout Container */}
      <View style={styles.contentContainer}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    opacity: 0.85,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.0, // Blurring is handled by Glass/Blur view overlay
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  contentContainer: {
    flex: 1,
  },
});

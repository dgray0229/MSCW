import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

interface SwipeableCardProps {
  children: React.ReactNode;
  
  // Left action: Triggered when user swipes card from left to right (moves right)
  leftAction?: {
    icon: React.ReactNode;
    label: string;
    backgroundColor: string;
    textColor?: string;
    onTrigger: () => void;
  };
  
  // Right action: Triggered when user swipes card from right to left (moves left)
  rightAction?: {
    icon: React.ReactNode;
    label: string;
    backgroundColor: string;
    textColor?: string;
    onTrigger: () => void;
  };
  
  hapticsEnabled?: boolean;
}

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  hapticsEnabled = true,
}: SwipeableCardProps) {
  // If no swipe actions are registered, or if we are on Web, render standard static layout
  if ((!leftAction && !rightAction) || Platform.OS === 'web') {
    return <View>{children}</View>;
  }

  const translationX = useSharedValue(0);
  const contextX = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);

  const triggerSelectionHaptic = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const triggerSuccessHaptic = () => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleLeftAction = () => {
    triggerSuccessHaptic();
    if (leftAction) {
      leftAction.onTrigger();
    }
  };

  const handleRightAction = () => {
    triggerSuccessHaptic();
    if (rightAction) {
      rightAction.onTrigger();
    }
  };

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onStart(() => {
      contextX.value = translationX.value;
    })
    .onUpdate((event) => {
      const nextX = contextX.value + event.translationX;

      // Add elastic drag resistance when swiping in unregistered directions
      if (nextX > 0 && !leftAction) {
        translationX.value = nextX * 0.15;
      } else if (nextX < 0 && !rightAction) {
        translationX.value = nextX * 0.15;
      } else {
        translationX.value = nextX;
      }

      // Check threshold crossing for live tactile haptic hum
      const absX = Math.abs(translationX.value);
      if (absX >= SWIPE_THRESHOLD) {
        if (!hasTriggeredHaptic.value) {
          hasTriggeredHaptic.value = true;
          runOnJS(triggerSelectionHaptic)();
        }
      } else {
        hasTriggeredHaptic.value = false;
      }
    })
    .onEnd(() => {
      const currentX = translationX.value;

      if (currentX >= SWIPE_THRESHOLD && leftAction) {
        translationX.value = withSpring(SCREEN_WIDTH, { damping: 18, stiffness: 120 });
        runOnJS(handleLeftAction)();
      } else if (currentX <= -SWIPE_THRESHOLD && rightAction) {
        translationX.value = withSpring(-SCREEN_WIDTH, { damping: 18, stiffness: 120 });
        runOnJS(handleRightAction)();
      } else {
        translationX.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
      hasTriggeredHaptic.value = false;
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translationX.value }],
    };
  });

  const animatedLeftPanelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translationX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1]
    );
    return {
      opacity,
      backgroundColor: leftAction?.backgroundColor || 'transparent',
    };
  });

  const animatedRightPanelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translationX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0]
    );
    return {
      opacity,
      backgroundColor: rightAction?.backgroundColor || 'transparent',
    };
  });

  const animatedLeftIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translationX.value,
      [0, SWIPE_THRESHOLD],
      [0.6, 1.25],
      'clamp'
    );
    const rotate = interpolate(
      translationX.value,
      [0, SWIPE_THRESHOLD],
      [-30, 0],
      'clamp'
    );
    return {
      transform: [
        { scale },
        { rotate: `${rotate}deg` }
      ],
    };
  });

  const animatedRightIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translationX.value,
      [-SWIPE_THRESHOLD, 0],
      [1.25, 0.6],
      'clamp'
    );
    const rotate = interpolate(
      translationX.value,
      [-SWIPE_THRESHOLD, 0],
      [0, 30],
      'clamp'
    );
    return {
      transform: [
        { scale },
        { rotate: `${rotate}deg` }
      ],
    };
  });

  return (
    <View className="relative w-full overflow-hidden rounded-2xl mb-3">
      {/* Background Left Panel (Swipe Right) */}
      {leftAction && (
        <Animated.View
          style={[styles.actionPanel, styles.leftActionPanel, animatedLeftPanelStyle]}
        >
          <Animated.View style={[styles.iconContainer, animatedLeftIconStyle]}>
            {leftAction.icon}
            <Text style={{ color: leftAction.textColor || 'white' }} className="text-[10px] font-black uppercase tracking-widest mt-1">
              {leftAction.label}
            </Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Background Right Panel (Swipe Left) */}
      {rightAction && (
        <Animated.View
          style={[styles.actionPanel, styles.rightActionPanel, animatedRightPanelStyle]}
        >
          <Animated.View style={[styles.iconContainer, animatedRightIconStyle]}>
            {rightAction.icon}
            <Text style={{ color: rightAction.textColor || 'white' }} className="text-[10px] font-black uppercase tracking-widest mt-1">
              {rightAction.label}
            </Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Swipable Card Foreground */}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[animatedCardStyle, styles.foregroundCard]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  foregroundCard: {
    width: '100%',
    zIndex: 1,
  },
  actionPanel: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    zIndex: 0,
    borderRadius: 16,
  },
  leftActionPanel: {
    alignItems: 'flex-start',
    paddingLeft: 24,
  },
  rightActionPanel: {
    alignItems: 'flex-end',
    paddingRight: 24,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

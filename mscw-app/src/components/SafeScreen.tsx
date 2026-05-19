import React from 'react';
import { View, ScrollView, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeScreenProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  scrollable?: boolean;
}

export function SafeScreen({ children, className = 'flex-1 bg-background', style, scrollable = true }: SafeScreenProps) {
  const insets = useSafeAreaInsets();
  
  // We apply padding top and padding bottom dynamically based on safe area insets.
  // We leave some baseline padding if the inset is 0 (e.g. on web or standard screens).
  const containerStyle: ViewStyle = {
    paddingTop: insets.top || 16,
    paddingBottom: insets.bottom || 16,
    paddingLeft: insets.left || 16,
    paddingRight: insets.right || 16,
    ...style,
  };

  if (scrollable) {
    return (
      <ScrollView 
        className={className} 
        contentContainerStyle={containerStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View className={className} style={containerStyle}>
      {children}
    </View>
  );
}

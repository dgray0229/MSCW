import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Lock } from 'lucide-react-native';
import { useAppStore } from '../store';

export function PrivacyScreen({ children }: { children: React.ReactNode }) {
  const biometricsEnabled = useAppStore(state => state.settings.biometricsEnabled);
  const [isAuthenticated, setIsAuthenticated] = useState(!biometricsEnabled);

  const authenticate = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock MSCW",
      fallbackLabel: "Use Passcode",
    });
    setIsAuthenticated(result.success);
  };

  useEffect(() => {
    if (!biometricsEnabled) {
      setIsAuthenticated(true);
      return;
    }

    // On initial mount if biometrics is enabled and not authenticated
    if (biometricsEnabled && !isAuthenticated) {
      authenticate();
    }

    // Lock the app whenever it is minimized, and prompt when it returns
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setIsAuthenticated(false);
      } else if (nextAppState === 'active' && biometricsEnabled) {
        authenticate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [biometricsEnabled]);

  if (!isAuthenticated && biometricsEnabled) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-8">
        <View className="bg-primary/10 p-6 rounded-full border border-primary/20">
          <Lock size={48} color="#b61722" />
        </View>
        <Text className="text-3xl font-black text-on-surface mt-6 mb-2">Locked</Text>
        <Text className="text-on-surface-variant text-center mb-10 max-w-xs">
          MSCW requires biometric authentication to protect your private goals and tasks.
        </Text>
        <Pressable 
          onPress={authenticate} 
          className="bg-primary px-8 py-4 rounded-full shadow-md active:opacity-80"
        >
          <Text className="text-on-primary font-black uppercase tracking-widest text-sm">Unlock App</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

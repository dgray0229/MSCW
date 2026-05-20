import '../lib/polyfills';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme, View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Purchases from 'react-native-purchases';
import { firebaseAuth } from '../lib/firebase';
import { useFirebaseSync } from '../hooks/useFirebaseSync';
import { PrivacyScreen } from '../components/PrivacyScreen';
import { initRevenueCat } from '../lib/purchases';
import '../../global.css';

import { List, GitPullRequest, LayoutDashboard, Settings, TrendingUp } from 'lucide-react-native';
import { useAppStore } from '../store';
import OnboardingPage from './onboarding';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hasHydrated = useAppStore(state => state._hasHydrated);
  const setUser = useAppStore(state => state.setUser);
  const hasSeenOnboarding = useAppStore(state => state.settings.hasSeenOnboarding);

  // Initialize the background Sync Engine
  useFirebaseSync();

  // Synchronize Firebase Auth state natively with Zustand Memory
  useEffect(() => {
    const subscriber = firebaseAuth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
      } else {
        setUser(null);
      }
    });
    return subscriber;
  }, []);

  useEffect(() => {
    async function configureNotifications() {
      if (Platform.OS === 'web') return;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      await Notifications.cancelAllScheduledNotificationsAsync();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🌞 Daily Planning",
          body: "Set your 8-point capacity limit and pick your Must-Haves.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 8,
          minute: 0,
        } as any,
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🌙 Evening Review",
          body: "Review today's board and archive completed tasks.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
        } as any,
      });
    }

    async function configureRevenueCat() {
      await initRevenueCat();
    }

    if (hasHydrated) {
      configureNotifications();
      configureRevenueCat();
    }
  }, [hasHydrated]);

  if (!hasHydrated) {
    return <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#121c2a' : '#ffffff' }} />;
  }

  if (!hasSeenOnboarding) {
    return (
      <SafeAreaProvider>
        <PrivacyScreen>
          <OnboardingPage />
        </PrivacyScreen>
      </SafeAreaProvider>
    );
  }
  
  return (
    <SafeAreaProvider>
      <PrivacyScreen>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Tabs screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#b61722',
          tabBarStyle: {
            backgroundColor: colorScheme === 'dark' ? '#121c2a' : '#ffffff',
            borderTopColor: colorScheme === 'dark' ? '#27313f' : '#e6e8ea',
          }
        }}>
          <Tabs.Screen 
            name="index" 
            options={{
              title: 'Board',
              tabBarIcon: ({ color }) => <LayoutDashboard color={color} />
            }} 
          />
          <Tabs.Screen 
            name="backlog" 
            options={{
              title: 'Backlog',
              tabBarIcon: ({ color }) => <List color={color} />
            }} 
          />
          <Tabs.Screen 
            name="triage" 
            options={{
              title: 'Triage',
              tabBarIcon: ({ color }) => <GitPullRequest color={color} />
            }} 
          />
          <Tabs.Screen 
            name="zen" 
            options={{
              href: null, // Hides it from the tab bar
              headerShown: false,
              tabBarStyle: { display: 'none' }
            }} 
          />
          <Tabs.Screen 
            name="archive" 
            options={{
              href: null, // Hides it from the tab bar
              headerShown: false,
              tabBarStyle: { display: 'none' }
            }} 
          />
          <Tabs.Screen 
            name="analytics" 
            options={{
              title: 'Analytics',
              tabBarIcon: ({ color }) => <TrendingUp color={color} />
            }} 
          />
          <Tabs.Screen 
            name="explore" 
            options={{
              title: 'Settings',
              tabBarIcon: ({ color }) => <Settings color={color} />
            }} 
          />
          </Tabs>
        </ThemeProvider>
      </PrivacyScreen>
    </SafeAreaProvider>
  );
}


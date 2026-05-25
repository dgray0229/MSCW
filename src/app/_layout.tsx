import '../lib/polyfills';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Purchases from 'react-native-purchases';
import { firebaseAuth } from '../lib/firebase';
import { useFirebaseSync } from '../hooks/useFirebaseSync';
import { useIntegrationSync } from '../hooks/useIntegrationSync';
import { useCalendarGraduation } from '../hooks/useCalendarGraduation';
import { PrivacyScreen } from '../components/PrivacyScreen';
import { initRevenueCat } from '../lib/purchases';
import '../../global.css';

import { List, GitPullRequest, LayoutDashboard, Settings, TrendingUp, CalendarDays, Layers } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAppStore } from '../store';
import { useAccentTheme } from '../hooks/useAccentTheme';
import OnboardingPage from './onboarding';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { FeedbackPrompt } from '../components/FeedbackPrompt';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0B0F19',
    card: '#131B2E',
    text: '#F8FAFC',
    border: '#243354',
    notification: '#B61722',
  },
};

const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FAFAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    notification: '#B61722',
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hasHydrated = useAppStore(state => state._hasHydrated);
  const setUser = useAppStore(state => state.setUser);
  const hasSeenOnboarding = useAppStore(state => state.settings.hasSeenOnboarding);
  const theme = useAccentTheme();

  // Initialize the background Sync Engines
  useFirebaseSync();
  useIntegrationSync();
  useCalendarGraduation();

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

  // Synchronize document.documentElement class list with colorScheme on Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const root = document.documentElement;
      if (colorScheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [colorScheme]);

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
    return <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#0B0F19' : '#FAFAFC' }} />;
  }

  if (!hasSeenOnboarding) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PrivacyScreen>
            <View className={colorScheme === 'dark' ? 'dark flex-1' : 'flex-1'}>
              <OnboardingPage />
            </View>
          </PrivacyScreen>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PrivacyScreen>
          <View className={colorScheme === 'dark' ? 'dark flex-1' : 'flex-1'}>
            <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomDefaultTheme}>
              <Tabs screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: colorScheme === 'dark' ? '#94A3B8' : '#64748B',
          tabBarBackground: () => (
            <BlurView
              tint="systemMaterial"
              intensity={85}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          ),
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            elevation: 0,
            borderTopWidth: 0.5,
          }
        }}>
          <Tabs.Screen 
            name="index" 
            options={{
              title: 'Today',
              tabBarIcon: ({ color }) => <LayoutDashboard color={color} />
            }} 
          />
          <Tabs.Screen 
            name="calendar" 
            options={{
              title: 'Calendar',
              tabBarIcon: ({ color }) => <CalendarDays color={color} />
            }} 
          />
          <Tabs.Screen 
            name="sprint" 
            options={{
              title: 'Sprint',
              tabBarIcon: ({ color }) => <Layers color={color} />
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
            name="onboarding" 
            options={{
              href: null, // Hides it from the tab bar
              headerShown: false,
              tabBarStyle: { display: 'none' }
            }} 
          />
          <Tabs.Screen 
            name="paywall" 
            options={{
              href: null, // Hides it from the tab bar
              headerShown: false,
              tabBarStyle: { display: 'none' }
            }} 
          />
          <Tabs.Screen 
            name="auth" 
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
          <FeedbackPrompt />
        </ThemeProvider>
        </View>
      </PrivacyScreen>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


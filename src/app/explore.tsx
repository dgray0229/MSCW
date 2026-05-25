import React from 'react';
import { View, Text, Switch, Pressable, ScrollView, Share, Modal, ActivityIndicator, Platform } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import * as Calendar from 'expo-calendar';
import { useAppStore } from '../store';
import { useAccentTheme, ACCENT_THEMES, AccentTheme } from '../hooks/useAccentTheme';
import { SafeScreen } from '../components/SafeScreen';
import { AdaptiveGlass } from '../components/ui/AdaptiveGlass';
import { 
  Plus, 
  Minus, 
  Settings2, 
  Archive, 
  UserCircle, 
  LogOut, 
  Trash2,
  Link2,
  Calendar as CalendarIcon,
  ListTodo,
  CheckCircle2,
  History,
  RotateCw,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { presentPaywallIfNeeded } from '../lib/purchases';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { firebaseAuth, db } from '../lib/firebase';
import auth from '@react-native-firebase/auth';
import { IntegrationManager } from '../lib/integrationManager';

export default function SettingsPage() {
  const router = useRouter();
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();

  const [googleModalVisible, setGoogleModalVisible] = React.useState(false);
  const [googleSyncing, setGoogleSyncing] = React.useState(false);
  
  const [appleModalVisible, setAppleModalVisible] = React.useState(false);
  const [appleSyncing, setAppleSyncing] = React.useState(false);
  
  const [calendarModalVisible, setCalendarModalVisible] = React.useState(false);
  const [calendarSyncing, setCalendarSyncing] = React.useState(false);
  const [systemCalendars, setSystemCalendars] = React.useState<{ id: string; name: string }[]>([]);
  
  const [isSyncingAll, setIsSyncingAll] = React.useState(false);

  const handleGoogleTasksToggle = async () => {
    if (settings.googleTasksConnected) {
      if (settings.hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await IntegrationManager.disconnectGoogleTasks();
    } else {
      if (!settings.isPremium) {
        router.push('/paywall');
        return;
      }
      setGoogleModalVisible(true);
    }
  };

  const handleAppleRemindersToggle = async () => {
    if (settings.appleRemindersConnected) {
      if (settings.hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await IntegrationManager.disconnectAppleReminders();
    } else {
      if (!settings.isPremium) {
        router.push('/paywall');
        return;
      }
      setAppleModalVisible(true);
    }
  };

  const handleCalendarToggle = async () => {
    if (settings.calendarConnected) {
      if (settings.hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await IntegrationManager.disconnectCalendar();
    } else {
      if (!settings.isPremium) {
        router.push('/paywall');
        return;
      }
      try {
        if (Platform.OS === 'web') {
          setSystemCalendars([
            { id: 'web-work', name: 'Work Calendar' },
            { id: 'web-personal', name: 'Personal Calendar' },
            { id: 'web-mscw', name: 'MSCW Sprint Calendar' }
          ]);
        } else {
          const { status } = await Calendar.requestCalendarPermissionsAsync();
          if (status === 'granted') {
            const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            setSystemCalendars(cals.map(c => ({ id: c.id, name: c.title || 'Untitled Calendar' })));
          } else {
            setSystemCalendars([
              { id: 'default-native', name: 'Default Device Calendar' }
            ]);
          }
        }
      } catch (err) {
        console.error("Error fetching system calendars:", err);
        setSystemCalendars([
          { id: 'default-fallback', name: 'Primary Calendar' }
        ]);
      }
      setCalendarModalVisible(true);
    }
  };

  const executeGoogleConnect = async () => {
    setGoogleSyncing(true);
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await IntegrationManager.connectGoogleTasks();
    setGoogleSyncing(false);
    setGoogleModalVisible(false);
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const executeAppleConnect = async () => {
    setAppleSyncing(true);
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await IntegrationManager.connectAppleReminders();
    setAppleSyncing(false);
    setAppleModalVisible(false);
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const executeCalendarConnect = async (calendarName: string, calendarId: string) => {
    setCalendarSyncing(true);
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await IntegrationManager.connectCalendar(calendarName, calendarId);
    setCalendarSyncing(false);
    setCalendarModalVisible(false);
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await IntegrationManager.syncIntegrations(true);
    setIsSyncingAll(false);
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const signInWithApple = async () => {
    try {
      const response = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (response.identityToken) {
        const credential = auth.AppleAuthProvider.credential(response.identityToken);
        await firebaseAuth.signInWithCredential(credential);
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error("Apple Sign-In Failed:", e);
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (Platform.OS === 'web') {
        updateSettings({
          user: { email: 'simulated-google-user@gmail.com', uid: 'web-google-uid', displayName: 'Simulated Google User' }
        });
        return;
      }
      
      GoogleSignin.configure({
        webClientId: '515447198418-rlde94lrm4vk6181sm8p7be8cd0u50a0.apps.googleusercontent.com',
      });
      
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      
      if (tokens.idToken) {
        const credential = auth.GoogleAuthProvider.credential(tokens.idToken);
        await firebaseAuth.signInWithCredential(credential);
      } else {
        throw new Error('Failed to retrieve Google Identity Token.');
      }
    } catch (e: any) {
      console.error("Google Sign-In Failed:", e);
    }
  };

  const signOut = async () => {
    try {
      await firebaseAuth.signOut();
    } catch (e) {
      console.error("Sign Out Error:", e);
    }
  };

  const deleteAccount = async () => {
    try {
      const user = firebaseAuth.currentUser;
      if (user) {
        // 1. Purge the Cloud Data to satisfy GDPR
        await db.collection('users').doc(user.uid).delete();
        // 2. Revoke the Authentication Token
        await user.delete();
        // Zustand listener will catch the deletion and nullify the local user state
      }
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        // Handle re-authentication requirement if token is too old
        console.error("Re-authentication required to delete account.");
      } else {
        console.error("Delete Account Error:", e);
      }
    }
  };

  const exportData = async () => {
    try {
      const allTasks = useAppStore.getState().tasks;
      const dataStr = JSON.stringify(allTasks, null, 2);
      await Share.share({
        message: dataStr,
        title: "MSCW Data Export"
      });
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  const handleArchivePress = async () => {
    if (settings.isPremium) {
      router.push('/archive' as any);
    } else {
      router.push('/paywall');
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4">
        <View className="flex-row items-center gap-3 mb-6 mt-2">
          <Settings2 size={32} color="#b61722" />
          <Text className="text-4xl font-black text-on-surface tracking-tight">Settings</Text>
        </View>
        
        {/* APP PREFERENCES */}
        <Text className="text-primary font-bold uppercase tracking-widest text-xs mb-3 ml-2">Preferences</Text>
        <AdaptiveGlass className="rounded-3xl p-6 shadow-sm gap-6 mb-8">
          <View className="flex-row justify-between items-center flex-wrap gap-4">
            <View className="flex-1 min-w-[200px]">
              <Text className="text-lg font-bold text-on-surface">Daily Capacity</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5">Set your daily capacity limit.</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable 
                onPress={() => updateSettings({ dailyCapacity: Math.max(1, settings.dailyCapacity - 1) })}
                className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant items-center justify-center active:opacity-75"
              >
                <Minus size={14} color="#b61722" />
              </Pressable>
              <View className="bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 min-w-[60px] items-center">
                <Text className="font-black text-primary text-xs">{settings.dailyCapacity} pts</Text>
              </View>
              <Pressable 
                onPress={() => updateSettings({ dailyCapacity: Math.min(40, settings.dailyCapacity + 1) })}
                className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant items-center justify-center active:opacity-75"
              >
                <Plus size={14} color="#b61722" />
              </Pressable>
            </View>
          </View>
          
          <View className="h-[1px] bg-slate-200/30 dark:bg-slate-800/30" />

          <View className="flex-row justify-between items-center flex-wrap gap-4">
            <View className="flex-1 min-w-[200px]">
              <Text className="text-lg font-bold text-on-surface">Zen Focus Timer</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5">Duration for deep work sessions (minutes).</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable 
                onPress={() => updateSettings({ zenDuration: Math.max(5, settings.zenDuration - 5) })}
                className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant items-center justify-center active:opacity-75"
              >
                <Minus size={14} color="#b61722" />
              </Pressable>
              <View className="bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 min-w-[60px] items-center">
                <Text className="font-black text-primary text-xs">{settings.zenDuration} min</Text>
              </View>
              <Pressable 
                onPress={() => updateSettings({ zenDuration: Math.min(120, settings.zenDuration + 5) })}
                className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant items-center justify-center active:opacity-75"
              >
                <Plus size={14} color="#b61722" />
              </Pressable>
            </View>
          </View>

          <View className="h-[1px] bg-slate-200/30 dark:bg-slate-800/30" />

          <View className="flex-row justify-between items-center flex-wrap gap-4">
            <View className="flex-1 min-w-[200px]">
              <Text className="text-lg font-bold text-on-surface">Haptic Feedback</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5">Enable physical vibrations during triage.</Text>
            </View>
            <Switch 
              value={settings.hapticsEnabled} 
              onValueChange={(val) => updateSettings({ hapticsEnabled: val })} 
              trackColor={{ true: '#b61722', false: '#e0e3e5' }}
            />
          </View>

          <View className="h-[1px] bg-slate-200/30 dark:bg-slate-800/30" />

          <View className="flex-row justify-between items-center flex-wrap gap-4">
            <View className="flex-1 min-w-[200px]">
              <Text className="text-lg font-bold text-on-surface">Dark Mode</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5">Toggle dark theme manually.</Text>
            </View>
            <Switch 
              value={settings.darkMode} 
              onValueChange={(val) => {
                if (settings.hapticsEnabled) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                updateSettings({ darkMode: val });
              }} 
              trackColor={{ true: '#b61722', false: '#e0e3e5' }}
            />
          </View>

          <View className="h-[1px] bg-slate-200/30 dark:bg-slate-800/30" />

          <View className="flex-row justify-between items-center flex-wrap gap-4">
            <View className="flex-1 min-w-[200px]">
              <Text className="text-lg font-bold text-on-surface">Daily Push Reminders</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5">Morning planning and evening review alerts.</Text>
            </View>
            <Switch 
              value={settings.dailyNotificationsEnabled} 
              onValueChange={(val) => updateSettings({ dailyNotificationsEnabled: val })} 
              trackColor={{ true: '#b61722', false: '#e0e3e5' }}
            />
          </View>

          <View className="h-[1px] bg-slate-200/30 dark:bg-slate-800/30" />

          <View className="flex-row justify-between items-center flex-wrap gap-4">
            <View className="flex-1 min-w-[200px]">
              <Text className="text-lg font-bold text-on-surface">FaceID App Lock</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5">Require biometrics to open the application.</Text>
            </View>
            <Switch 
              value={settings.biometricsEnabled || false} 
              onValueChange={async (val) => {
                if (val) {
                  const hasHardware = await LocalAuthentication.hasHardwareAsync();
                  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                  if (hasHardware && isEnrolled) {
                    const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Enable App Lock" });
                    if (result.success) updateSettings({ biometricsEnabled: true });
                  }
                } else {
                  updateSettings({ biometricsEnabled: false });
                }
              }} 
            />
          </View>
        </AdaptiveGlass>

        {/* ACCENT THEME ENGINE */}
        <Text className="text-primary font-bold uppercase tracking-widest text-xs mb-3 ml-2">Accent Theme</Text>
        <AdaptiveGlass className="rounded-3xl p-6 shadow-sm mb-8">
          <Text className="text-xs text-on-surface-variant mb-4">Select an active palette to instantly theme navigation, headers, controls, and focus states.</Text>
          <View className="flex-row flex-wrap gap-3">
            {Object.entries(ACCENT_THEMES).map(([key, config]) => {
              const themeKey = key as AccentTheme;
              const isSelected = settings.accentTheme === themeKey || (!settings.accentTheme && themeKey === 'crimson');
              const isDark = colorScheme === 'dark';
              const dotColor = isDark ? config.dark.primary : config.light.primary;
              
              return (
                <Pressable
                  key={themeKey}
                  onPress={() => {
                    if (settings.hapticsEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    updateSettings({ accentTheme: themeKey });
                  }}
                  className={`flex-1 min-w-[130px] p-4 rounded-2xl border-2 flex-col justify-between items-start active:opacity-90 ${
                    isSelected 
                      ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                      : 'border-outline-variant bg-surface-container-low'
                  }`}
                  style={isSelected ? { borderColor: dotColor } : undefined}
                >
                  <View className="flex-row items-center gap-2 mb-2">
                    <View style={{ backgroundColor: dotColor }} className="w-3.5 h-3.5 rounded-full" />
                    <Text style={isSelected ? { color: dotColor } : undefined} className={`font-black text-sm ${isSelected ? '' : 'text-on-surface'}`}>
                      {config.name}
                    </Text>
                  </View>
                  <Text className="text-xs text-on-surface-variant font-semibold mb-2">
                    {themeKey === 'crimson' ? 'Crimson Rose (Default)' :
                     themeKey === 'forest' ? 'Forest Zen Green' :
                     themeKey === 'cosmic' ? 'Cosmic Indigo Violet' :
                     'Amber Gold Sunrise'}
                  </Text>

                  {/* Miniature Visual Dashboard Preview Card */}
                  <View className="w-full mt-1.5 p-2 rounded-xl bg-surface-container-highest/60 border border-outline-variant/30 flex-col gap-1.5 self-stretch">
                    <View className="flex-row items-center justify-between">
                      <View className="h-1.5 w-8 rounded bg-slate-350 dark:bg-slate-700" />
                      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                    </View>
                    
                    <View className="h-1.5 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                      <View className="h-full rounded-full" style={{ width: '65%', backgroundColor: dotColor }} />
                    </View>

                    <View className="flex-row gap-1 mt-0.5">
                      <View className="px-1 py-0.5 rounded-md flex-1 items-center bg-red-500/10 dark:bg-red-950/30">
                        <Text className="text-[6px] font-black text-red-500 uppercase">Must</Text>
                      </View>
                      <View style={{ backgroundColor: isDark ? config.dark.secondary + '20' : config.light.secondary + '20' }} className="px-1 py-0.5 rounded-md flex-1 items-center">
                        <Text style={{ color: isDark ? config.dark.secondary : config.light.secondary }} className="text-[6px] font-black uppercase">Should</Text>
                      </View>
                      <View style={{ backgroundColor: isDark ? config.dark.tertiary + '20' : config.light.tertiary + '20' }} className="px-1 py-0.5 rounded-md flex-1 items-center">
                        <Text style={{ color: isDark ? config.dark.tertiary : config.light.tertiary }} className="text-[6px] font-black uppercase">Could</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </AdaptiveGlass>

        {/* THIRD PARTY INTEGRATIONS */}
        <View className="flex-row justify-between items-center mb-3 px-2">
          <Text className="text-primary font-bold uppercase tracking-widest text-xs">Integrations</Text>
          {(settings.googleTasksConnected || settings.appleRemindersConnected || settings.calendarConnected) && (
            <Pressable 
              onPress={handleSyncAll}
              disabled={isSyncingAll}
              className="flex-row items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 active:opacity-60 disabled:opacity-40"
            >
              <RotateCw size={10} color="#b61722" className={isSyncingAll ? "animate-spin" : ""} />
              <Text className="text-xs font-black text-primary uppercase tracking-widest">
                {isSyncingAll ? 'Syncing...' : 'Sync Now'}
              </Text>
            </Pressable>
          )}
        </View>

        <AdaptiveGlass className="rounded-3xl p-6 shadow-sm gap-6 mb-8">
          
          {/* Google Tasks */}
          <View className="flex-row justify-between items-center flex-wrap gap-4">
            <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
              <View className="bg-blue-500/10 p-2.5 rounded-2xl border border-blue-500/20">
                <ListTodo size={20} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-bold text-on-surface">Google Tasks</Text>
                  {settings.googleTasksConnected && (
                    <View className="bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                      <Text className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Active</Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-on-surface-variant mt-0.5">Sync board lists to your Google account.</Text>
              </View>
            </View>
            <Switch 
              value={settings.googleTasksConnected || false} 
              onValueChange={handleGoogleTasksToggle} 
              trackColor={{ true: '#b61722', false: '#e0e3e5' }}
            />
          </View>

          <View className="h-[1px] bg-slate-200/30 dark:bg-slate-800/30" />

          {/* Apple Reminders */}
          <View className="flex-row justify-between items-center flex-wrap gap-4">
            <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
              <View className="bg-purple-500/10 p-2.5 rounded-2xl border border-purple-500/20">
                <CheckCircle2 size={20} color="#a855f7" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-bold text-on-surface">Apple Reminders</Text>
                  {settings.appleRemindersConnected && (
                    <View className="bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                      <Text className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Active</Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-on-surface-variant mt-0.5">Automate your iOS reminders list natively.</Text>
              </View>
            </View>
            <Switch 
              value={settings.appleRemindersConnected || false} 
              onValueChange={handleAppleRemindersToggle} 
              trackColor={{ true: '#b61722', false: '#e0e3e5' }}
            />
          </View>

          <View className="h-[1px] bg-slate-200/30 dark:bg-slate-800/30" />

          {/* Calendar Integration */}
          <View className="flex-row justify-between items-center flex-wrap gap-4">
            <View className="flex-row items-center gap-3 flex-1 min-w-[200px]">
              <View className="bg-red-500/10 p-2.5 rounded-2xl border border-red-500/20">
                <CalendarIcon size={20} color="#ef4444" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-bold text-on-surface">Calendar Schedule</Text>
                  {settings.calendarConnected && (
                    <View className="bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                      <Text className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Active</Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-on-surface-variant mt-0.5">
                  {settings.calendarConnected && settings.selectedCalendarName 
                    ? `Timebox items in "${settings.selectedCalendarName}".`
                    : 'Timebox tasks by AM/PM schedule phases.'}
                </Text>
              </View>
            </View>
            <Switch 
              value={settings.calendarConnected || false} 
              onValueChange={handleCalendarToggle} 
              trackColor={{ true: '#b61722', false: '#e0e3e5' }}
            />
          </View>

          {/* Live Sync Audit Trail Console */}
          {(settings.integrationLogs && settings.integrationLogs.length > 0) && (
            <>
              <View className="h-[1px] bg-slate-200/30 dark:bg-slate-800/30" />
              <View className="bg-surface-container-high rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/50">
                <View className="flex-row items-center gap-1.5 mb-3">
                  <History size={14} color="#b61722" />
                  <Text className="text-xs font-black uppercase text-on-surface tracking-wider">Sync Control Log</Text>
                </View>
                <View className="gap-2">
                  {settings.integrationLogs.slice(0, 4).map((log) => {
                    const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const isSuccess = log.status === 'success';
                    const isError = log.status === 'error';
                    return (
                      <View key={log.id} className="flex-row items-start gap-2">
                        <Text className="text-xs font-bold text-slate-650 dark:text-slate-300 mt-0.5">{time}</Text>
                        <View className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isSuccess ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <Text className={`text-xs font-medium flex-1 ${isSuccess ? 'text-on-surface/90' : isError ? 'text-red-650 dark:text-red-400 font-bold' : 'text-slate-650 dark:text-slate-300'}`}>
                          {log.message}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}

        </AdaptiveGlass>

        {/* CLOUD ACCOUNT */}
        <Text className="text-primary font-bold uppercase tracking-widest text-xs mb-3 ml-2">Cloud Account</Text>
        <AdaptiveGlass className="rounded-3xl p-6 shadow-sm mb-8">
          {!settings.user ? (
            <View className="gap-5">
              <View className="flex-row items-center gap-3">
                <View className="bg-primary/10 p-2.5 rounded-2xl border border-primary/20">
                  <Sparkles size={24} color="#b61722" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-on-surface">Enable Cloud Sync</Text>
                  <Text className="text-xs text-on-surface-variant mt-0.5">Backup your boards and sync sprints across devices in real-time.</Text>
                </View>
              </View>
              
              <View className="h-[1px] bg-slate-200/30 dark:bg-slate-800/30" />
              
              <Text className="text-xs text-on-surface-variant leading-relaxed">
                Join our premium synchronization service. Signing in gives you access to automated cloud backups, multi-device access, and unified sprints.
              </Text>
              
              <Pressable 
                onPress={() => {
                  if (settings.hapticsEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  router.push('/auth' as any);
                }}
                className="bg-primary py-4 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-90 shadow-md"
              >
                <Text className="text-on-primary font-black uppercase tracking-wider text-sm">Sign In / Register</Text>
                <ArrowRight size={16} color="white" />
              </Pressable>
            </View>
          ) : (
            <View className="gap-5">
              {/* Premium Profile Banner Card */}
              <View className="flex-row items-center gap-4">
                <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/30">
                  <Text className="text-xl font-black text-primary">
                    {(settings.user.displayName || settings.user.email || 'U').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="text-lg font-black text-on-surface leading-tight">
                      {settings.user.displayName || 'Developer Guest'}
                    </Text>
                    <View className="w-2.5 h-2.5 rounded-full bg-green-500 mt-0.5" />
                  </View>
                  <Text className="text-xs text-on-surface-variant font-medium mt-0.5">
                    {settings.user.email || 'cloud-sync@mscw.app'}
                  </Text>
                </View>
              </View>

              <View className="h-[1px] bg-slate-200/30 dark:bg-slate-800/30" />

              {/* Statistics & Streak Display */}
              <View className="flex-row justify-between bg-surface-container-high rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40">
                <View className="items-center flex-1">
                  <Text className="text-xs font-black uppercase text-slate-650 dark:text-slate-300 tracking-wider">Current Streak</Text>
                  <Text className="text-lg font-black text-primary mt-1">🔥 {settings.currentStreakDays || 0} Days</Text>
                </View>
                <View className="w-[1px] bg-slate-200/50 dark:bg-slate-800/50" />
                <View className="items-center flex-1">
                  <Text className="text-xs font-black uppercase text-slate-650 dark:text-slate-300 tracking-wider">Sync Status</Text>
                  <Text className="text-xs font-black text-green-700 dark:text-green-400 mt-2 uppercase tracking-widest">Active Live</Text>
                </View>
              </View>

              {/* Cloud Settings Action List */}
              <View className="gap-3 mt-1">
                <Pressable 
                  onPress={exportData}
                  className="flex-row items-center justify-between p-3 rounded-xl bg-surface-container-low border border-slate-200/30 dark:border-slate-800/30 active:opacity-60"
                >
                  <View className="flex-row items-center gap-3">
                    <Archive size={18} color="#79747e" />
                    <Text className="text-sm font-bold text-on-surface">Export Board Data</Text>
                  </View>
                  <ArrowRight size={14} color="#79747e" />
                </Pressable>

                <Pressable 
                  onPress={signOut}
                  className="flex-row items-center justify-between p-3 rounded-xl bg-surface-container-low border border-slate-200/30 dark:border-slate-800/30 active:opacity-60"
                >
                  <View className="flex-row items-center gap-3">
                    <LogOut size={18} color="#79747e" />
                    <Text className="text-sm font-bold text-on-surface">Sign Out of Cloud</Text>
                  </View>
                  <ArrowRight size={14} color="#79747e" />
                </Pressable>

                <Pressable 
                  onPress={deleteAccount}
                  className="flex-row items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 active:opacity-60"
                >
                  <View className="flex-row items-center gap-3">
                    <Trash2 size={18} color="#b61722" />
                    <Text className="text-sm font-bold text-primary">Delete Cloud Profile & Data</Text>
                  </View>
                  <ArrowRight size={14} color="#b61722" />
                </Pressable>
              </View>
            </View>
          )}
        </AdaptiveGlass>

        <Pressable 
          onPress={handleArchivePress}
          className="bg-primary-container border border-primary/20 rounded-2xl p-4 flex-row items-center justify-center gap-2 active:opacity-80 mb-12"
        >
          <Archive size={20} color="#b61722" />
          <Text className="text-primary font-black uppercase tracking-widest text-sm">View Archive</Text>
        </Pressable>

        {/* Google OAuth Simulation Sheet */}
        <Modal
          visible={googleModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setGoogleModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-surface rounded-t-[40px] p-6 border-t border-slate-200/40 dark:border-slate-800/40 shadow-2xl">
              <View className="w-12 h-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 mx-auto mb-6" />
              
              <View className="items-center mb-6">
                <View className="w-12 h-12 bg-white rounded-full items-center justify-center border border-outline shadow-sm mb-4">
                  <Text className="text-xl font-black text-[#4285F4]">G</Text>
                </View>
                <Text className="text-2xl font-black text-on-surface tracking-tight">Sign in with Google</Text>
                <Text className="text-sm text-on-surface-variant mt-1">to continue to MSCW Sync</Text>
              </View>

              <View className="bg-surface-container-high rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/50 gap-4 mb-6">
                <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">MSCW wants to access your Google Account:</Text>
                
                <View className="flex-row gap-3 items-start">
                  <View className="bg-primary/10 p-1.5 rounded-lg mt-0.5">
                    <CheckCircle2 size={12} color="#b61722" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-on-surface">View and manage your tasks</Text>
                    <Text className="text-xs text-on-surface-variant mt-0.5">Allows MSCW to create task lists and map daily sprints to Google Tasks.</Text>
                  </View>
                </View>

                <View className="flex-row gap-3 items-start">
                  <View className="bg-primary/10 p-1.5 rounded-lg mt-0.5">
                    <CheckCircle2 size={12} color="#b61722" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-on-surface">View and manage your task lists</Text>
                    <Text className="text-xs text-on-surface-variant mt-0.5">Allows MSCW to create a dedicated &quot;MSCW Sprint&quot; list for neat organization.</Text>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5 bg-secondary-container/30 border border-secondary/10 p-4 rounded-2xl mb-6">
                <Info size={16} color="#855300" />
                <Text className="text-xs text-on-surface-variant flex-1">
                  You are logging in securely via Google OAuth. MSCW never stores your credentials.
                </Text>
              </View>

              {googleSyncing ? (
                <View className="py-6 items-center justify-center gap-3">
                  <ActivityIndicator size="large" color="#b61722" />
                  <Text className="text-xs font-black text-primary animate-pulse uppercase tracking-widest">Connecting to Google Tasks...</Text>
                </View>
              ) : (
                <View className="flex-row gap-4 mb-6">
                  <Pressable 
                    onPress={() => setGoogleModalVisible(false)}
                    className="flex-1 bg-surface-container-high border border-outline-variant py-4 rounded-2xl items-center active:opacity-75"
                  >
                    <Text className="text-on-surface font-bold">Cancel</Text>
                  </Pressable>
                  <Pressable 
                    onPress={executeGoogleConnect}
                    className="flex-1 bg-primary py-4 rounded-2xl items-center active:opacity-90"
                  >
                    <Text className="text-on-primary font-bold">Continue</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Apple Reminders iOS Permission Dialogue */}
        <Modal
          visible={appleModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setAppleModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <View className="bg-surface rounded-[32px] p-6 border border-outline-variant/50 max-w-sm w-full shadow-2xl items-center">
              <View className="bg-purple-500/10 p-4 rounded-full border border-purple-500/20 mb-4 mt-2">
                <CheckCircle2 size={36} color="#a855f7" />
              </View>
              
              <Text className="text-xl font-extrabold text-on-surface text-center mb-2">
                &quot;MSCW&quot; Would Like to Access Your Reminders
              </Text>
              
              <Text className="text-xs text-on-surface-variant text-center leading-relaxed mb-6">
                This allows MSCW to keep your uncompleted board tasks synchronized automatically with Apple Reminders for seamless tracking via Siri and lock screen widgets.
              </Text>

              {appleSyncing ? (
                <View className="py-4 items-center justify-center gap-2">
                  <ActivityIndicator size="small" color="#b61722" />
                  <Text className="text-xs font-bold text-primary uppercase tracking-widest">Requesting Permission...</Text>
                </View>
              ) : (
                <View className="flex-row border-t border-slate-200/40 dark:border-slate-800/40 w-full -mx-6 -mb-6">
                  <Pressable 
                    onPress={() => setAppleModalVisible(false)}
                    className="flex-1 py-4 border-r border-slate-200/40 dark:border-slate-800/40 items-center active:opacity-60"
                  >
                    <Text className="text-on-surface-variant font-medium text-base">Don&apos;t Allow</Text>
                  </Pressable>
                  <Pressable 
                    onPress={executeAppleConnect}
                    className="flex-1 py-4 items-center active:opacity-60"
                  >
                    <Text className="text-primary font-bold text-base">Allow</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Calendar Selection Modal */}
        <Modal
          visible={calendarModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCalendarModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-surface rounded-t-[40px] p-6 border-t border-slate-200/40 dark:border-slate-800/40 shadow-2xl">
              <View className="w-12 h-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 mx-auto mb-6" />

              <View className="flex-row items-center gap-3 mb-6">
                <CalendarIcon size={28} color="#ef4444" />
                <View>
                  <Text className="text-2xl font-black text-on-surface tracking-tight">Select Calendar</Text>
                  <Text className="text-xs text-on-surface-variant mt-0.5">Choose which calendar to timebox your tasks into.</Text>
                </View>
              </View>

              {calendarSyncing ? (
                <View className="py-12 items-center justify-center gap-3">
                  <ActivityIndicator size="large" color="#b61722" />
                  <Text className="text-xs font-black text-primary animate-pulse uppercase tracking-widest">Linking Calendar Events...</Text>
                </View>
              ) : (
                <View className="gap-3 mb-6">
                  {systemCalendars.map((cal) => (
                    <Pressable
                      key={cal.id}
                      onPress={() => executeCalendarConnect(cal.name, cal.id)}
                      className="bg-surface-container-high border border-outline-variant p-4 rounded-2xl flex-row items-center justify-between active:opacity-75"
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <Text className="text-2xl">📅</Text>
                        <View className="flex-1">
                          <Text className="font-bold text-on-surface">{cal.name}</Text>
                          <Text className="text-xs text-on-surface-variant mt-0.5">Timebox your tasks directly in this calendar.</Text>
                        </View>
                      </View>
                      <ArrowRight size={16} color="#b61722" />
                    </Pressable>
                  ))}
                  
                  <Pressable 
                    onPress={() => setCalendarModalVisible(false)}
                    className="bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 py-4 rounded-2xl items-center active:opacity-75 mt-2"
                  >
                    <Text className="text-on-surface-variant font-bold">Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeScreen>
  );
}


import React from 'react';
import { View, Text, Switch, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { Plus, Minus, Settings2, Archive, UserCircle, LogOut, Trash2 } from 'lucide-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as LocalAuthentication from 'expo-local-authentication';
import RevenueCatUI from 'react-native-purchases-ui';
import { firebaseAuth, db } from '../lib/firebase';
import auth from '@react-native-firebase/auth';

export default function SettingsPage() {
  const router = useRouter();
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);

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

  const handleArchivePress = async () => {
    try {
      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: 'premium'
      });
      if (paywallResult === RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED || paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED) {
        router.push('/archive' as any);
      }
    } catch (e) {
      console.error("Paywall Error:", e);
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
        <View className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant shadow-sm gap-6 mb-8">
          <View className="flex-row justify-between items-center flex-wrap gap-4">
            <View className="flex-1 min-w-[200px]">
              <Text className="text-lg font-bold text-on-surface">Daily Capacity</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5">Define your daily story point burnout ceiling.</Text>
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
          
          <View className="h-[1px] bg-outline-variant/30" />

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

          <View className="h-[1px] bg-outline-variant/30" />

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

          <View className="h-[1px] bg-outline-variant/30" />

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

          <View className="h-[1px] bg-outline-variant/30" />

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
              trackColor={{ true: '#b61722', false: '#e0e3e5' }}
            />
          </View>
        </View>

        {/* CLOUD ACCOUNT */}
        <Text className="text-primary font-bold uppercase tracking-widest text-xs mb-3 ml-2">Cloud Account</Text>
        <View className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant shadow-sm gap-4 mb-8">
          {!settings.user ? (
            <>
              <View className="mb-2">
                <Text className="text-lg font-bold text-on-surface">Enable Cloud Sync</Text>
                <Text className="text-xs text-on-surface-variant mt-0.5">Sign in to securely backup your board and unlock premium cross-device syncing.</Text>
              </View>
              <Pressable 
                onPress={signInWithApple}
                className="bg-black py-4 rounded-xl items-center flex-row justify-center gap-2 active:opacity-80"
              >
                <Text className="text-white font-bold">Sign in with Apple</Text>
              </Pressable>
              <Pressable className="bg-surface-container-high border border-outline-variant py-4 rounded-xl items-center flex-row justify-center gap-2 active:opacity-80">
                <Text className="text-on-surface font-bold">Sign in with Google</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View className="flex-row items-center gap-3 mb-2">
                <UserCircle size={32} color="#b61722" />
                <View>
                  <Text className="text-lg font-bold text-on-surface">Signed In</Text>
                  <Text className="text-xs text-on-surface-variant">{settings.user.email || 'Cloud user'}</Text>
                </View>
              </View>
              <View className="h-[1px] bg-outline-variant/30 my-2" />
              <Pressable 
                onPress={signOut}
                className="flex-row items-center justify-between py-2 active:opacity-50"
              >
                <Text className="text-on-surface font-bold">Sign Out</Text>
                <LogOut size={20} color="#666" />
              </Pressable>
              <Pressable 
                onPress={deleteAccount}
                className="flex-row items-center justify-between py-2 active:opacity-50 mt-2"
              >
                <Text className="text-[#b61722] font-bold">Delete Account & Data</Text>
                <Trash2 size={20} color="#b61722" />
              </Pressable>
            </>
          )}
        </View>

        <Pressable 
          onPress={handleArchivePress}
          className="bg-primary-container border border-primary/20 rounded-2xl p-4 flex-row items-center justify-center gap-2 active:opacity-80 mb-12"
        >
          <Archive size={20} color="#b61722" />
          <Text className="text-primary font-black uppercase tracking-widest text-sm">View Archive</Text>
        </Pressable>
      </ScrollView>
    </SafeScreen>
  );
}


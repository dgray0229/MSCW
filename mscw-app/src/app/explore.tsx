import React from 'react';
import { View, Text, Switch, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { Plus, Minus, Settings2, Archive } from 'lucide-react-native';

export default function SettingsPage() {
  const router = useRouter();
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);

  return (
    <SafeScreen className="flex-1 bg-background p-4">
      <View className="flex-row items-center gap-3 mb-6 mt-2">
        <Settings2 size={32} color="#b61722" />
        <Text className="text-4xl font-black text-on-surface tracking-tight">Settings</Text>
      </View>
      
      <View className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant shadow-sm gap-6 mb-6">
        {/* Interactive capacity points setting */}
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

        {/* Auto Archive Won't Tasks */}
        <View className="flex-row justify-between items-center flex-wrap gap-4">
          <View className="flex-1 min-w-[200px]">
            <Text className="text-lg font-bold text-on-surface">Auto-Archive Won't Tasks</Text>
            <Text className="text-xs text-on-surface-variant mt-0.5">Triaged 'Won't' items bypass Board and archive immediately.</Text>
          </View>
          <Switch 
            value={settings.autoArchiveWontTasks} 
            onValueChange={(val) => updateSettings({ autoArchiveWontTasks: val })} 
            trackColor={{ true: '#b61722', false: '#e0e3e5' }}
          />
        </View>

        <View className="h-[1px] bg-outline-variant/30" />

        <View className="flex-row justify-between items-center flex-wrap gap-4">
          <View className="flex-1 min-w-[200px]">
            <Text className="text-lg font-bold text-on-surface">Zen Mode Notifications</Text>
            <Text className="text-xs text-on-surface-variant mt-0.5">Block all inbound push alerts during task focus.</Text>
          </View>
          <Switch 
            value={settings.zenModeNotifications} 
            onValueChange={(val) => updateSettings({ zenModeNotifications: val })} 
            trackColor={{ true: '#b61722', false: '#e0e3e5' }}
          />
        </View>

        <View className="h-[1px] bg-outline-variant/30" />

        <View className="flex-row justify-between items-center flex-wrap gap-4">
          <View className="flex-1 min-w-[200px]">
            <Text className="text-lg font-bold text-on-surface">Dark Mode</Text>
            <Text className="text-xs text-on-surface-variant mt-0.5">Toggle high-contrast obsidian styling theme.</Text>
          </View>
          <Switch 
            value={settings.darkMode} 
            onValueChange={(val) => updateSettings({ darkMode: val })} 
            trackColor={{ true: '#b61722', false: '#e0e3e5' }}
          />
        </View>
      </View>

      <Pressable 
        onPress={() => router.push('/archive' as any)}
        className="bg-primary-container border border-primary/20 rounded-2xl p-4 flex-row items-center justify-center gap-2 active:opacity-80"
      >
        <Archive size={20} color="#b61722" />
        <Text className="text-primary font-black uppercase tracking-widest text-sm">View Archive</Text>
      </Pressable>
    </SafeScreen>
  );
}


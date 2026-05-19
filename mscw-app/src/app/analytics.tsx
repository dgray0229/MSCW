import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { TrendingUp, Award, Target, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function AnalyticsPage() {
  const tasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);

  // Compute Must-Have Metrics
  const mustHaves = tasks.filter(t => t.priority === 'must');
  const completedMustHaves = mustHaves.filter(t => t.completed);
  const completionRate = mustHaves.length === 0 ? 0 : Math.round((completedMustHaves.length / mustHaves.length) * 100);

  // Compute Point Usage
  const boardTasks = tasks.filter(t => t.status === 'board');
  const usedPoints = boardTasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const isUnderCapacity = usedPoints <= settings.dailyCapacity;

  const simulateDayCompletion = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isUnderCapacity) {
      const newStreak = settings.currentStreakDays + 1;
      updateSettings({
        currentStreakDays: newStreak,
        longestStreakDays: Math.max(newStreak, settings.longestStreakDays)
      });
    } else {
      updateSettings({ currentStreakDays: 0 });
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background relative">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        
        <View className="flex-row items-center gap-3 mb-8 mt-4">
          <TrendingUp size={32} color="#b61722" />
          <Text className="text-4xl font-black text-on-surface tracking-tight">Analytics</Text>
        </View>

        {/* Completion Rate Widget */}
        <View className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant shadow-sm mb-6 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-on-surface-variant font-bold uppercase tracking-widest text-xs mb-1">Must-Have Success</Text>
            <Text className="text-on-surface font-black text-5xl tracking-tighter">{completionRate}%</Text>
            <Text className="text-on-surface-variant text-sm mt-2">
              {completedMustHaves.length} of {mustHaves.length} critical tasks finished.
            </Text>
          </View>
          <View className="w-24 h-24 rounded-full border-[8px] border-surface-container-highest items-center justify-center relative">
            {/* Mock CSS circular progress */}
            <View className={`absolute w-24 h-24 rounded-full border-[8px] border-primary ${completionRate === 100 ? 'opacity-100' : 'opacity-20'}`} />
            <Target size={32} color={completionRate > 50 ? '#b61722' : '#73777f'} />
          </View>
        </View>

        {/* Capacity Streak Widget */}
        <View className="bg-primary/10 p-6 rounded-3xl border border-primary/20 shadow-sm mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Award size={24} color="#b61722" />
            <Text className="text-primary font-black text-xl tracking-tight">Discipline Streak</Text>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <View className="items-center flex-1">
              <Text className="text-primary font-black text-6xl tracking-tighter">{settings.currentStreakDays}</Text>
              <Text className="text-primary font-bold text-sm uppercase tracking-widest">Current</Text>
            </View>
            <View className="w-[1px] h-12 bg-primary/20 mx-4" />
            <View className="items-center flex-1">
              <Text className="text-on-surface font-black text-4xl tracking-tighter">{settings.longestStreakDays}</Text>
              <Text className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">Record</Text>
            </View>
          </View>

          <Text className="text-on-surface text-center text-sm leading-relaxed mb-6 px-4">
            {settings.currentStreakDays === 0 
              ? "Stay under your capacity limit to build a streak!" 
              : `You've avoided burnout for ${settings.currentStreakDays} consecutive days. Keep it up!`}
          </Text>

          {/* Dev Simulate Button */}
          <Pressable 
            onPress={simulateDayCompletion}
            className={`py-3 rounded-full flex-row items-center justify-center gap-2 ${isUnderCapacity ? 'bg-primary' : 'bg-outline-variant/30'}`}
          >
            <Text className={`font-black uppercase tracking-wider text-sm ${isUnderCapacity ? 'text-on-primary' : 'text-on-surface-variant'}`}>
              Simulate Day End
            </Text>
          </Pressable>
        </View>

        {/* Status Info */}
        <View className="flex-row gap-3 bg-surface-container p-4 rounded-2xl">
          <Info size={24} color="#73777f" />
          <Text className="text-on-surface-variant text-sm flex-1">
            Streaks automatically increment at midnight if your scheduled board points ({usedPoints}) remain at or under your daily capacity limit ({settings.dailyCapacity}).
          </Text>
        </View>

      </ScrollView>
    </SafeScreen>
  );
}

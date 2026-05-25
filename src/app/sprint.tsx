import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { LayoutDashboard, ArrowLeftRight, Sparkles, ChevronRight } from 'lucide-react-native';
import { Task } from '../types';
import * as Haptics from 'expo-haptics';
import { useAccentTheme } from '../hooks/useAccentTheme';
import { AISprintArchitectDrawer } from '../components/AISprintArchitectDrawer';
import { useColorScheme } from '../hooks/use-color-scheme';
import { AdaptiveGlass } from '../components/ui/AdaptiveGlass';
import { getSmartCapacityRecommendation } from '../lib/aiPlanner';

const PRIORITY_ORDER = { must: 0, should: 1, could: 2, wont: 3, unsorted: 4 };

const SprintItem = React.memo(function SprintItem({ task, updateTask, theme }: { task: Task, updateTask: (id: string, updates: Partial<Task>) => void, theme: any }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleMoveToToday = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateTask(task.id, { status: 'today' });
  };

  const handleMoveToBacklog = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateTask(task.id, { status: 'backlog' });
  };

  return (
    <AdaptiveGlass
      isInteractive
      style={{
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.03)',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-4">
          <Text selectable={true} className="font-bold text-on-surface text-base mb-1">{task.title}</Text>
          {task.description ? (
            <Text selectable={true} className="text-xs text-on-surface-variant mt-1 mb-2" numberOfLines={2}>{task.description}</Text>
          ) : null}
          
          <View className="flex-row items-center gap-2 flex-wrap">
            <View className={`px-2 py-0.5 rounded-full ${
              task.priority === 'must' ? theme.tint :
              task.priority === 'should' ? 'bg-secondary/15' :
              task.priority === 'could' ? 'bg-tertiary/15' :
              task.priority === 'wont' ? 'bg-slate-500/15' : 'bg-slate-500/15'
            }`}>
              <Text className={`text-xs font-black uppercase tracking-widest ${
                task.priority === 'must' ? theme.textPrimary :
                task.priority === 'should' ? 'text-secondary' :
                task.priority === 'could' ? 'text-tertiary' :
                task.priority === 'wont' ? 'text-slate-650 dark:text-slate-300' : 'text-slate-650 dark:text-slate-300'
              }`}>
                {task.priority}
              </Text>
            </View>

            <View className="bg-slate-200/40 dark:bg-slate-800/40 px-2 py-0.5 rounded-full">
              <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">{task.type || 'Uncategorized'}</Text>
            </View>

            {task.points ? (
              <View className="px-2 py-0.5 rounded-full border" style={{ backgroundColor: theme.primary + '15', borderColor: theme.primary + '25' }}>
                <Text className="text-xs font-black" style={{ color: theme.primary }}>{task.points} pts</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-2 pt-2 border-t border-slate-200/20 dark:border-slate-800/20">
        <Pressable 
          onPress={handleMoveToToday}
          className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl active:opacity-70"
          style={{ backgroundColor: theme.primary + '20' }}
        >
          <LayoutDashboard size={14} color={theme.primary} />
          <Text className="font-black text-xs uppercase tracking-wider" style={{ color: theme.primary }}>Move to Today</Text>
        </Pressable>
        
        <Pressable 
          onPress={handleMoveToBacklog}
          className="flex-row items-center justify-center bg-slate-200/40 dark:bg-slate-800/40 py-2.5 px-4 rounded-xl active:opacity-70 border border-slate-200/20 dark:border-slate-800/20"
        >
          <ArrowLeftRight size={14} color={isDark ? '#e2e8f0' : '#475569'} />
          <Text className="font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-widest ml-1">Backlog</Text>
        </Pressable>
      </View>
    </AdaptiveGlass>
  );
});

export default function SprintPage() {
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const allTasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const updateTask = useAppStore(state => state.updateTask);
  
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);

  const tasks = useMemo(() => {
    return allTasks
      .filter(t => t.status === 'sprint' && !t.completed)
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [allTasks]);

  const sprintStartDateStr = settings.sprintStartDate;
  const sprintLengthDays = typeof settings.sprintLengthDays === 'number' && !isNaN(settings.sprintLengthDays) ? settings.sprintLengthDays : 7;
  
  let daysSinceStart = 0;
  if (sprintStartDateStr) {
    const parsedDate = Date.parse(sprintStartDateStr);
    if (!isNaN(parsedDate)) {
      daysSinceStart = Math.floor((new Date().getTime() - parsedDate) / (1000 * 60 * 60 * 24));
    }
  }
  if (isNaN(daysSinceStart) || daysSinceStart < 0) {
    daysSinceStart = 0;
  }
  
  const daysRemaining = Math.max(0, sprintLengthDays - daysSinceStart);

  const recommendation = getSmartCapacityRecommendation(allTasks, settings);
  const progressPercent = Math.min(100, recommendation.percentage);

  return (
    <SafeScreen className="flex-1 bg-background" scrollable={false}>
      <View className="px-6 pt-6 pb-4">
        <Text className="text-4xl font-black text-on-surface tracking-tight">Sprint Backlog</Text>
        <View className="flex-row items-center gap-2 mt-1.5">
          <Text className="text-on-surface-variant dark:text-slate-300 font-semibold text-sm italic">
            Sprint {settings.sprintNumber} • {daysRemaining} Days Remaining
          </Text>
        </View>
        <Text className="text-sm text-on-surface-variant dark:text-slate-200 mt-3 leading-relaxed">
          This is your active focus area. Plan your daily routine by moving tasks from here to your Today board.
        </Text>

        {/* Capacity Advisor Progress Panel */}
        <AdaptiveGlass
          style={{
            padding: 14,
            borderRadius: 20,
            marginTop: 12,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 4px 10px rgba(0, 0, 0, 0.02)',
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-black uppercase tracking-wider text-on-surface">
              Sprint Load Capacity
            </Text>
            <Text className="text-xs font-black text-slate-650 dark:text-slate-300">
              {recommendation.currentLoad} / {recommendation.optimalCapacity} pts ({recommendation.percentage}%)
            </Text>
          </View>
          
          <View className="h-2.5 w-full bg-slate-200/40 dark:bg-slate-800/40 rounded-full overflow-hidden border border-slate-200/10 dark:border-slate-800/10">
            <View 
              className="h-full rounded-full"
              style={{ 
                width: `${progressPercent}%`,
                backgroundColor: 
                  recommendation.level === 'danger' ? theme.primary : 
                  recommendation.level === 'warning' ? theme.secondary : theme.tertiary
              }}
            />
          </View>

          {recommendation.level === 'danger' && (
            <View className="mt-2">
              <Text className="text-[10px] font-black uppercase tracking-wider" style={{ color: theme.primary }}>
                ⚠️ Overcommitted! Consider deferring items or assigning them to Won't-Have.
              </Text>
            </View>
          )}
        </AdaptiveGlass>

        {/* AI Sprint Architect Trigger Card */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsArchitectOpen(true);
          }}
          className="mt-5 active:scale-[0.98] transition-transform duration-100"
        >
          <AdaptiveGlass
            isInteractive
            style={{
              padding: 18,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              boxShadow: isDark ? '0 8px 24px rgba(0, 0, 0, 0.2)' : '0 8px 20px rgba(0, 0, 0, 0.03)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View className="flex-row items-center gap-3.5 flex-1 mr-4">
              <View className="p-3 rounded-2xl" style={{ backgroundColor: theme.primary + '15' }}>
                <Sparkles size={18} color={theme.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-black uppercase tracking-widest" style={{ color: theme.primary }}>AI Sprint Architect Coach</Text>
                <Text className="text-xs text-on-surface-variant dark:text-slate-200 mt-1 font-medium leading-relaxed">
                  Decompose high-point friction tasks into smart, bite-sized daily execution goals.
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={theme.primary} />
          </AdaptiveGlass>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
        {tasks.length > 0 ? (
          <View className="pb-12">
            {tasks.map(task => (
              <SprintItem key={task.id} task={task} updateTask={updateTask} theme={theme} />
            ))}
          </View>
        ) : (
          <AdaptiveGlass
            style={{
              paddingVertical: 64,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 32,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              marginTop: 16,
            }}
          >
            <Text className="text-on-surface dark:text-slate-100 font-extrabold text-xl text-center px-6">
              Your sprint backlog is empty!
            </Text>
            <Text className="text-sm text-on-surface-variant dark:text-slate-300 mt-3 text-center px-8 leading-relaxed max-w-[320px]">
              Use the Triage feature or pull items from your Backlog to plan your week.
            </Text>
          </AdaptiveGlass>
        )}
      </ScrollView>

      {/* AISprintArchitectDrawer bottom drawer */}
      <AISprintArchitectDrawer 
        isOpen={isArchitectOpen} 
        onClose={() => setIsArchitectOpen(false)} 
      />
    </SafeScreen>
  );
}

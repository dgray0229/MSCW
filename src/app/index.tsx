import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Platform, ActivityIndicator } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useAppStore } from '../store';
import { Priority, Task } from '../types';
import { deconstructTask } from '../lib/gemini';
import { SafeScreen } from '../components/SafeScreen';
import Animated, { LinearTransition, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { 
  Flame, 
  CheckCircle2, 
  PlusCircle, 
  CloudSnow, 
  AlertTriangle,
  RefreshCw,
  Cloud,
  Sparkles,
  Trophy,
  X,
  Search,
  Archive,
  Sun,
  Moon
} from 'lucide-react-native';
import { SwipeableCard } from '../components/SwipeableCard';
import { getTaskIcon } from '../lib/taskUtils';
import { useRouter } from 'expo-router';
import { presentPaywallIfNeeded } from '../lib/purchases';
import { getCapacityGuardianRecommendation } from '../lib/aiPlanner';
import { OverflowConciergeDrawer } from '../components/OverflowConciergeDrawer';
import { ConfettiReward, ConfettiRewardRef } from '../components/ConfettiReward';
import { DailyRetroModal } from '../components/DailyRetroModal';
import * as Haptics from 'expo-haptics';
import { AITriageDrawer } from '../components/AITriageDrawer';
import { useAccentTheme } from '../hooks/useAccentTheme';
import { AdaptiveGlass } from '../components/ui/AdaptiveGlass';


const COLUMNS: { key: Priority; label: string; icon: any; color: string; tint: string }[] = [
  { key: 'must', label: 'Must', icon: Flame, color: 'text-primary', tint: 'bg-red-500/[0.08] dark:bg-red-950/20' },
  { key: 'should', label: 'Should', icon: CheckCircle2, color: 'text-secondary', tint: 'bg-amber-600/[0.08] dark:bg-amber-950/20' },
  { key: 'could', label: 'Could', icon: PlusCircle, color: 'text-tertiary', tint: 'bg-teal-600/[0.08] dark:bg-teal-950/20' },
  { key: 'wont', label: 'Won\'t', icon: CloudSnow, color: 'text-slate-500 dark:text-slate-400', tint: 'bg-surface-container/20 dark:bg-surface-container/20' },
];
const TaskCard = React.memo(function TaskCard({
  task,
  col,
  expandedTask,
  setExpandedTask,
  updateTask,
  handleZenMode,
  cyclePhase,
  getPhaseEmoji,
  triggerConfetti,
}: {
  task: Task;
  col: any;
  expandedTask: string | null;
  setExpandedTask: (id: string | null) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  handleZenMode: (id: string) => void;
  cyclePhase: (id: string, phase?: string) => void;
  getPhaseEmoji: (phase?: string) => string;
  triggerConfetti?: () => void;
}) {
  const TypeIcon = getTaskIcon(task.type);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  
  const [isDeconstructing, setIsDeconstructing] = useState(false);

  const handleDeconstruct = async () => {
    if (useAppStore.getState().settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsDeconstructing(true);
    try {
      const generatedSteps = await deconstructTask(task.title, task.points || 3);
      const newSubtasks = generatedSteps.map((step, idx) => ({
        id: `${Math.random().toString(36).substring(2, 11)}-${idx}`,
        title: step,
        completed: false,
      }));
      updateTask(task.id, { subtasks: newSubtasks });
      
      if (useAppStore.getState().settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error in task deconstruction:', error);
    } finally {
      setIsDeconstructing(false);
    }
  };

  const isDark = colorScheme === 'dark';

  return (
    <Animated.View
      key={task.id}
      layout={LinearTransition.springify().damping(14)}
      entering={FadeInDown.springify().damping(14)}
      exiting={FadeOutUp.duration(200)}
    >
      <SwipeableCard
        leftAction={{
          icon: <CheckCircle2 size={20} color="white" />,
          label: task.completed ? 'Undo' : 'Complete',
          backgroundColor: '#22c55e',
          onTrigger: () => {
            const willComplete = !task.completed;
            updateTask(task.id, { completed: willComplete });
            if (willComplete && col.key === 'must' && triggerConfetti) {
              triggerConfetti();
            }
          },
        }}
        rightAction={{
          icon: <Archive size={20} color="white" />,
          label: 'Archive',
          backgroundColor: '#ef4444',
          onTrigger: () => {
            updateTask(task.id, { status: 'archive' });
          },
        }}
        hapticsEnabled={useAppStore.getState().settings.hapticsEnabled}
      >
        <AdaptiveGlass
          isInteractive
          style={[
            {
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.03)',
              opacity: task.completed ? 0.65 : 1,
              borderLeftWidth: col.key === 'must' || col.key === 'should' || col.key === 'could' ? 5 : 1,
              borderLeftColor: col.key === 'must' ? theme.primary : col.key === 'should' ? theme.secondary : col.key === 'could' ? theme.tertiary : undefined,
            },
            col.key === 'wont' && {
              opacity: 0.6,
              borderStyle: 'dashed',
              backgroundColor: 'rgba(148, 163, 184, 0.05)',
            }
          ]}
        >
          <View className="flex-row items-start gap-3">
            <Pressable 
              accessibilityRole="button"
              accessibilityLabel={`Toggle completion for ${task.title}`}
              onPress={() => {
                const willComplete = !task.completed;
                updateTask(task.id, { completed: willComplete });
                if (willComplete && col.key === 'must' && triggerConfetti) {
                  triggerConfetti();
                }
              }}
              className={`mt-1 h-5 w-5 rounded-md border items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${task.completed ? 'bg-primary border-primary' : 'border-outline'}`}
            >
              {task.completed && <CheckCircle2 size={12} color="white" />}
            </Pressable>
            <View className="flex-1">
              <Pressable 
                accessibilityRole="button"
                accessibilityLabel={`Open Zen Mode for ${task.title}`}
                onPress={() => handleZenMode(task.id)} 
                className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-sm"
              >
                <Text selectable={true} className={`font-bold text-on-surface leading-tight ${task.completed || task.priority === 'wont' ? 'line-through' : ''}`}>
                  {task.title}
                </Text>
              </Pressable>
              
              {((task.tags && task.tags.length > 0) || (task.rolloverCount !== undefined && task.rolloverCount > 0)) && (
                <View className="flex-row flex-wrap items-center gap-1.5 mt-1.5 mb-2.5">
                  {task.tags && task.tags.map((tag, idx) => (
                    <View key={idx} className={`${theme.tint} px-1.5 py-0.5 rounded border border-outline-variant/30`}>
                      <Text className={`text-xs font-black ${theme.textPrimary}`}>#{tag}</Text>
                    </View>
                  ))}
                  {task.rolloverCount !== undefined && task.rolloverCount > 0 && (
                    <View className={
                      task.rolloverCount === 1 
                        ? "bg-blue-500/10 dark:bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-500/20 flex-row items-center gap-0.5"
                        : task.rolloverCount === 2
                          ? "bg-amber-500/10 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-500/20 flex-row items-center gap-0.5"
                          : "bg-red-500/10 dark:bg-red-950/30 px-1.5 py-0.5 rounded border border-red-500/20 flex-row items-center gap-0.5"
                    }>
                      <Text className="text-[10px]">{task.rolloverCount === 1 ? '❄️' : task.rolloverCount === 2 ? '⚡' : '🔥'}</Text>
                      <Text className={`text-[10px] font-black uppercase tracking-wider ${
                        task.rolloverCount === 1 
                          ? "text-blue-600 dark:text-blue-400"
                          : task.rolloverCount === 2
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-650 dark:text-red-400"
                      }`}>
                        {task.rolloverCount === 1 ? 'Rollover' : task.rolloverCount === 2 ? 'Stale' : `Rollover x${task.rolloverCount}`}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {!((task.tags && task.tags.length > 0) || (task.rolloverCount !== undefined && task.rolloverCount > 0)) && <View className="h-2" />}
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="flex-row items-center gap-1">
                    <TypeIcon size={12} color={colorScheme === 'dark' ? '#cbd5e1' : '#475569'} />
                    <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                      {task.type || 'Backend'}
                    </Text>
                  </View>
                  
                  <Pressable 
                    accessibilityRole="button"
                    accessibilityLabel={expandedTask === task.id ? 'Collapse subtasks' : 'Expand subtasks'}
                    onPress={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    className="bg-surface-container-high/40 dark:bg-surface-container-high/40 px-2 py-0.5 rounded-full flex-row items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Text className="text-xs font-bold text-slate-650 dark:text-slate-300">
                      {task.subtasks?.length ? `${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length} subtasks` : '+ subtask'}
                    </Text>
                  </Pressable>
                </View>
                
                <View className="flex-row items-center gap-2">
                  <Pressable 
                    accessibilityRole="button"
                    accessibilityLabel="Cycle task phase"
                    onPress={() => cyclePhase(task.id, task.phase)}
                    className={`px-2 py-0.5 rounded-full border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${task.phase ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30 dark:border-amber-950/40' : 'bg-transparent border-outline-variant/50'}`}
                  >
                    <Text className={`font-bold text-xs ${task.phase ? 'text-secondary' : 'text-slate-600 dark:text-slate-300'}`}>
                      {getPhaseEmoji(task.phase)}
                    </Text>
                  </Pressable>

                  <View className={`px-2 py-0.5 rounded ${col.key !== 'wont' ? col.tint : 'bg-surface-container'}`}>
                    <Text className={`font-black text-xs ${col.key !== 'wont' ? col.color : 'text-slate-600 dark:text-slate-300'}`}>
                      {task.points} pts
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expandable Subtasks Section */}
              {expandedTask === task.id && (
                <Animated.View entering={FadeInDown.duration(200)} className="mt-4 pt-3 border-t border-outline-variant/30 gap-2">
                  {isDeconstructing ? (
                    <View className="flex-row items-center justify-center gap-2.5 py-4 px-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] dark:bg-primary/[0.015]">
                      <ActivityIndicator size="small" color={theme.primary} />
                      <Text className={`text-xs font-semibold ${theme.textPrimary} tracking-wide`}>
                        FocusMust AI is deconstructing task blueprint...
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Re-Deconstruct with AI Button if subtasks exist */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            Checklist Steps
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Re-deconstruct with AI"
                            onPress={handleDeconstruct}
                            className="flex-row items-center gap-1 bg-surface-container px-2.5 py-1 rounded-full active:opacity-75 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          >
                            <Sparkles size={10} color={theme.primary} />
                            <Text className={`text-xs font-bold ${theme.textPrimary}`}>
                              Re-Deconstruct
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      {/* Subtask list */}
                      {task.subtasks?.map(subtask => (
                        <Pressable 
                          key={subtask.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Toggle subtask ${subtask.title}`}
                          onPress={() => {
                            const updatedSubtasks = task.subtasks?.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s);
                            updateTask(task.id, { subtasks: updatedSubtasks });
                          }}
                          className="flex-row items-center gap-2 py-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-md px-1 -mx-1"
                        >
                          <View className={`h-4 w-4 rounded-md border items-center justify-center ${subtask.completed ? 'bg-slate-500 dark:bg-slate-400 border-slate-500 dark:border-slate-400' : 'border-outline-variant'}`}>
                            {subtask.completed && <CheckCircle2 size={10} color="white" />}
                          </View>
                          <Text selectable={true} className={`text-xs flex-1 ${subtask.completed ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-on-surface'}`}>
                            {subtask.title}
                          </Text>
                        </Pressable>
                      ))}

                      {/* Deconstruct with AI Button if no subtasks exist */}
                      {(!task.subtasks || task.subtasks.length === 0) && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Deconstruct task with AI"
                          onPress={handleDeconstruct}
                          className="flex-row items-center justify-center gap-2 py-3.5 px-3 rounded-xl border border-dashed border-outline-variant/60 hover:border-primary/80 active:opacity-75 bg-surface-container/30 dark:bg-surface-container/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                          <Sparkles size={13} color={theme.primary} />
                          <Text className={`text-xs font-bold text-on-surface`}>
                            Deconstruct with AI
                          </Text>
                        </Pressable>
                      )}

                      {/* Add manual subtask input */}
                      <View className="flex-row items-center gap-2 mt-1">
                        <TextInput
                          accessibilityLabel="New subtask"
                          value={newSubtaskTitle}
                          onChangeText={setNewSubtaskTitle}
                          placeholder="Add subtask…"
                          placeholderTextColor={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                          className="flex-1 bg-surface-container px-3 py-1.5 rounded-md text-xs text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          onSubmitEditing={() => {
                            if (newSubtaskTitle.trim()) {
                              const newSubtask = { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false };
                              updateTask(task.id, { subtasks: [...(task.subtasks || []), newSubtask] });
                              setNewSubtaskTitle('');
                            }
                          }}
                        />
                      </View>
                    </>
                  )}
                </Animated.View>
              )}

            </View>
          </View>
        </AdaptiveGlass>
      </SwipeableCard>
    </Animated.View>
  );
});

export default function BoardPage() {
  const tasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const isSyncing = useAppStore(state => state.isSyncing);
  const updateTask = useAppStore(state => state.updateTask);
  const updateSettings = useAppStore(state => state.updateSettings);
  const router = useRouter();
  
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [aiDrawerVisible, setAiDrawerVisible] = useState(false);
  const [overflowDrawerVisible, setOverflowDrawerVisible] = useState(false);
  const [retroVisible, setRetroVisible] = useState(false);
  const confettiRef = React.useRef<ConfettiRewardRef>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'none' | 'points-high' | 'points-low'>('none');
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const triggerConfetti = React.useCallback(() => {
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    confettiRef.current?.fire();
  }, [settings.hapticsEnabled]);

  const handleZenMode = (taskId: string) => {
    if (settings.isPremium) {
      router.push(`/zen?id=${taskId}`);
    } else {
      router.push('/paywall');
    }
  };

  const cyclePhase = (taskId: string, currentPhase?: string) => {
    const nextPhase = !currentPhase ? 'morning' : currentPhase === 'morning' ? 'afternoon' : currentPhase === 'afternoon' ? 'evening' : undefined;
    updateTask(taskId, { phase: nextPhase });
  };

  const getPhaseEmoji = (phase?: string) => {
    if (phase === 'morning') return '☀️ AM';
    if (phase === 'afternoon') return '☕️ PM';
    if (phase === 'evening') return '🌙 EVE';
    return '⏱️ ADD TIME';
  };

  const todayTasks = React.useMemo(() => tasks.filter(t => t.status === 'today'), [tasks]);
  const mustTasks = React.useMemo(() => todayTasks.filter(t => t.priority === 'must'), [todayTasks]);

  // get all unique tags from todayTasks
  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    todayTasks.forEach(t => {
      t.tags?.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [todayTasks]);

  const displayedTasks = React.useMemo(() => {
    let list = todayTasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description?.toLowerCase().includes(q)
      );
    }

    if (selectedTag) {
      list = list.filter(t => t.tags?.includes(selectedTag));
    }

    if (sortBy === 'points-high') {
      list = [...list].sort((a, b) => (b.points || 0) - (a.points || 0));
    } else if (sortBy === 'points-low') {
      list = [...list].sort((a, b) => (a.points || 0) - (b.points || 0));
    }

    return list;
  }, [todayTasks, searchQuery, selectedTag, sortBy]);
  
  const completedPoints = todayTasks.reduce((sum, t) => sum + (t.completed ? (t.points || 0) : 0), 0);
  const totalPoints = todayTasks.reduce((sum, t) => sum + (t.points || 0), 0);
  
  // Visual progress bar percentage calculation:
  // Fall back to weighing unestimated tasks as 1 point so completing unestimated tasks moves the bar.
  const progressCompletedPoints = todayTasks.reduce((sum, t) => sum + (t.completed ? (t.points !== null && t.points !== undefined ? t.points : 1) : 0), 0);
  const progressTotalPoints = todayTasks.reduce((sum, t) => sum + (t.points !== null && t.points !== undefined ? t.points : 1), 0);
  const completionPercent = progressTotalPoints > 0 ? (progressCompletedPoints / progressTotalPoints) * 100 : 0; 
  
  const isOverCapacity = totalPoints > settings.dailyCapacity;
  const guardian = getCapacityGuardianRecommendation(tasks, settings.dailyCapacity);


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

  return (
    <View className="flex-1 bg-background relative">
      <SafeScreen className="flex-1" scrollable={true}>
      {/* Header */}
      <View className="flex-row justify-between items-start mb-6 flex-wrap gap-4">
        <View>
          <Text className="text-4xl font-black text-on-surface tracking-tight">Today</Text>
          <View className="flex-row items-center gap-3 mt-1.5 flex-wrap">
            <Text className="text-slate-500 dark:text-slate-400 font-medium italic">Sprint {settings.sprintNumber} • {daysRemaining} Days Remaining</Text>
            <View className="w-1 h-1 rounded-full bg-slate-500/30 dark:bg-slate-400/30" />
            <Pressable 
              accessibilityRole="button"
              accessibilityLabel="Open Overflow Concierge"
              onPress={() => {
                if (settings.hapticsEnabled) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                if (settings.isPremium) {
                  setOverflowDrawerVisible(true);
                } else {
                  router.push('/paywall');
                }
              }}
              className="flex-row items-center gap-1.5 active:opacity-75 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-md"
            >
              <Sparkles size={12} color={theme.primary} />
              <Text className="text-xs font-black uppercase tracking-wider text-primary">Overflow Concierge</Text>
            </Pressable>
            <View className="w-1 h-1 rounded-full bg-slate-500/30 dark:bg-slate-400/30" />
            <Pressable 
              accessibilityRole="button"
              onPress={() => setRetroVisible(true)}
              className="flex-row items-center gap-1.5 active:opacity-75 bg-red-500/10 dark:bg-red-950/20 px-2 py-0.5 rounded-full"
            >
              <Trophy size={10} color={theme.primary} />
              <Text className="text-xs font-black uppercase tracking-wider text-primary">End Sprint</Text>
            </Pressable>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          {settings.user && (
            <Animated.View 
              layout={LinearTransition.springify().damping(15)}
              className="flex-row items-center gap-1.5 bg-surface-container-highest px-3 py-2 rounded-full shadow-sm opacity-60"
            >
              {isSyncing ? (
                <RefreshCw size={12} color="#5b403e" />
              ) : (
                <Cloud size={12} color="#5b403e" />
              )}
              <Text className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                {isSyncing ? 'Syncing…' : 'Synced'}
              </Text>
            </Animated.View>
          )}
          <View className="flex-row items-center gap-4 bg-surface-container-highest px-4 py-2 rounded-full shadow-sm">
            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Completion</Text>
            <View className="w-24 md:w-32 h-2.5 bg-surface-container-high rounded-full overflow-hidden">
              <View className="h-full bg-primary" style={{ width: `${completionPercent}%` }}></View>
            </View>
            <Text className="text-sm font-black text-primary">{Math.round(completionPercent)}%</Text>
          </View>

          {/* Stunning Glassmorphic Dark/Light Toggle */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            onPress={() => {
              if (settings.hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              updateSettings({ darkMode: !settings.darkMode });
            }}
            className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant active:scale-95 shadow-sm overflow-hidden"
          >
            <Animated.View
              layout={LinearTransition.springify().damping(15)}
              key={isDark ? 'dark-icon' : 'light-icon'}
              entering={FadeInDown.duration(200)}
              exiting={FadeOutUp.duration(200)}
              className="items-center justify-center"
            >
              {isDark ? (
                <Moon size={18} color={theme.primary} fill={theme.primary} />
              ) : (
                <Sun size={18} color="#eab308" fill="#eab308" />
              )}
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* Burnout Capacity Status Banner (AI Capacity Guardian) */}
      <AdaptiveGlass
        style={{
          padding: 16,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: guardian.level === 'danger' ? (isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(182, 23, 34, 0.2)') : guardian.level === 'warning' ? (isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(128, 78, 0, 0.2)') : (isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0, 104, 95, 0.2)'),
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
          borderLeftWidth: 6,
          borderLeftColor: guardian.level === 'danger' ? (isDark ? '#ffb4a9' : '#b61722') : guardian.level === 'warning' ? (isDark ? '#ffb86f' : '#804e00') : (isDark ? '#51dbc9' : '#00685f'),
        }}
      >
        <View className={`p-3 rounded-2xl ${guardian.level === 'danger' ? 'bg-red-500/10 dark:bg-red-950/20' : guardian.level === 'warning' ? 'bg-amber-500/10 dark:bg-amber-950/20' : 'bg-teal-500/10 dark:bg-teal-950/20'}`}>
          <AlertTriangle color={guardian.level === 'danger' ? (isDark ? '#ffb4a9' : '#b61722') : guardian.level === 'warning' ? (isDark ? '#ffb86f' : '#804e00') : (isDark ? '#51dbc9' : '#00685f')} size={24} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={12} color={guardian.level === 'danger' ? (isDark ? '#ffb4a9' : '#b61722') : guardian.level === 'warning' ? (isDark ? '#ffb86f' : '#804e00') : (isDark ? '#51dbc9' : '#00685f')} />
            <Text className="font-bold text-on-surface text-base">
              {guardian.title}
            </Text>
          </View>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {guardian.message}
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${guardian.level === 'danger' ? 'bg-red-500/20 dark:bg-red-950/30' : guardian.level === 'warning' ? 'bg-amber-500/20 dark:bg-amber-950/30' : 'bg-teal-500/20 dark:bg-teal-950/30'}`}>
          <Text className={`font-black text-xs ${guardian.level === 'danger' ? 'text-primary' : guardian.level === 'warning' ? 'text-secondary' : 'text-tertiary'}`}>
            {totalPoints}/{settings.dailyCapacity} pts
          </Text>
        </View>
      </AdaptiveGlass>

      {/* Filter and Search Bar */}
      <AdaptiveGlass
        style={{
          padding: 14,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          marginBottom: 24,
          gap: 12,
          flexDirection: 'column',
        }}
      >
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center bg-surface-container/60 px-3.5 py-2 rounded-2xl border border-outline-variant/30">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search today's tasks..."
              placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
              className="flex-1 text-sm text-on-surface font-medium"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={16} color="#8a929b" />
              </Pressable>
            )}
          </View>

          {/* Sort order selector */}
          <Pressable
            onPress={() => {
              if (settings.hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setSortBy(prev => prev === 'none' ? 'points-high' : prev === 'points-high' ? 'points-low' : 'none');
            }}
            className="flex-row items-center gap-2 bg-surface-container/60 border border-outline-variant/30 px-3.5 py-2.5 rounded-2xl"
          >
            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sort: {sortBy === 'none' ? 'Default' : sortBy === 'points-high' ? 'Pts High' : 'Pts Low'}
            </Text>
          </Pressable>
        </View>

        {/* Scrollable Tag Chips */}
        {allTags.length > 0 && (
          <View className="flex-row items-center gap-2">
            <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-wider mr-1">Tags:</Text>
            <Animated.ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="flex-row"
              contentContainerStyle={{ gap: 6 }}
            >
              <Pressable
                onPress={() => {
                  if (settings.hapticsEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setSelectedTag(null);
                }}
                className={`px-3 py-1 rounded-full border ${selectedTag === null ? theme.tint + ' ' + theme.borderPrimary : 'bg-surface border-outline-variant/40'}`}
              >
                <Text className={`text-xs font-black uppercase ${selectedTag === null ? theme.textPrimary : 'text-slate-600 dark:text-slate-300'}`}>All</Text>
              </Pressable>
              {allTags.map(tag => (
                <Pressable
                  key={tag}
                  onPress={() => {
                     if (settings.hapticsEnabled) {
                       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                     }
                     setSelectedTag(prev => prev === tag ? null : tag);
                  }}
                  className={`px-3 py-1 rounded-full border ${selectedTag === tag ? theme.tint + ' ' + theme.borderPrimary : 'bg-surface border-outline-variant/40'}`}
                >
                  <Text className={`text-xs font-black ${selectedTag === tag ? theme.textPrimary : 'text-slate-600 dark:text-slate-300'}`}>#{tag}</Text>
                </Pressable>
              ))}
            </Animated.ScrollView>
          </View>
        )}
      </AdaptiveGlass>

      {/* Board Columns */}
      <View className="flex-1 flex-row gap-4">
        {COLUMNS.map(col => {
          const colTasks = displayedTasks.filter(t => t.priority === col.key);
          const Icon = col.icon;
          
          return (
            <AdaptiveGlass
              key={col.key}
              style={{
                backgroundColor: isDark 
                  ? (col.key === 'must' ? 'rgba(239, 68, 68, 0.12)' 
                     : col.key === 'should' ? 'rgba(217, 119, 6, 0.12)' 
                     : col.key === 'could' ? 'rgba(13, 148, 136, 0.12)' 
                     : 'rgba(30, 41, 59, 0.5)')
                  : (col.key === 'must' ? 'rgba(254, 242, 242, 0.65)' 
                     : col.key === 'should' ? 'rgba(255, 251, 235, 0.65)' 
                     : col.key === 'could' ? 'rgba(240, 253, 250, 0.65)' 
                     : 'rgba(255, 255, 255, 0.65)'),
                borderColor: isDark
                  ? (col.key === 'must' ? 'rgba(239, 68, 68, 0.25)' 
                     : col.key === 'should' ? 'rgba(217, 119, 6, 0.25)' 
                     : col.key === 'could' ? 'rgba(13, 148, 136, 0.25)' 
                     : 'rgba(255, 255, 255, 0.08)')
                  : (col.key === 'must' ? 'rgba(239, 68, 68, 0.2)' 
                     : col.key === 'should' ? 'rgba(217, 119, 6, 0.2)' 
                     : col.key === 'could' ? 'rgba(13, 148, 136, 0.2)' 
                     : 'rgba(255, 255, 255, 0.25)'),
                borderRadius: 24,
              }}
              className="flex flex-col p-3 border w-full md:w-[23%] md:min-w-[250px] min-h-[300px]"
            >
              <View className="flex-row items-center justify-between mb-4 px-2 pt-2">
                <View className="flex-row items-center gap-2">
                  <Icon size={20} color={col.key === 'must' ? (isDark ? '#ffb4a9' : '#b61722') : col.key === 'should' ? (isDark ? '#ffb86f' : '#804e00') : col.key === 'could' ? (isDark ? '#51dbc9' : '#00685f') : (isDark ? '#94a3b8' : '#64748b')} />
                  <Text className={`text-xl font-black ${col.color}`}>
                    {col.label}
                  </Text>
                </View>
                <View className={`px-3 py-1 rounded-full shadow-sm ${
                  col.key === 'must' ? 'bg-primary' :
                  col.key === 'should' ? 'bg-secondary' :
                  col.key === 'could' ? 'bg-tertiary' :
                  'bg-surface-container-high'
                }`}>
                  <Text className={`font-bold text-xs ${
                    col.key === 'must' ? 'text-on-primary' :
                    col.key === 'should' ? 'text-on-secondary' :
                    col.key === 'could' ? 'text-on-tertiary' :
                    'text-slate-650 dark:text-slate-300'
                  }`}>{colTasks.length}</Text>
                </View>
              </View>

              <View className="flex-col gap-3">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    col={col}
                    expandedTask={expandedTask}
                    setExpandedTask={setExpandedTask}
                    updateTask={updateTask}
                    handleZenMode={handleZenMode}
                    cyclePhase={cyclePhase}
                    getPhaseEmoji={getPhaseEmoji}
                    triggerConfetti={triggerConfetti}
                  />
                ))}
                {colTasks.length === 0 && (
                  <View className="py-8 items-center justify-center border-2 border-dashed border-outline-variant/60 rounded-2xl">
                     <Text className="text-xs font-bold text-slate-650 dark:text-slate-300 uppercase tracking-widest">No Tasks</Text>
                  </View>
                )}
              </View>
            </AdaptiveGlass>
          );
        })}
      </View>
    </SafeScreen>

    {/* Glowing AI floating button */}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open AI Triage"
      onPress={() => {
        if (settings.hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        if (settings.isPremium) {
          setAiDrawerVisible(true);
        } else {
          router.push('/paywall');
        }
      }}
      className="absolute bottom-6 right-6 bg-primary px-5 py-3 rounded-full flex-row items-center gap-2 shadow-xl border border-primary-container active:scale-95 focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none"
      style={{
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      <Sparkles size={16} color="white" />
      <Text className="text-on-primary font-black text-xs uppercase tracking-wider">AI Triage</Text>
    </Pressable>

    {/* AI Triage Sheet */}
    <AITriageDrawer 
      visible={aiDrawerVisible} 
      onClose={() => setAiDrawerVisible(false)} 
    />

    {/* Overflow Concierge Sheet */}
    <OverflowConciergeDrawer
      visible={overflowDrawerVisible}
      onClose={() => setOverflowDrawerVisible(false)}
    />

    {/* Retro Modal */}
    <DailyRetroModal 
      visible={retroVisible}
      onClose={() => setRetroVisible(false)}
      completedMusts={mustTasks.filter(t => t.completed).length}
      totalMusts={mustTasks.length}
      pointsBurned={completedPoints}
    />

    {/* Confetti Reward */}
    <ConfettiReward ref={confettiRef} />
  </View>
);
}


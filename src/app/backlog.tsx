import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { PlusCircle, X, Search, Trash2, Sparkles, ArrowDownCircle, ShieldAlert, CheckCircle2 } from 'lucide-react-native';
import { SwipeableCard } from '../components/SwipeableCard';
import { Task } from '../types';
import * as Haptics from 'expo-haptics';
import { useAccentTheme } from '../hooks/useAccentTheme';
import { AdaptiveGlass } from '../components/ui/AdaptiveGlass';
import { AISprintArchitectDrawer } from '../components/AISprintArchitectDrawer';

const BacklogItem = React.memo(function BacklogItem({ task }: { task: Task }) {
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const updateTask = useAppStore(state => state.updateTask);
  const deleteTask = useAppStore(state => state.deleteTask);
  return (
    <SwipeableCard
      leftAction={{
        icon: <PlusCircle size={20} color="white" />,
        label: 'Activate',
        backgroundColor: theme.primary || '#3b82f6',
        onTrigger: () => {
          updateTask(task.id, { status: 'today', priority: 'unsorted' });
        },
      }}
      rightAction={{
        icon: <Trash2 size={20} color="white" />,
        label: 'Delete',
        backgroundColor: '#ef4444',
        onTrigger: () => {
          deleteTask(task.id);
        },
      }}
      hapticsEnabled={useAppStore.getState().settings.hapticsEnabled}
    >
      <AdaptiveGlass
        isInteractive
        style={{
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.03)',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <View className="flex-1 mr-4 min-w-[200px]">
          <Text selectable={true} className="font-bold text-on-surface text-base">{task.title}</Text>
          {task.description ? (
            <Text selectable={true} className="text-xs text-slate-600 dark:text-slate-350 mt-1" numberOfLines={1}>{task.description}</Text>
          ) : null}
          <View className="flex-row items-center gap-2 mt-2 flex-wrap">
            <View className="bg-slate-200/40 dark:bg-slate-800/40 px-2.5 py-0.5 rounded-full">
              <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">{task.type || 'Uncategorized'}</Text>
            </View>
            {task.points ? (
              <View className={`${theme.tint} px-2.5 py-0.5 rounded-full`}>
                <Text className={`text-xs font-black ${theme.textPrimary}`}>{task.points} pts</Text>
              </View>
            ) : null}
            {task.tags?.map((tag, idx) => (
              <View key={idx} className="bg-slate-200/30 dark:bg-slate-800/30 border border-slate-200/20 dark:border-slate-800/20 px-2 py-0.5 rounded-full">
                <Text className="text-xs font-bold text-slate-650 dark:text-slate-300">#{tag}</Text>
              </View>
            ))}
            {task.rolloverCount !== undefined && task.rolloverCount > 0 && (
              <View className={
                task.rolloverCount === 1 
                  ? "bg-blue-500/10 dark:bg-blue-950/30 px-2 py-0.5 rounded-full border border-blue-500/20 flex-row items-center gap-0.5"
                  : task.rolloverCount === 2
                    ? "bg-amber-500/10 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-500/20 flex-row items-center gap-0.5"
                    : "bg-red-500/10 dark:bg-red-950/30 px-2 py-0.5 rounded-full border border-red-500/20 flex-row items-center gap-0.5"
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
        </View>
        <View className="bg-slate-200/40 dark:bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-200/30 dark:border-slate-800/30">
          <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">Unsorted</Text>
        </View>
      </AdaptiveGlass>
    </SwipeableCard>
  );
});

export default function BacklogPage() {
  const router = useRouter();
  const allTasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const tasks = useMemo(() => allTasks.filter(t => t.status === 'backlog'), [allTasks]);
  const activeTasks = useMemo(() => allTasks.filter(t => t.status !== 'archive'), [allTasks]);
  const staleTasks = useMemo(() => tasks.filter(t => (t.rolloverCount || 0) >= 2), [tasks]);
  const addTask = useAppStore(state => state.addTask);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState<number | null>(3);
  const [type, setType] = useState<Task['type']>('Feature');
  const [tagsInput, setTagsInput] = useState('');

  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const [architectTaskId, setArchitectTaskId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'none' | 'points-high' | 'points-low'>('none');
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Extract all unique tags in the backlog tasks
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    tasks.forEach(t => {
      t.tags?.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [tasks]);

  // Filter tasks list
  const filteredTasks = useMemo(() => {
    let list = tasks;

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
  }, [tasks, searchQuery, selectedTag, sortBy]);

  const handleCreate = () => {
    if (!title.trim()) return;
    if (activeTasks.length >= 10 && !settings.isPremium) {
      if (settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      Alert.alert(
        "Task Limit Reached",
        "Free tier is limited to 10 active tasks. Upgrade to Premium to enjoy unlimited active tasks, custom capacity, AI triage, and integrations!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "View Premium Plans", onPress: () => router.push('/paywall'), style: "default" }
        ]
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      points,
      type,
      status: 'backlog',
      priority: 'unsorted',
      tags: parsedTags,
    });
    // Reset form
    setTitle('');
    setDescription('');
    setPoints(3);
    setType('Feature');
    setTagsInput('');
    setShowAddForm(false);
  };

  const pointOptions = [1, 2, 3, 5, 8];
  const typeOptions: Task['type'][] = ['Feature', 'Bug', 'Tech Debt', 'Design', 'Security', 'Hotfix'];

  return (
    <SafeScreen className="flex-1 bg-background">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-4xl font-black text-on-surface tracking-tight">Backlog</Text>
        <Pressable 
          onPress={() => {
            if (!showAddForm && activeTasks.length >= 10 && !settings.isPremium) {
              if (settings.hapticsEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
              Alert.alert(
                "Task Limit Reached",
                "Free tier is limited to 10 active tasks. Upgrade to Premium to enjoy unlimited active tasks, custom capacity, AI triage, and integrations!",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "View Premium Plans", onPress: () => router.push('/paywall'), style: "default" }
                ]
              );
              return;
            }
            setShowAddForm(!showAddForm);
          }}
          className={`${showAddForm ? 'bg-surface-container-high border border-outline-variant' : 'bg-primary'} px-4 py-2 rounded-full flex-row items-center gap-2`}
        >
          {showAddForm ? (
            <>
              <X color="#b61722" size={16} />
              <Text className="text-primary font-bold">Cancel</Text>
            </>
          ) : (
            <>
              <PlusCircle color="white" size={16} />
              <Text className="text-on-primary font-bold">New Task</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Modern Add Task Form */}
      {showAddForm && (
        <AdaptiveGlass
          style={{
            padding: 20,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.3)' : '0 10px 25px rgba(0, 0, 0, 0.05)',
            marginBottom: 24,
          }}
        >
          <View className="gap-4">
             <View>
              <Text className="text-xs font-bold text-slate-600 dark:text-slate-350 uppercase tracking-widest mb-1.5">Task Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Implement dynamic widgets"
                placeholderTextColor={isDark ? '#cbd5e1' : '#475569'}
                className="bg-slate-200/40 dark:bg-slate-800/40 rounded-2xl px-4 py-3 text-on-surface font-bold text-sm border border-slate-200/20 dark:border-slate-800/20 focus:border-primary"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-slate-600 dark:text-slate-350 uppercase tracking-widest mb-1.5">Description (Optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Provide context or constraints"
                placeholderTextColor={isDark ? '#cbd5e1' : '#475569'}
                multiline
                numberOfLines={2}
                className="bg-slate-200/40 dark:bg-slate-800/40 rounded-2xl px-4 py-3 text-on-surface font-medium text-xs border border-slate-200/20 dark:border-slate-800/20 min-h-[60px]"
              />
            </View>

            <View>
              <Text className="text-xs font-black text-slate-600 dark:text-slate-350 uppercase tracking-widest mb-2 ml-1">Complexity (Fibonacci Points)</Text>
              <View className="flex-row gap-1.5 flex-wrap">
                {[1, 2, 3, 5, 8].map(p => {
                  const isPointSelected = points === p;
                  const effortLabel = p === 1 ? 'Tiny' : p === 2 ? 'Small' : p === 3 ? 'Medium' : p === 5 ? 'Large' : 'Epic';
                  return (
                    <Pressable
                      key={p}
                      onPress={() => {
                        if (settings.hapticsEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        setPoints(p);
                      }}
                      style={isPointSelected ? { backgroundColor: theme.primary + '15', borderColor: theme.primary } : undefined}
                      className={`flex-1 min-w-[50px] py-2.5 rounded-2xl border active:scale-95 flex-col justify-center items-center ${isPointSelected ? 'border-primary' : 'bg-slate-200/30 dark:bg-slate-800/30 border-slate-200/20 dark:border-slate-800/20'}`}
                    >
                      <Text style={isPointSelected ? { color: theme.primary } : undefined} className={`font-black text-sm ${isPointSelected ? '' : 'text-slate-600 dark:text-slate-300'}`}>
                        {p}pt
                      </Text>
                      <Text style={isPointSelected ? { color: theme.primary } : undefined} className={`text-[8px] font-black uppercase tracking-wider ${isPointSelected ? 'opacity-80' : 'text-slate-555'}`}>
                        {effortLabel}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => {
                    if (settings.hapticsEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setPoints(null);
                  }}
                  style={points === null ? { backgroundColor: theme.primary + '15', borderColor: theme.primary } : undefined}
                  className={`flex-1 min-w-[50px] py-2.5 rounded-2xl border active:scale-95 flex-col justify-center items-center ${points === null ? 'border-primary' : 'bg-slate-200/30 dark:bg-slate-800/30 border-slate-200/20 dark:border-slate-800/20'}`}
                >
                  <Text style={points === null ? { color: theme.primary } : undefined} className={`font-black text-sm ${points === null ? '' : 'text-slate-600 dark:text-slate-300'}`}>
                    ?
                  </Text>
                  <Text style={points === null ? { color: theme.primary } : undefined} className={`text-[8px] font-black uppercase tracking-wider ${points === null ? 'opacity-80' : 'text-slate-555'}`}>
                    TBD
                  </Text>
                </Pressable>
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold text-slate-600 dark:text-slate-350 uppercase tracking-widest mb-2">Category Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {typeOptions.map(t => (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    className={`px-3 py-1.5 rounded-full border ${type === t ? 'bg-amber-600/15 dark:bg-amber-950/40 border-secondary' : 'bg-slate-200/30 dark:bg-slate-800/30 border-slate-200/20 dark:border-slate-800/20'}`}
                  >
                    <Text className={`text-xs font-bold ${type === t ? 'text-secondary font-black' : 'text-slate-600 dark:text-slate-300'}`}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-xs font-black text-slate-600 dark:text-slate-350 uppercase tracking-widest mb-1.5 ml-1">Tags (Comma-separated)</Text>
              
              {/* Tag Quick Picker */}
              <View className="flex-row flex-wrap gap-1.5 mb-2.5">
                {['Work', 'Life', 'Refactor', 'Design', 'Urgent'].map(tag => {
                  const activeTags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
                  const isSelected = activeTags.includes(tag.toLowerCase());
                  
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => {
                        if (settings.hapticsEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        const currentTags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
                        const exists = currentTags.some(t => t.toLowerCase() === tag.toLowerCase());
                        if (exists) {
                          const filtered = currentTags.filter(t => t.toLowerCase() !== tag.toLowerCase());
                          setTagsInput(filtered.join(', '));
                        } else {
                          setTagsInput([...currentTags, tag].join(', '));
                        }
                      }}
                      style={isSelected ? { backgroundColor: theme.primary + '15', borderColor: theme.primary } : undefined}
                      className={`px-3 py-1.5 rounded-full border active:scale-95 ${
                        isSelected ? 'border-primary' : 'bg-slate-200/30 dark:bg-slate-800/30 border-slate-200/20 dark:border-slate-800/20'
                      }`}
                    >
                      <Text style={isSelected ? { color: theme.primary } : undefined} className={`text-xs font-black ${isSelected ? '' : 'text-slate-600 dark:text-slate-300'}`}>
                        #{tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="e.g. Work, Refactor, Design"
                placeholderTextColor={isDark ? '#cbd5e1' : '#475569'}
                className="bg-slate-200/40 dark:bg-slate-800/40 rounded-2xl px-4 py-3 text-on-surface font-medium text-xs border border-slate-200/20 dark:border-slate-800/20"
              />
            </View>

            <Pressable
              onPress={handleCreate}
              disabled={!title.trim()}
              className={`w-full py-3.5 rounded-2xl items-center justify-center ${title.trim() ? 'bg-primary' : 'bg-red-500/30 dark:bg-red-950/40 opacity-55'}`}
            >
              <Text className="text-on-primary font-black text-sm uppercase tracking-wider">Add to Backlog</Text>
            </Pressable>
          </View>
        </AdaptiveGlass>
      )}

      {activeTasks.length >= 10 && !settings.isPremium && (
        <View className="bg-red-500/10 dark:bg-red-950/20 border border-red-200/30 dark:border-red-900/30 p-4 rounded-2xl mb-6 flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="font-bold text-primary text-sm">Active Task Limit Reached (10/10)</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upgrade to Premium for unlimited tasks and advanced features.</Text>
          </View>
          <Pressable 
            onPress={() => router.push('/paywall')}
            className="bg-primary px-3 py-1.5 rounded-full active:opacity-85"
          >
            <Text className="text-xs font-black text-on-primary uppercase tracking-wider">Upgrade</Text>
          </Pressable>
        </View>
      )}

      {/* Backlog Friction Optimizer */}
      <AdaptiveGlass
        style={{
          padding: 20,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark 
            ? (staleTasks.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)') 
            : (staleTasks.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'),
          boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.3)' : '0 10px 25px rgba(0, 0, 0, 0.05)',
          marginBottom: 24,
          backgroundColor: isDark 
            ? (staleTasks.length > 0 ? 'rgba(239, 68, 68, 0.03)' : 'rgba(34, 197, 94, 0.03)')
            : (staleTasks.length > 0 ? 'rgba(239, 68, 68, 0.01)' : 'rgba(34, 197, 94, 0.01)'),
        }}
      >
        {staleTasks.length > 0 ? (
          <View>
            <View className="flex-row items-center gap-3 mb-3">
              <View className="p-2 bg-red-500/10 dark:bg-red-950/30 rounded-full">
                <ShieldAlert size={20} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black text-on-surface tracking-tight">🚨 Backlog Friction Optimizer</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  These tasks have repeatedly rolled over active sprints, causing velocity decay. Triage them to restore momentum.
                </Text>
              </View>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="mt-2"
              contentContainerStyle={{ gap: 14, paddingBottom: 4 }}
            >
              {staleTasks.map(task => {
                const isCritical = (task.rolloverCount || 0) >= 3;
                return (
                  <View 
                    key={task.id}
                    className="w-[280px] bg-slate-200/25 dark:bg-slate-800/25 border border-slate-200/20 dark:border-slate-800/20 p-4 rounded-2xl flex-col gap-3"
                  >
                    <View>
                      <View className="flex-row justify-between items-start gap-2 mb-1.5">
                        <Text className="text-xs font-black text-on-surface flex-1" numberOfLines={1}>
                          {task.title}
                        </Text>
                        <View className="bg-slate-200/40 dark:bg-slate-800/40 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-black text-slate-650 dark:text-slate-355">{task.points || '?'} pts</Text>
                        </View>
                      </View>
                      
                      <View className="flex-row">
                        <View className={`px-2 py-0.5 rounded-full flex-row items-center gap-1 ${isCritical ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                          <Text className="text-[10px]">{isCritical ? '🔥' : '⚡'}</Text>
                          <Text className={`text-[10px] font-black uppercase tracking-wider ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>
                            {isCritical ? `Friction x${task.rolloverCount}` : 'Stale Task'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Quick-action buttons */}
                    <View className="flex-row gap-2 border-t border-slate-250/20 dark:border-slate-700/20 pt-2.5">
                      <Pressable
                        onPress={() => {
                          if (settings.hapticsEnabled) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }
                          useAppStore.getState().updateTask(task.id, { priority: 'wont' });
                        }}
                        className="flex-1 py-2 bg-slate-200/40 dark:bg-slate-850/40 border border-slate-300/10 dark:border-slate-800/10 rounded-xl flex-row items-center justify-center gap-1 active:opacity-75"
                      >
                        <ArrowDownCircle size={12} color="#8a929b" />
                        <Text className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Won\'t</Text>
                      </Pressable>

                      {task.points && task.points >= 3 ? (
                        <Pressable
                          onPress={() => {
                            if (settings.hapticsEnabled) {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            }
                            setArchitectTaskId(task.id);
                            setIsArchitectOpen(true);
                          }}
                          className="flex-1 py-2 bg-primary/10 border border-primary/20 rounded-xl flex-row items-center justify-center gap-1 active:opacity-75"
                        >
                          <Sparkles size={12} color={theme.primary} />
                          <Text className="text-[9px] font-black uppercase tracking-widest" style={{ color: theme.primary }}>Split</Text>
                        </Pressable>
                      ) : null}

                      <Pressable
                        onPress={() => {
                          if (settings.hapticsEnabled) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }
                          useAppStore.getState().deleteTask(task.id);
                        }}
                        className="flex-1 py-2 bg-red-500/10 border border-red-500/25 rounded-xl flex-row items-center justify-center gap-1 active:opacity-75"
                      >
                        <Trash2 size={12} color="#ef4444" />
                        <Text className="text-[9px] font-black text-red-500 uppercase tracking-widest">Dump</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <View className="p-2 bg-green-500/10 dark:bg-green-950/30 rounded-full">
              <CheckCircle2 size={20} color="#22c55e" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-on-surface tracking-tight">✨ Backlog Health: Pristine</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                No stale or high-rollover tasks found. Your backlog velocity and planning agility are perfectly healthy!
              </Text>
            </View>
          </View>
        )}
      </AdaptiveGlass>

      {/* Filter and Search Bar */}
      <AdaptiveGlass
        style={{
          padding: 14,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.03)',
          marginBottom: 24,
        }}
      >
        <View className="gap-3 flex-col">
          <View className="flex-row items-center gap-3">
            <View className="flex-1 flex-row items-center bg-slate-200/40 dark:bg-slate-800/40 px-3.5 py-2 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search backlog..."
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
              className="flex-row items-center gap-2 bg-slate-200/40 dark:bg-slate-800/40 border border-slate-200/20 dark:border-slate-800/20 px-3.5 py-2.5 rounded-2xl"
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
              <ScrollView 
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
                  className={`px-3 py-1 rounded-full border ${selectedTag === null ? theme.tint + ' ' + theme.borderPrimary : 'bg-slate-200/30 dark:bg-slate-800/30 border-slate-200/20 dark:border-slate-800/20'}`}
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
                    className={`px-3 py-1 rounded-full border ${selectedTag === tag ? theme.tint + ' ' + theme.borderPrimary : 'bg-slate-200/30 dark:bg-slate-800/30 border-slate-200/20 dark:border-slate-800/20'}`}
                  >
                    <Text className={`text-xs font-black ${selectedTag === tag ? theme.textPrimary : 'text-slate-600 dark:text-slate-300'}`}>#{tag}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </AdaptiveGlass>

      {/* Task List */}
      <View className="flex-col gap-4">
        {filteredTasks.map(task => (
            <BacklogItem key={task.id} task={task} />
        ))}
        {filteredTasks.length === 0 && (
            <View className="py-16 items-center justify-center border-2 border-dashed border-outline-variant/60 rounded-3xl bg-surface-container/20">
                <Text className="text-slate-500 dark:text-slate-400 font-bold text-sm">No matching tasks found!</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try resetting your search filters.</Text>
            </View>
        )}
      </View>

      <AISprintArchitectDrawer
        isOpen={isArchitectOpen}
        onClose={() => {
          setIsArchitectOpen(false);
          setArchitectTaskId(null);
        }}
        initialTaskId={architectTaskId}
      />
    </SafeScreen>
  );
}

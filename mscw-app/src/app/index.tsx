import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useAppStore } from '../store';
import { Priority, Task } from '../types';
import { SafeScreen } from '../components/SafeScreen';
import Animated, { LinearTransition, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { 
  Flame, 
  CheckCircle2, 
  PlusCircle, 
  CloudSnow, 
  Database, 
  ShieldCheck, 
  Monitor, 
  Sparkle,
  AlertTriangle,
  RefreshCw,
  Cloud
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';

const COLUMNS: { key: Priority; label: string; icon: any; color: string; tint: string }[] = [
  { key: 'must', label: 'Must', icon: Flame, color: 'text-primary', tint: 'bg-primary/10' },
  { key: 'should', label: 'Should', icon: CheckCircle2, color: 'text-secondary', tint: 'bg-secondary/10' },
  { key: 'could', label: 'Could', icon: PlusCircle, color: 'text-tertiary', tint: 'bg-tertiary/10' },
  { key: 'wont', label: 'Won\'t', icon: CloudSnow, color: 'text-on-surface-variant', tint: 'bg-surface-variant/20' },
];

export default function BoardPage() {
  const tasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const isSyncing = useAppStore(state => state.isSyncing);
  const updateTask = useAppStore(state => state.updateTask);
  const router = useRouter();
  
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleZenMode = async (taskId: string) => {
    try {
      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: 'premium'
      });
      // If the user already has premium, NOT_PRESENTED is returned.
      // If they successfully buy it, PURCHASED is returned.
      if (paywallResult === RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED || paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED) {
        router.push(`/zen?id=${taskId}`);
      }
    } catch (e) {
      console.error("Paywall Error:", e);
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

  const boardTasks = tasks.filter(t => t.status === 'board');
  
  const completedPoints = boardTasks.reduce((sum, t) => sum + (t.completed ? (t.points || 0) : 0), 0);
  const totalPoints = boardTasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const completionPercent = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0; 
  const isOverCapacity = totalPoints > settings.dailyCapacity;

  const getIcon = (type?: string) => {
    if (type === 'Tech Debt') return Database;
    if (type === 'Hotfix') return Flame;
    if (type === 'Security') return ShieldCheck;
    if (type === 'Design') return Sparkle;
    return Monitor;
  };

  return (
    <SafeScreen className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row justify-between items-start mb-6 flex-wrap gap-4">
        <View>
          <Text className="text-4xl font-black text-on-surface tracking-tight">Daily Board</Text>
          <Text className="text-on-surface-variant mt-1 font-medium italic">Sprint 42 • 3 Days Remaining</Text>
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
              <Text className="text-[10px] font-black uppercase text-on-surface-variant">
                {isSyncing ? 'Syncing...' : 'Synced'}
              </Text>
            </Animated.View>
          )}
          <View className="flex-row items-center gap-4 bg-surface-container-highest px-4 py-2 rounded-full shadow-sm">
            <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Completion</Text>
            <View className="w-24 md:w-32 h-2.5 bg-surface-variant rounded-full overflow-hidden">
              <View className="h-full bg-primary" style={{ width: `${completionPercent}%` }}></View>
            </View>
            <Text className="text-sm font-black text-primary">{Math.round(completionPercent)}%</Text>
          </View>
        </View>
      </View>

      {/* Burnout Capacity Status Banner */}
      <View className={`mb-6 p-4 rounded-3xl border flex-row items-center gap-4 ${isOverCapacity ? 'bg-primary/5 border-primary/20' : 'bg-tertiary/5 border-tertiary/20'}`}>
        <View className={`p-3 rounded-2xl ${isOverCapacity ? 'bg-primary/10' : 'bg-tertiary/10'}`}>
          <AlertTriangle color={isOverCapacity ? '#b61722' : '#00685f'} size={24} />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-on-surface text-base">
            {isOverCapacity ? 'Burnout Risk Detected' : 'Healthy Target Zone'}
          </Text>
          <Text className="text-xs text-on-surface-variant mt-0.5">
            {isOverCapacity 
              ? `You've scheduled ${totalPoints} points, which exceeds your limits (${settings.dailyCapacity} pts). Move some to Backlog.`
              : `You are at ${totalPoints} of your ${settings.dailyCapacity} point maximum limit. Stay focused and avoid additions.`}
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${isOverCapacity ? 'bg-primary/20' : 'bg-tertiary/20'}`}>
          <Text className={`font-black text-xs ${isOverCapacity ? 'text-primary' : 'text-tertiary'}`}>
            {totalPoints}/{settings.dailyCapacity} pts
          </Text>
        </View>
      </View>

      {/* Grid Columns */}
      <View className="flex-row flex-wrap gap-6 items-start">
        {COLUMNS.map((col) => {
          const colTasks = boardTasks.filter(t => t.priority === col.key);
          const Icon = col.icon;
          
          return (
            <View key={col.key} className={`flex flex-col rounded-3xl p-3 border w-full md:w-[23%] md:min-w-[250px] min-h-[300px] ${col.tint} ${col.key === 'must' ? 'border-primary/20' : 'border-outline-variant/30'}`}>
              <View className="flex-row items-center justify-between mb-4 px-2 pt-2">
                <View className="flex-row items-center gap-2">
                  <Icon size={20} color={col.key !== 'wont' ? (col.key === 'must' ? '#b61722' : col.key === 'should' ? '#855300' : '#00685f') : '#5b403e'} />
                  <Text className={`text-xl font-black ${col.color}`}>
                    {col.label}
                  </Text>
                </View>
                <View className={`px-3 py-1 rounded-full shadow-sm ${col.key === 'wont' ? 'bg-on-surface-variant' : col.color.replace('text-', 'bg-')}`}>
                  <Text className="text-on-primary font-bold text-[10px]">{colTasks.length}</Text>
                </View>
              </View>

              <View className="flex-col gap-3">
                {colTasks.map((task) => {
                  const TypeIcon = getIcon(task.type);
                  return (
                    <Animated.View
                      key={task.id}
                      layout={LinearTransition.springify().damping(14)}
                      entering={FadeInDown.springify().damping(14)}
                      exiting={FadeOutUp.duration(200)}
                    >
                      <View className={`bg-surface-container-lowest rounded-2xl border border-outline-variant p-4 shadow-sm ${task.completed ? "opacity-50" : ""} ${col.key === 'must' ? 'border-l-4 border-l-primary' : ''} ${col.key === 'should' ? 'border-l-4 border-l-secondary' : ''} ${col.key === 'could' ? 'border-l-4 border-l-tertiary' : ''} ${col.key === 'wont' ? 'opacity-60 bg-surface/60' : ''}`}>
                        <View className="flex-row items-start gap-3">
                          <Pressable 
                            onPress={() => updateTask(task.id, { completed: !task.completed })}
                            className={`mt-1 h-5 w-5 rounded-md border items-center justify-center ${task.completed ? 'bg-primary border-primary' : 'border-outline'}`}
                          >
                            {task.completed && <CheckCircle2 size={12} color="white" />}
                          </Pressable>
                          <View className="flex-1">
                            <Pressable onPress={() => handleZenMode(task.id)}>
                              <Text className={`font-bold text-on-surface leading-tight mb-3 ${task.completed || task.priority === 'wont' ? 'line-through' : ''}`}>
                                {task.title}
                              </Text>
                            </Pressable>
                            
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center gap-2">
                                <View className="flex-row items-center gap-1">
                                  <TypeIcon size={12} color="#5b403e" />
                                  <Text className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                    {task.type || 'Backend'}
                                  </Text>
                                </View>
                                
                                <Pressable 
                                  onPress={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                                  className="bg-surface-variant/30 px-2 py-0.5 rounded-full flex-row items-center gap-1"
                                >
                                  <Text className="text-[10px] font-bold text-on-surface-variant">
                                    {task.subtasks?.length ? `${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length} subtasks` : '+ subtask'}
                                  </Text>
                                </Pressable>
                              </View>
                              
                              <View className="flex-row items-center gap-2">
                                <Pressable 
                                  onPress={() => cyclePhase(task.id, task.phase)}
                                  className={`px-2 py-0.5 rounded-full border ${task.phase ? 'bg-secondary/10 border-secondary/30' : 'bg-transparent border-outline-variant/50'}`}
                                >
                                  <Text className={`font-bold text-[9px] ${task.phase ? 'text-secondary' : 'text-on-surface-variant/70'}`}>
                                    {getPhaseEmoji(task.phase)}
                                  </Text>
                                </Pressable>

                                <View className={`px-2 py-0.5 rounded ${col.key !== 'wont' ? col.tint : 'bg-surface-container'}`}>
                                  <Text className={`font-black text-[10px] ${col.key !== 'wont' ? col.color : 'text-on-surface-variant'}`}>
                                    {task.points} pts
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Expandable Subtasks Section */}
                            {expandedTask === task.id && (
                              <Animated.View entering={FadeInDown.duration(200)} className="mt-4 pt-3 border-t border-outline-variant/30 gap-2">
                                {task.subtasks?.map(subtask => (
                                  <Pressable 
                                    key={subtask.id}
                                    onPress={() => {
                                      const updatedSubtasks = task.subtasks?.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s);
                                      updateTask(task.id, { subtasks: updatedSubtasks });
                                    }}
                                    className="flex-row items-center gap-2 py-1"
                                  >
                                    <View className={`h-4 w-4 rounded-md border items-center justify-center ${subtask.completed ? 'bg-on-surface-variant border-on-surface-variant' : 'border-outline-variant'}`}>
                                      {subtask.completed && <CheckCircle2 size={10} color="white" />}
                                    </View>
                                    <Text className={`text-xs flex-1 ${subtask.completed ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                                      {subtask.title}
                                    </Text>
                                  </Pressable>
                                ))}
                                
                                <View className="flex-row items-center gap-2 mt-1">
                                  <TextInput
                                    value={newSubtaskTitle}
                                    onChangeText={setNewSubtaskTitle}
                                    placeholder="Add subtask..."
                                    placeholderTextColor="#899197"
                                    className="flex-1 bg-surface-variant/20 px-3 py-1.5 rounded-md text-xs text-on-surface"
                                    onSubmitEditing={() => {
                                      if (newSubtaskTitle.trim()) {
                                        const newSubtask = { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false };
                                        updateTask(task.id, { subtasks: [...(task.subtasks || []), newSubtask] });
                                        setNewSubtaskTitle('');
                                      }
                                    }}
                                  />
                                </View>
                              </Animated.View>
                            )}

                          </View>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
                {colTasks.length === 0 && (
                  <View className="py-8 items-center justify-center border-2 border-dashed border-outline-variant/20 rounded-2xl">
                     <Text className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">No Tasks</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </SafeScreen>
  );
}


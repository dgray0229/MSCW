import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Dimensions, TextInput } from 'react-native';
import { useAppStore } from '../store';
import { useAccentTheme } from '../hooks/useAccentTheme';
import { Sparkles, X, ChevronRight, Check, Layers, AlertCircle, Wrench } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Task } from '../types';

interface AISprintArchitectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTaskId?: string | null;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AISprintArchitectDrawer({ isOpen, onClose, initialTaskId }: AISprintArchitectDrawerProps) {
  const theme = useAccentTheme();
  const tasks = useAppStore(state => state.tasks);
  const addTask = useAppStore(state => state.addTask);
  const deleteTask = useAppStore(state => state.deleteTask);

  // Filter for uncompleted tasks with points >= 3
  const decomposableTasks = tasks.filter(t => !t.completed && t.points && t.points >= 3 && t.status !== 'archive');

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'preview'>('select');
  const [decomposedSubtasks, setDecomposedSubtasks] = useState<{ title: string; points: number; type: Task['type'] }[]>([]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Animated Slide Up
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      if (initialTaskId) {
        // Pre-select task logic
        const task = tasks.find(t => t.id === initialTaskId);
        if (task) {
          setSelectedTaskId(initialTaskId);
          const total = task.points || 3;
          let p1 = 2, p2 = 2, p3 = 1; // default for 5
          if (total === 3) {
            p1 = 1; p2 = 1; p3 = 1;
          } else if (total === 8) {
            p1 = 3; p2 = 3; p3 = 2;
          } else if (total === 13) {
            p1 = 5; p2 = 5; p3 = 3;
          } else {
            p1 = Math.ceil(total * 0.4);
            p2 = Math.ceil((total - p1) * 0.5);
            p3 = total - p1 - p2;
          }
          setDecomposedSubtasks([
            { title: `[Phase 1] Technical Spec & Architecture: ${task.title}`, points: p1, type: task.type || 'Feature' },
            { title: `[Phase 2] Core Implementation & Logic: ${task.title}`, points: p2, type: task.type || 'Feature' },
            { title: `[Phase 3] Integration Testing & QA Polish: ${task.title}`, points: p3, type: task.type || 'Feature' }
          ]);
          setStep('preview');
        } else {
          setSelectedTaskId(null);
          setStep('select');
        }
      } else {
        // Reset State
        setSelectedTaskId(null);
        setStep('select');
      }
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 30,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isOpen, initialTaskId]);

  const handleSelectTask = (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.points) return;

    setSelectedTaskId(taskId);
    
    // Generate AI Decomposed Subtasks
    const total = task.points;
    let p1 = 2, p2 = 2, p3 = 1; // default for 5
    if (total === 3) {
      p1 = 1; p2 = 1; p3 = 1;
    } else if (total === 8) {
      p1 = 3; p2 = 3; p3 = 2;
    } else if (total === 13) {
      p1 = 5; p2 = 5; p3 = 3;
    } else {
      p1 = Math.ceil(total * 0.4);
      p2 = Math.ceil((total - p1) * 0.5);
      p3 = total - p1 - p2;
    }

    setDecomposedSubtasks([
      { title: `[Phase 1] Technical Spec & Architecture: ${task.title}`, points: p1, type: task.type || 'Feature' },
      { title: `[Phase 2] Core Implementation & Logic: ${task.title}`, points: p2, type: task.type || 'Feature' },
      { title: `[Phase 3] Integration Testing & QA Polish: ${task.title}`, points: p3, type: task.type || 'Feature' }
    ]);
    
    setStep('preview');
  };

  const handleApplyDecomposition = () => {
    if (!selectedTask) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 1. Delete original parent task
    deleteTask(selectedTask.id);

    // 2. Add new smaller subtasks, inheriting tags, priority and board status
    decomposedSubtasks.forEach(sub => {
      addTask({
        title: sub.title,
        description: `Split from: "${selectedTask.title}" using AI Sprint Architect.`,
        points: sub.points,
        priority: selectedTask.priority,
        status: selectedTask.status,
        type: sub.type,
        tags: selectedTask.tags || [],
      });
    });

    onClose();
  };

  const updateSubtaskTitle = (index: number, text: string) => {
    const updated = [...decomposedSubtasks];
    updated[index].title = text;
    setDecomposedSubtasks(updated);
  };

  const adjustSubtaskPoints = (index: number, delta: number) => {
    Haptics.selectionAsync();
    const updated = [...decomposedSubtasks];
    const newPoints = Math.max(1, updated[index].points + delta);
    updated[index].points = newPoints;
    setDecomposedSubtasks(updated);
  };

  if (!isOpen) return null;

  return (
    <View className="absolute inset-0 z-50 flex-col justify-end">
      {/* Backdrop */}
      <AnimatedPressable 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onClose();
        }}
        className="absolute inset-0 bg-black"
        style={{ opacity: fadeAnim }}
      />

      {/* Drawer Body */}
      <Animated.View 
        style={{
          transform: [{ translateY: slideAnim }],
          height: SCREEN_HEIGHT * 0.85,
        }}
        className="w-full bg-surface-container-highest rounded-t-[32px] border-t border-outline-variant/30 flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-5 border-b border-outline-variant/15">
          <View className="flex-row items-center gap-2.5">
            <View className="p-2 bg-primary/10 rounded-full" style={{ backgroundColor: theme.primary + '1a' }}>
              <Sparkles size={18} color={theme.primary} />
            </View>
            <View>
              <Text className="text-lg font-black text-on-surface tracking-tight">AI Sprint Architect</Text>
              <Text className="text-xs uppercase font-black tracking-widest text-slate-600 dark:text-slate-300">Cognitive Point Decomposer</Text>
            </View>
          </View>
          <Pressable onPress={onClose} className="p-2 bg-surface-variant/30 rounded-full active:opacity-75">
            <X size={18} color="#191c20" />
          </Pressable>
        </View>

        {/* Content */}
        {step === 'select' ? (
          <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
            <View className="bg-primary/5 p-4 rounded-2xl border border-primary/20 flex-row gap-3 mb-6" style={{ backgroundColor: theme.primary + '0a', borderColor: theme.primary + '33' }}>
              <AlertCircle size={20} color={theme.primary} className="mt-0.5" />
              <View className="flex-1">
                <Text className="font-bold text-xs" style={{ color: theme.primary }}>Prevent Cognitive Overload</Text>
                <Text className="text-xs text-slate-650 dark:text-slate-300 mt-1 leading-normal">
                  Large items (5+ points) create planning friction and increase task blockages. Split them into highly focused milestone tracks.
                </Text>
              </View>
            </View>

            <Text className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-350 mb-3">Decomposable Active Tasks</Text>
            
            {decomposableTasks.length > 0 ? (
              <View className="gap-3 pb-12">
                {decomposableTasks.map(task => {
                  const isHighFriction = task.points && task.points >= 5;
                  return (
                    <Pressable
                      key={task.id}
                      onPress={() => handleSelectTask(task.id)}
                      className={`p-4 rounded-2xl border bg-surface flex-row items-center justify-between shadow-sm active:opacity-90 ${isHighFriction ? 'border-primary/40' : 'border-outline-variant/30'}`}
                      style={isHighFriction ? { borderColor: theme.primary + '55' } : {}}
                    >
                      <View className="flex-1 mr-4">
                        <Text className="font-bold text-sm text-on-surface mb-1">{task.title}</Text>
                        <View className="flex-row items-center gap-2">
                          <View className="bg-surface-container-high px-2 py-0.5 rounded-full">
                            <Text className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{task.priority}</Text>
                          </View>
                          <View className="bg-surface-container-high px-2 py-0.5 rounded-full">
                            <Text className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{task.type}</Text>
                          </View>
                        </View>
                      </View>
                      
                      <View className="flex-row items-center gap-2">
                        {isHighFriction && (
                          <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + '1a' }}>
                            <Text className="text-xs font-black uppercase tracking-wider" style={{ color: theme.primary }}>Friction Warning</Text>
                          </View>
                        )}
                        <View className="px-2.5 py-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-low flex-row items-center gap-1">
                          <Text className="font-black text-xs text-on-surface">{task.points}</Text>
                          <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">pts</Text>
                        </View>
                        <ChevronRight size={16} color="#73777f" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View className="py-16 items-center justify-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-low/20">
                <Text className="text-slate-600 dark:text-slate-300 font-bold text-xs">No massive tasks active</Text>
                <Text className="text-xs text-slate-650 dark:text-slate-400 mt-1 text-center px-6">
                  Only tasks in your active boards with 3 or more points can be decomposed by the AI Coach.
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View className="flex-1 flex-col justify-between">
            <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
              
              {/* Parent Task Overview Card */}
              <View className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 mb-5 flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-350 mb-1">Decomposing Task</Text>
                  <Text className="font-bold text-sm text-on-surface">{selectedTask?.title}</Text>
                </View>
                <View className="px-3 py-2 rounded-xl flex-row items-center gap-1" style={{ backgroundColor: theme.primary + '1a' }}>
                  <Text className="font-black text-sm" style={{ color: theme.primary }}>{selectedTask?.points}</Text>
                  <Text className="text-xs font-bold" style={{ color: theme.primary }}>pts</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2 mb-4">
                <Wrench size={14} color={theme.primary} />
                <Text className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-350">AI Engineered Decomposition</Text>
              </View>

              {/* Subtask Editor List */}
              <View className="gap-3.5 pb-8">
                {decomposedSubtasks.map((sub, index) => (
                  <View key={index} className="p-4 rounded-2xl border border-outline-variant/30 bg-surface flex-col gap-3 shadow-sm">
                    <View className="flex-row justify-between items-center">
                      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + '10' }}>
                        <Text className="text-xs font-black uppercase tracking-wider" style={{ color: theme.primary }}>Phase {index + 1}</Text>
                      </View>
                      
                      {/* Subtask Point Controls */}
                      <View className="flex-row items-center bg-surface-container-high rounded-xl border border-outline-variant/20 overflow-hidden">
                        <Pressable 
                          onPress={() => adjustSubtaskPoints(index, -1)}
                          className="w-7 h-7 items-center justify-center active:bg-surface-variant/40"
                        >
                          <Text className="font-bold text-xs text-slate-500 dark:text-slate-400">-</Text>
                        </Pressable>
                        <View className="px-2 h-7 justify-center border-x border-outline-variant/10">
                          <Text className="font-black text-xs text-on-surface">{sub.points} pts</Text>
                        </View>
                        <Pressable 
                          onPress={() => adjustSubtaskPoints(index, 1)}
                          className="w-7 h-7 items-center justify-center active:bg-surface-variant/40"
                        >
                          <Text className="font-bold text-xs text-slate-500 dark:text-slate-400">+</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Subtask Title Input */}
                    <TextInput
                      value={sub.title}
                      onChangeText={(text) => updateSubtaskTitle(index, text)}
                      className="text-xs font-bold text-on-surface bg-surface-container-low p-3 rounded-xl border border-outline-variant/25"
                      multiline={false}
                      placeholder="Subtask description..."
                    />
                  </View>
                ))}
              </View>

              {/* Validation Summary */}
              {(() => {
                const totalDecomposed = decomposedSubtasks.reduce((sum, s) => sum + s.points, 0);
                const originalPoints = selectedTask?.points || 0;
                const balanceDiff = totalDecomposed - originalPoints;
                return (
                  <View className={`p-4 rounded-2xl border flex-row items-center gap-3 mb-10 ${balanceDiff === 0 ? 'bg-success/5 border-success/30' : 'bg-warning/5 border-warning/30'}`}>
                    <Check size={18} color={balanceDiff === 0 ? '#1b6b3e' : '#b06000'} />
                    <View className="flex-1">
                      <Text className={`font-black text-xs uppercase tracking-wider ${balanceDiff === 0 ? 'text-success' : 'text-warning'}`}>
                        {balanceDiff === 0 ? 'Capacity Balance Correct' : 'Capacity Skew Warning'}
                      </Text>
                      <Text className="text-xs text-slate-650 dark:text-slate-300 mt-0.5">
                        Decomposed total is **{totalDecomposed} pts** (Original task was **{originalPoints} pts**). {balanceDiff === 0 ? 'Points map perfectly!' : `Points skew by ${balanceDiff > 0 ? '+' : ''}${balanceDiff} pts.`}
                      </Text>
                    </View>
                  </View>
                );
              })()}

            </ScrollView>

            {/* Bottom Actions */}
            <View className="px-6 py-5 border-t border-outline-variant/15 flex-row gap-3 bg-surface-container-highest">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep('select');
                }}
                className="flex-1 py-4 rounded-2xl items-center justify-center border border-outline-variant/30 active:opacity-75"
              >
                <Text className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider">Back to List</Text>
              </Pressable>
              
              <Pressable
                onPress={handleApplyDecomposition}
                className="flex-[2] py-4 rounded-2xl items-center justify-center active:opacity-90 shadow-md"
                style={{ backgroundColor: theme.primary }}
              >
                <Text className="font-black text-xs uppercase text-on-primary tracking-widest">Apply Breakdown</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

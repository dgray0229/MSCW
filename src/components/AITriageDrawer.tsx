import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown, 
  SlideOutDown, 
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  LinearTransition
} from 'react-native-reanimated';
import { 
  X, 
  Sparkles, 
  Mic, 
  Check, 
  Layers, 
  ArrowRightLeft, 
  HelpCircle
} from 'lucide-react-native';
import { getTaskIcon } from '../lib/taskUtils';
import { parseBrainDump, AIDraftTask } from '../lib/gemini';
import { useAppStore } from '../store';
import { Priority, Task } from '../types';
import * as Haptics from 'expo-haptics';

interface AITriageDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function AITriageDrawer({ visible, onClose }: AITriageDrawerProps) {
  const addTask = useAppStore(state => state.addTask);
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draftTasks, setDraftTasks] = useState<AIDraftTask[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeImportMode, setActiveImportMode] = useState<'board' | 'backlog'>('board');

  // Pulsing mic wave animation when parsing
  const pulseScale1 = useSharedValue(1);
  const pulseScale2 = useSharedValue(1);

  useEffect(() => {
    if (isLoading) {
      pulseScale1.value = withRepeat(
        withSequence(withTiming(1.4, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        true
      );
      pulseScale2.value = withRepeat(
        withSequence(withTiming(1.8, { duration: 1100 }), withTiming(1, { duration: 1100 })),
        -1,
        true
      );
    } else {
      pulseScale1.value = 1;
      pulseScale2.value = 1;
    }
  }, [isLoading]);

  const animatedWave1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale1.value }],
    opacity: withTiming(isLoading ? 0.4 : 0, { duration: 300 }),
  }));

  const animatedWave2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale2.value }],
    opacity: withTiming(isLoading ? 0.2 : 0, { duration: 300 }),
  }));

  if (!visible) return null;

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    if (useAppStore.getState().settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsLoading(true);
    try {
      const parsed = await parseBrainDump(inputText);
      setDraftTasks(parsed);
      setShowResults(true);
      if (useAppStore.getState().settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setInputText('');
    setDraftTasks([]);
    setShowResults(false);
  };

  const handleImportAll = () => {
    if (draftTasks.length === 0) return;
    
    if (useAppStore.getState().settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    draftTasks.forEach(draft => {
      addTask({
        title: draft.title,
        description: draft.description,
        points: draft.points,
        priority: draft.priority as Priority,
        status: activeImportMode,
        type: draft.type as Task['type'],
        subtasks: draft.subtasks.map((s, idx) => ({ id: `${Math.random().toString(36).substring(2, 11)}-${idx}`, title: s.title, completed: s.completed })),
      });
    });

    handleReset();
    onClose();
  };

  // Inline modifications
  const updateDraftTask = (index: number, updates: Partial<AIDraftTask>) => {
    setDraftTasks(prev => prev.map((t, idx) => idx === index ? { ...t, ...updates } : t));
  };

  // Helper arrays for options
  const pointOptions = [1, 2, 3, 5, 8];
  const priorityOptions: { key: AIDraftTask['priority']; label: string; color: string; bg: string }[] = [
    { key: 'must', label: 'Must', color: 'text-primary', bg: 'bg-primary/10' },
    { key: 'should', label: 'Should', color: 'text-secondary', bg: 'bg-secondary/10' },
    { key: 'could', label: 'Could', color: 'text-tertiary', bg: 'bg-tertiary/10' },
    { key: 'wont', label: 'Won\'t', color: 'text-on-surface-variant', bg: 'bg-surface-variant/20' },
  ];
  const typeOptions: Task['type'][] = ['Feature', 'Bug', 'Tech Debt', 'Design', 'Security', 'Hotfix'];



  return (
    <Animated.View 
      entering={FadeIn.duration(200)} 
      exiting={FadeOut.duration(150)}
      className="absolute inset-0 bg-black/60 z-50 justify-end"
    >
      <Pressable className="absolute inset-0" onPress={isLoading ? undefined : onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="w-full max-h-[92%]"
      >
        <Animated.View 
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(250)}
          className="w-full bg-background rounded-t-[36px] border-t border-outline-variant/30 shadow-2xl flex-col p-6 pb-8"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <View className="bg-primary/10 p-2 rounded-2xl">
                <Sparkles size={20} color="#b61722" />
              </View>
              <Text className="text-2xl font-black text-on-surface tracking-tight">AI Triage Assistant</Text>
            </View>
            <Pressable 
              onPress={onClose}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant items-center justify-center active:opacity-75"
            >
              <X size={16} color="#666" />
            </Pressable>
          </View>

          {!showResults ? (
            /* Phase 1: Input mental dump */
            <View className="gap-6">
              <View>
                <Text className="text-on-surface-variant font-medium text-xs leading-relaxed mb-4">
                  Brain dump your tasks below. Write or speak naturally, and your AI assistant will instantly organize them into your backlog.
                </Text>
                
                <View className="relative">
                  <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    numberOfLines={6}
                    placeholder="e.g. I must fix that login layout bug ASAP since iOS is crashing (takes 1 hour). I should also refactor the user profile settings, that's heavy, maybe 5 points. If I have time I could style the dark mode switch."
                    placeholderTextColor="#8a929b"
                    className="w-full bg-surface-container rounded-3xl p-5 text-on-surface text-sm border border-outline-variant/40 min-h-[160px] text-left align-top font-medium"
                    textAlignVertical="top"
                  />
                  
                  {/* Waveforms & Loading Indicators */}
                  {isLoading && (
                    <View className="absolute inset-0 bg-background/80 rounded-3xl items-center justify-center gap-4">
                      <View className="relative items-center justify-center w-20 h-20">
                        <Animated.View style={animatedWave2} className="absolute inset-0 bg-primary/20 rounded-full" />
                        <Animated.View style={animatedWave1} className="absolute inset-0 bg-primary/45 rounded-full" />
                        <View className="bg-primary p-4 rounded-full shadow-lg">
                          <Mic size={24} color="white" />
                        </View>
                      </View>
                      <Text className="font-black text-primary text-sm uppercase tracking-widest animate-pulse mt-2">
                        AI Orchestration Engine active…
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Dictation Tip */}
              <View className="flex-row items-center gap-2 bg-surface-container-high p-3.5 rounded-2xl border border-outline-variant/30">
                <Mic size={14} color="#8a929b" />
                <Text className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider flex-1">
                  {"PRO-TIP: Tap the Microphone icon on your phone's keyboard spacebar to speak your mind directly!"}
                </Text>
              </View>

              <Pressable
                onPress={handleGenerate}
                disabled={!inputText.trim() || isLoading}
                className={`py-4 rounded-2xl items-center justify-center flex-row gap-2 ${inputText.trim() && !isLoading ? 'bg-primary' : 'bg-primary/45 opacity-55'}`}
              >
                <Sparkles size={16} color="white" />
                <Text className="text-on-primary font-black text-sm uppercase tracking-wider">Parse Brain-Dump</Text>
              </Pressable>
            </View>
          ) : (
            /* Phase 2: Review Parsed Cards */
            <View className="max-h-[80%] gap-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Parsed AI Drafts ({draftTasks.length})</Text>
                <Pressable onPress={handleReset} className="flex-row items-center gap-1 active:opacity-50">
                  <ArrowRightLeft size={12} color="#b61722" />
                  <Text className="text-primary font-bold text-xs">Redo Dump</Text>
                </Pressable>
              </View>

              <ScrollView className="max-h-[380px] gap-4" showsVerticalScrollIndicator={false}>
                <Animated.View layout={LinearTransition.springify()} className="gap-4">
                  {draftTasks.map((task, index) => {
                    const TypeIcon = getTaskIcon(task.type);
                    
                    return (
                      <View 
                        key={index} 
                        className="bg-surface-container-lowest border border-outline-variant p-4 rounded-3xl shadow-sm gap-4"
                      >
                        {/* Title Input */}
                        <TextInput
                          value={task.title}
                          onChangeText={(val) => updateDraftTask(index, { title: val })}
                          className="font-black text-on-surface text-base border-b border-dashed border-outline-variant/50 pb-1"
                        />

                        {/* Priority Selector */}
                        <View>
                          <Text className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5">MoSCoW Priority</Text>
                          <View className="flex-row gap-1.5 flex-wrap">
                            {priorityOptions.map(opt => (
                              <Pressable
                                key={opt.key}
                                onPress={() => updateDraftTask(index, { priority: opt.key })}
                                className={`px-3 py-1 rounded-full border ${task.priority === opt.key ? `${opt.bg} border-primary` : 'bg-transparent border-outline-variant/30'}`}
                              >
                                <Text className={`text-[10px] font-bold ${task.priority === opt.key ? opt.color : 'text-on-surface-variant'}`}>
                                  {opt.label}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>

                        {/* Point & Type Selector */}
                        <View className="flex-row justify-between items-center gap-4 flex-wrap">
                          {/* Points */}
                          <View className="flex-1 min-w-[120px]">
                            <Text className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5">Complexity Points</Text>
                            <View className="flex-row gap-1">
                              {pointOptions.map(p => (
                                <Pressable
                                  key={p}
                                  onPress={() => updateDraftTask(index, { points: p })}
                                  className={`w-7 h-7 rounded items-center justify-center border ${task.points === p ? 'bg-primary/10 border-primary' : 'bg-transparent border-outline-variant/30'}`}
                                >
                                  <Text className={`font-black text-[10px] ${task.points === p ? 'text-primary' : 'text-on-surface-variant'}`}>{p}</Text>
                                </Pressable>
                              ))}
                            </View>
                          </View>

                          {/* Category Type */}
                          <View>
                            <Text className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5">Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-w-[150px]">
                              <View className="flex-row gap-1">
                                {typeOptions.map(t => (
                                  <Pressable
                                    key={t}
                                    onPress={() => updateDraftTask(index, { type: t })}
                                    className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${task.type === t ? 'bg-secondary/10 border-secondary' : 'bg-transparent border-outline-variant/30'}`}
                                  >
                                    <TypeIcon size={10} color={task.type === t ? '#855300' : '#8a929b'} />
                                    <Text className={`text-[9px] font-bold ${task.type === t ? 'text-secondary' : 'text-on-surface-variant'}`}>{t}</Text>
                                  </Pressable>
                                ))}
                              </View>
                            </ScrollView>
                          </View>
                        </View>

                        {/* Actionable Subtasks */}
                        {task.subtasks.length > 0 && (
                          <View className="bg-surface-container-high/40 p-3 rounded-2xl border border-outline-variant/20">
                            <Text className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Auto-Decomposed Subtasks</Text>
                            <View className="gap-2">
                              {task.subtasks.map((sub, sIdx) => (
                                <View key={sIdx} className="flex-row items-center gap-2">
                                  <Pressable 
                                    onPress={() => {
                                      const updatedSubtasks = task.subtasks.map((s, idx) => idx === sIdx ? { ...s, completed: !s.completed } : s);
                                      updateDraftTask(index, { subtasks: updatedSubtasks });
                                    }}
                                    className={`w-3.5 h-3.5 rounded border items-center justify-center ${sub.completed ? 'bg-primary border-primary' : 'border-outline-variant'}`}
                                  >
                                    {sub.completed && <Check size={8} color="white" />}
                                  </Pressable>
                                  <TextInput
                                    value={sub.title}
                                    onChangeText={(val) => {
                                      const updatedSubtasks = task.subtasks.map((s, idx) => idx === sIdx ? { ...s, title: val } : s);
                                      updateDraftTask(index, { subtasks: updatedSubtasks });
                                    }}
                                    className="text-xs text-on-surface flex-1 font-medium"
                                  />
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </Animated.View>
              </ScrollView>

              {/* Import Options Selector */}
              <View className="flex-row gap-2 border-t border-outline-variant/30 pt-4">
                <Pressable
                  onPress={() => setActiveImportMode('board')}
                  className={`flex-1 py-3 rounded-2xl items-center border ${activeImportMode === 'board' ? 'bg-primary/10 border-primary' : 'bg-transparent border-outline-variant/30'}`}
                >
                  <Text className={`font-black text-xs ${activeImportMode === 'board' ? 'text-primary' : 'text-on-surface-variant'}`}>Import to Board</Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveImportMode('backlog')}
                  className={`flex-1 py-3 rounded-2xl items-center border ${activeImportMode === 'backlog' ? 'bg-primary/10 border-primary' : 'bg-transparent border-outline-variant/30'}`}
                >
                  <Text className={`font-black text-xs ${activeImportMode === 'backlog' ? 'text-primary' : 'text-on-surface-variant'}`}>Import to Backlog</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleImportAll}
                className="w-full py-4 rounded-2xl items-center justify-center bg-primary"
              >
                <Text className="text-on-primary font-black text-sm uppercase tracking-wider">Commit drafts to Board ({draftTasks.length})</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

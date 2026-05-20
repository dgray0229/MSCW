import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { X, Sparkles, Inbox, Calendar, CheckCircle } from 'lucide-react-native';
import { useAppStore } from '../store';
import { Task } from '../types';
import { getOverflowRecommendations } from '../lib/aiPlanner';
import * as Haptics from 'expo-haptics';

interface OverflowConciergeDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function OverflowConciergeDrawer({ visible, onClose }: OverflowConciergeDrawerProps) {
  const tasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const updateTask = useAppStore(state => state.updateTask);
  const updateSettings = useAppStore(state => state.updateSettings);

  const uncompletedTasks = tasks.filter(t => t.status === 'board' && !t.completed);
  const [actions, setActions] = useState<Record<string, 'backlog' | 'keep'>>({});

  useEffect(() => {
    if (visible) {
      const recommendations = getOverflowRecommendations(tasks);
      const initialActions: Record<string, 'backlog' | 'keep'> = {};
      
      uncompletedTasks.forEach(t => {
        const rec = recommendations.find(r => r.id === t.id);
        // Default lower-priority to backlog, high-priority to keep
        if (rec && rec.action === 'backlog') {
          initialActions[t.id] = 'backlog';
        } else {
          initialActions[t.id] = 'keep';
        }
      });
      
      setActions(initialActions);
    }
  }, [visible, tasks]);

  if (!visible) return null;

  const handleConfirm = () => {
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Apply the user's restructuring choices
    Object.entries(actions).forEach(([id, action]) => {
      if (action === 'backlog') {
        updateTask(id, { status: 'backlog' });
      } else {
        updateTask(id, { status: 'board' }); // Keep on Board
      }
    });

    onClose();
  };

  const toggleAction = (id: string) => {
    if (settings.hapticsEnabled) {
      Haptics.selectionAsync();
    }
    setActions(prev => ({
      ...prev,
      [id]: prev[id] === 'keep' ? 'backlog' : 'keep'
    }));
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(200)} 
      exiting={FadeOut.duration(150)}
      className="absolute inset-0 bg-black/60 z-50 justify-end"
    >
      <Pressable className="absolute inset-0" onPress={onClose} />

      <Animated.View 
        entering={SlideInDown.springify().damping(20)}
        exiting={SlideOutDown.duration(250)}
        className="w-full bg-background rounded-t-[36px] border-t border-outline-variant/30 shadow-2xl flex-col p-6 pb-8 max-h-[85%]"
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-2">
            <View className="bg-primary/10 p-2 rounded-2xl">
              <Sparkles size={20} color="#b61722" />
            </View>
            <View>
              <Text className="text-2xl font-black text-on-surface tracking-tight">Overflow Concierge</Text>
              <Text className="text-[10px] font-black uppercase tracking-widest text-primary">Rollover Assistant</Text>
            </View>
          </View>
          <Pressable 
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant items-center justify-center active:opacity-75"
          >
            <X size={16} color="#666" />
          </Pressable>
        </View>

        {uncompletedTasks.length === 0 ? (
          <View className="py-12 items-center justify-center gap-4">
            <View className="w-16 h-16 rounded-full bg-tertiary/10 items-center justify-center">
              <CheckCircle size={32} color="#00685f" />
            </View>
            <Text className="text-xl font-black text-on-surface text-center">Perfect Day Complete!</Text>
            <Text className="text-sm text-on-surface-variant text-center font-medium leading-relaxed px-6">
              You finished all your daily goals. Your board is clear for tomorrow. Outstanding work!
            </Text>
            <Pressable 
              onPress={onClose}
              className="bg-primary w-full py-4 rounded-2xl items-center justify-center mt-4"
            >
              <Text className="text-on-primary font-black uppercase tracking-wider text-xs">Dismiss</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-4 flex-1">
            <Text className="text-on-surface-variant font-medium text-xs leading-relaxed">
              You have **{uncompletedTasks.length} uncompleted tasks** remaining. To stay within your daily capacity limit, your AI assistant recommends moving non-critical items back to the Backlog.
            </Text>

            <ScrollView className="flex-1 gap-3 pr-1" showsVerticalScrollIndicator={false}>
              <View className="gap-3 py-1">
                {uncompletedTasks.map(task => {
                  const action = actions[task.id] || 'keep';
                  const isMust = task.priority === 'must';
                  
                  return (
                    <View 
                      key={task.id} 
                      className="bg-surface-container-lowest border border-outline-variant p-4 rounded-3xl shadow-sm gap-3"
                    >
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 pr-2">
                          <Text className="font-black text-on-surface text-sm mb-1">{task.title}</Text>
                          <Text className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">
                            {task.priority.toUpperCase()} • {task.points || 0} pts
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => toggleAction(task.id)}
                          className={`px-4 py-2 rounded-2xl border flex-row items-center gap-1.5 active:opacity-85 ${action === 'keep' ? 'bg-secondary/10 border-secondary' : 'bg-surface border-outline-variant'}`}
                        >
                          {action === 'keep' ? (
                            <>
                              <Calendar size={12} color="#855300" />
                              <Text className="text-[10px] font-black uppercase tracking-wider text-secondary">Keep Tomorrow</Text>
                            </>
                          ) : (
                            <>
                              <Inbox size={12} color="#73777f" />
                              <Text className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Send to Backlog</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                      
                      <View className="bg-surface-container-high/40 p-3 rounded-2xl border border-outline-variant/10">
                        <Text className="text-xs text-on-surface-variant leading-normal font-medium">
                          {isMust 
                            ? "Must-Have: AI recommends keeping this as a high-focus morning goal for tomorrow."
                            : "Lower Priority: AI recommends sending this to the backlog to prevent burnout."
                          }
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable
              onPress={handleConfirm}
              className="w-full py-4 rounded-2xl items-center justify-center bg-primary mt-2 active:opacity-90"
            >
              <Text className="text-on-primary font-black text-sm uppercase tracking-wider">Confirm Restructuring</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

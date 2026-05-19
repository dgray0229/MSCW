import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { Flame, CheckCircle2, PlusCircle, CloudSnow, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function TriagePage() {
  const router = useRouter();
  const tasks = useAppStore(state => state.tasks.filter(t => t.status === 'backlog'));
  const settings = useAppStore(state => state.settings);
  const updateTask = useAppStore(state => state.updateTask);
  
  const activeTask = tasks[0];

  const handleTriage = (priority: 'must' | 'should' | 'could' | 'wont') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!activeTask) return;
    
    const status = priority === 'wont' && settings.autoArchiveWontTasks ? 'archive' : 'board';
    updateTask(activeTask.id, {
      priority,
      status,
    });
  };

  if (!activeTask) {
    return (
      <SafeScreen className="flex-1 bg-background" scrollable={false}>
        <View className="flex-1 items-center justify-center p-8 gap-6">
          <View className="bg-tertiary/10 p-6 rounded-full border border-tertiary/20">
            <Sparkles color="#00685f" size={48} />
          </View>
          <View className="items-center">
            <Text className="text-3xl font-black text-on-surface mb-2 text-center">Triage Complete!</Text>
            <Text className="text-on-surface-variant text-center max-w-sm">
              Your backlog is fully prioritized. Check the Board to start your sprint.
            </Text>
          </View>
          <Pressable 
            onPress={() => router.push('/')}
            className="bg-primary px-8 py-3.5 rounded-full shadow-md mt-4"
          >
            <Text className="text-on-primary font-black uppercase tracking-wider text-sm">View Daily Board</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="flex-1 bg-background" scrollable={true}>
      <View className="flex-1 items-center justify-center w-full max-w-md mx-auto py-4">
        <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-6">
          Backlog Triage ({tasks.length} remaining)
        </Text>
        
        {/* Triage Deck Card */}
        <View className="w-full aspect-[4/3] bg-surface-container-lowest rounded-3xl border border-outline-variant shadow-sm p-6 justify-center items-center mb-8">
          <View className="bg-surface-container px-3 py-1 rounded-full mb-3 border border-outline-variant/30">
            <Text className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">
              {activeTask.type || 'Feature'} • {activeTask.points || '?'} pts
            </Text>
          </View>
          <Text className="text-2xl font-black text-on-surface text-center mb-3 px-2 leading-tight">
            {activeTask.title}
          </Text>
          <Text className="text-xs text-on-surface-variant text-center px-4 leading-normal" numberOfLines={3}>
            {activeTask.description || "No description provided. Sorting this task decides its priority for your upcoming day's limit."}
          </Text>
        </View>

        {/* Moscow Sorting Grid */}
        <View className="flex-row flex-wrap justify-between gap-4 w-full">
          <Pressable 
            onPress={() => handleTriage('must')}
            className="bg-primary/10 border border-primary/20 p-4 rounded-2xl items-center w-[47%] active:bg-primary/25"
          >
            <Flame color="#b61722" size={24} />
            <Text className="text-primary font-black mt-2 text-sm tracking-wide">MUST</Text>
            <Text className="text-[8px] text-primary/70 font-semibold mt-0.5 uppercase tracking-wider">Non-negotiable</Text>
          </Pressable>
          
          <Pressable 
            onPress={() => handleTriage('should')}
            className="bg-secondary/10 border border-secondary/20 p-4 rounded-2xl items-center w-[47%] active:bg-secondary/25"
          >
            <CheckCircle2 color="#855300" size={24} />
            <Text className="text-secondary font-black mt-2 text-sm tracking-wide">SHOULD</Text>
            <Text className="text-[8px] text-secondary/70 font-semibold mt-0.5 uppercase tracking-wider">High Priority</Text>
          </Pressable>
          
          <Pressable 
            onPress={() => handleTriage('could')}
            className="bg-tertiary/10 border border-tertiary/20 p-4 rounded-2xl items-center w-[47%] active:bg-tertiary/25"
          >
            <PlusCircle color="#00685f" size={24} />
            <Text className="text-tertiary font-black mt-2 text-sm tracking-wide">COULD</Text>
            <Text className="text-[8px] text-tertiary/70 font-semibold mt-0.5 uppercase tracking-wider">Nice-to-have</Text>
          </Pressable>
          
          <Pressable 
            onPress={() => handleTriage('wont')}
            className="bg-surface-variant/20 border border-outline-variant/30 p-4 rounded-2xl items-center w-[47%] active:bg-surface-variant/40"
          >
            <CloudSnow color="#5b403e" size={24} />
            <Text className="text-on-surface-variant font-black mt-2 text-sm tracking-wide">WON'T</Text>
            <Text className="text-[8px] text-on-surface-variant/70 font-semibold mt-0.5 uppercase tracking-wider">Skip/Archive</Text>
          </Pressable>
        </View>
      </View>
    </SafeScreen>
  );
}


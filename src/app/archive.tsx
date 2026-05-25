import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { ArchiveRestore, Trash2, ArrowLeft, ArchiveX } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

export default function ArchivePage() {
  const router = useRouter();
  const tasks = useAppStore(state => state.tasks);
  const updateTask = useAppStore(state => state.updateTask);
  const deleteTask = useAppStore(state => state.deleteTask);
  
  const [filter, setFilter] = useState<'wont' | 'completed'>('wont');

  const archivedTasks = tasks.filter(t => t.status === 'archive');
  const displayTasks = archivedTasks.filter(t => 
    filter === 'wont' ? (t.priority === 'wont') : t.completed
  );

  const handleRestore = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateTask(id, { status: 'backlog', priority: 'unsorted', completed: false });
  };

  const handlePurge = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteTask(id);
  };

  const handlePurgeAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    displayTasks.forEach(t => deleteTask(t.id));
  };

  return (
    <SafeScreen className="flex-1 bg-background relative">
      <View className="flex-row items-center justify-between p-4 border-b border-outline-variant/30">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-surface-container-high">
          <ArrowLeft size={24} color="#191c20" />
        </Pressable>
        <Text className="text-xl font-black text-on-surface tracking-tight">Archive</Text>
        <View className="w-10" />
      </View>

      {/* Tabs */}
      <View className="flex-row p-4 gap-2">
        <Pressable 
          onPress={() => { Haptics.selectionAsync(); setFilter('wont'); }}
          className={`flex-1 py-3 items-center rounded-xl border ${filter === 'wont' ? 'bg-surface-container-highest border-outline-variant' : 'bg-transparent border-transparent'}`}
        >
          <Text className={`font-bold ${filter === 'wont' ? 'text-on-surface' : 'text-on-surface-variant'}`}>{"Won't-Haves"}</Text>
        </Pressable>
        <Pressable 
          onPress={() => { Haptics.selectionAsync(); setFilter('completed'); }}
          className={`flex-1 py-3 items-center rounded-xl border ${filter === 'completed' ? 'bg-surface-container-highest border-outline-variant' : 'bg-transparent border-transparent'}`}
        >
          <Text className={`font-bold ${filter === 'completed' ? 'text-on-surface' : 'text-on-surface-variant'}`}>Completed</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {displayTasks.length === 0 ? (
          <View className="items-center justify-center py-20 opacity-50">
            <ArchiveX size={64} color="#73777f" className="mb-4" />
            <Text className="text-on-surface-variant font-bold text-lg">No tasks found</Text>
          </View>
        ) : (
          displayTasks.map(task => (
            <View key={task.id} className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant shadow-sm mb-4">
              <Text className="text-lg font-bold text-on-surface mb-1">{task.title}</Text>
              {task.description && (
                <Text className="text-sm text-on-surface-variant mb-4">{task.description}</Text>
              )}
              
              <View className="flex-row justify-end gap-3 mt-2">
                <Pressable 
                  onPress={() => handleRestore(task.id)}
                  className="bg-primary-container px-4 py-2 rounded-xl flex-row items-center gap-2 active:opacity-80"
                >
                  <ArchiveRestore size={16} color="#b61722" />
                  <Text className="text-primary font-bold text-sm">Restore</Text>
                </Pressable>
                
                <Pressable 
                  onPress={() => handlePurge(task.id)}
                  className="bg-error/10 px-4 py-2 rounded-xl flex-row items-center gap-2 active:opacity-80"
                >
                  <Trash2 size={16} color="#ba1a1a" />
                  <Text className="text-error font-bold text-sm">Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {displayTasks.length > 0 && (
          <Pressable 
            onPress={handlePurgeAll}
            className="mt-8 border border-error/30 bg-error/5 p-4 rounded-2xl items-center flex-row justify-center gap-2 active:opacity-80"
          >
            <Trash2 size={18} color="#ba1a1a" />
            <Text className="text-error font-black uppercase tracking-widest text-sm">Delete All</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

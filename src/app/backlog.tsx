import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { PlusCircle, X } from 'lucide-react-native';
import { Task } from '../types';
import * as Haptics from 'expo-haptics';

export default function BacklogPage() {
  const tasks = useAppStore(state => state.tasks.filter(t => t.status === 'backlog'));
  const addTask = useAppStore(state => state.addTask);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState<number | null>(3);
  const [type, setType] = useState<Task['type']>('Feature');

  const handleCreate = () => {
    if (!title.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      points,
      type,
      status: 'backlog',
      priority: 'unsorted',
    });
    // Reset form
    setTitle('');
    setDescription('');
    setPoints(3);
    setType('Feature');
    setShowAddForm(false);
  };

  const pointOptions = [1, 2, 3, 5, 8];
  const typeOptions: Task['type'][] = ['Feature', 'Bug', 'Tech Debt', 'Design', 'Security', 'Hotfix'];

  return (
    <SafeScreen className="flex-1 bg-background">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-4xl font-black text-on-surface tracking-tight">Backlog</Text>
        <Pressable 
          onPress={() => setShowAddForm(!showAddForm)}
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
        <View className="bg-surface-container-lowest border border-outline-variant p-5 rounded-3xl shadow-sm mb-6 gap-4">
          <View>
            <Text className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Task Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Implement dynamic widgets"
              placeholderTextColor="#8a929b"
              className="bg-surface-container rounded-2xl px-4 py-3 text-on-surface font-bold text-sm border border-outline-variant/30 focus:border-primary"
            />
          </View>

          <View>
            <Text className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Description (Optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Provide context or constraints"
              placeholderTextColor="#8a929b"
              multiline
              numberOfLines={2}
              className="bg-surface-container rounded-2xl px-4 py-3 text-on-surface font-medium text-xs border border-outline-variant/30 min-h-[60px]"
            />
          </View>

          <View>
            <Text className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Complexity (Story Points)</Text>
            <View className="flex-row gap-2 flex-wrap">
              {pointOptions.map(p => (
                <Pressable
                  key={p}
                  onPress={() => setPoints(p)}
                  className={`flex-1 min-w-[50px] py-2 rounded-xl items-center border ${points === p ? 'bg-primary/10 border-primary' : 'bg-surface border-outline-variant/30'}`}
                >
                  <Text className={`font-black text-sm ${points === p ? 'text-primary' : 'text-on-surface-variant'}`}>{p} pt</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setPoints(null)}
                className={`flex-1 min-w-[50px] py-2 rounded-xl items-center border ${points === null ? 'bg-primary/10 border-primary' : 'bg-surface border-outline-variant/30'}`}
              >
                <Text className={`font-black text-sm ${points === null ? 'text-primary' : 'text-on-surface-variant'}`}>?</Text>
              </Pressable>
            </View>
          </View>

          <View>
            <Text className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Category Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {typeOptions.map(t => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full border ${type === t ? 'bg-secondary/15 border-secondary' : 'bg-surface border-outline-variant/30'}`}
                >
                  <Text className={`text-[10px] font-bold ${type === t ? 'text-secondary font-black' : 'text-on-surface-variant'}`}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable 
            onPress={handleCreate}
            disabled={!title.trim()}
            className={`w-full py-3.5 rounded-2xl items-center justify-center ${title.trim() ? 'bg-primary' : 'bg-primary/45 opacity-55'}`}
          >
            <Text className="text-on-primary font-black text-sm uppercase tracking-wider">Add to Backlog</Text>
          </Pressable>
        </View>
      )}

      {/* Task List */}
      <View className="flex-col gap-4">
        {tasks.map(task => (
            <View key={task.id} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-sm flex-row justify-between items-center flex-wrap gap-4">
                <View className="flex-1 mr-4 min-w-[200px]">
                    <Text className="font-bold text-on-surface text-base">{task.title}</Text>
                    {task.description ? (
                      <Text className="text-xs text-on-surface-variant mt-1" numberOfLines={1}>{task.description}</Text>
                    ) : null}
                    <View className="flex-row items-center gap-2 mt-2">
                      <View className="bg-surface-container-high px-2.5 py-0.5 rounded-full">
                        <Text className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">{task.type || 'Uncategorized'}</Text>
                      </View>
                      {task.points ? (
                        <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                          <Text className="text-[9px] font-black text-primary">{task.points} pts</Text>
                        </View>
                      ) : null}
                    </View>
                </View>
                <View className="bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant/40">
                  <Text className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Unsorted</Text>
                </View>
            </View>
        ))}
        {tasks.length === 0 && (
            <View className="py-16 items-center justify-center border-2 border-dashed border-outline-variant/20 rounded-3xl bg-surface-container-low/30">
                <Text className="text-on-surface-variant font-bold text-sm">Your backlog is clean and empty!</Text>
                <Text className="text-xs text-on-surface-variant/60 mt-1">{"Tap \"New Task\" above to add items."}</Text>
            </View>
        )}
      </View>
    </SafeScreen>
  );
}

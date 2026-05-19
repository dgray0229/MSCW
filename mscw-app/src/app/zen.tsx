import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { ArrowLeft, Check, Play, Pause, Volume2, RotateCcw, AlertOctagon, ChevronDown, Music } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Audio } from 'expo-av';

const FOCUS_TIME_SECONDS = 25 * 60; // 25 Minutes Pomodoro

const SOUNDSCAPES = [
  { id: 'rain', name: 'Heavy Rain', uri: 'https://cdn.freesound.org/previews/515/515286_11306359-lq.mp3' },
  { id: 'white_noise', name: 'Deep White Noise', uri: 'https://cdn.freesound.org/previews/316/316920_4230890-lq.mp3' },
  { id: 'cafe', name: 'Coffee Shop', uri: 'https://cdn.freesound.org/previews/174/174753_1583271-lq.mp3' },
];

export default function ZenModePage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const tasks = useAppStore(state => state.tasks);
  const updateTask = useAppStore(state => state.updateTask);
  
  const focusTask = id 
    ? tasks.find(t => t.id === id) 
    : tasks.find(t => t.status === 'board' && t.priority === 'must' && !t.completed) || tasks.find(t => t.status === 'board' && !t.completed);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME_SECONDS);
  const [isActive, setIsActive] = useState(false);
  
  // Audio State
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(SOUNDSCAPES[0]);
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState(false);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsActive(false);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft]);

  // Audio Hook Integration (Hybrid)
  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const toggleAudio = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isPlayingAudio && sound) {
      await sound.pauseAsync();
      setIsPlayingAudio(false);
    } else {
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: selectedAudio.uri },
          { isLooping: true, volume: 0.5 }
        );
        setSound(newSound);
        await newSound.playAsync();
      } else {
        await sound.playAsync();
      }
      setIsPlayingAudio(true);
    }
  };

  const changeAudioTrack = async (track: typeof SOUNDSCAPES[0]) => {
    Haptics.selectionAsync();
    setSelectedAudio(track);
    setIsAudioDrawerOpen(false);
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    if (isPlayingAudio) {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { isLooping: true, volume: 0.5 }
      );
      setSound(newSound);
      await newSound.playAsync();
    }
  };

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    setIsActive(false);
    setTimeLeft(FOCUS_TIME_SECONDS);
  };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (focusTask) updateTask(focusTask.id, { completed: true });
    router.push('/');
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    const remainingTasks = tasks.filter(t => t.status === 'board' && !t.completed && t.id !== focusTask?.id);
    if (remainingTasks.length > 0) {
      router.replace(`/zen?id=${remainingTasks[0].id}`);
    } else {
      router.push('/');
    }
  };

  if (!focusTask) {
    return (
      <SafeScreen className="flex-1 bg-background" scrollable={false}>
        <View className="flex-1 items-center justify-center p-10 gap-6">
          <AlertOctagon color="#b61722" size={48} />
          <Text className="text-3xl font-bold text-on-surface mb-2 text-center">No tasks to focus on</Text>
          <Pressable onPress={() => router.push('/')} className="bg-primary px-8 py-3 rounded-xl shadow-md">
            <Text className="text-on-primary font-bold">Go to Board</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  // Circular Math
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / FOCUS_TIME_SECONDS) * circumference;
  const formatTime = (secs: number) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  return (
    <SafeScreen className="flex-1 bg-background" scrollable={false}>
      {/* Top Bar */}
      <View className="w-full flex-row justify-between items-center mb-6 px-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2 py-2 active:opacity-70">
          <ArrowLeft size={20} color="#191c20" />
          <Text className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Exit Focus</Text>
        </Pressable>
        
        {/* Audio Controller */}
        <Pressable 
          onPress={() => setIsAudioDrawerOpen(true)}
          className={`px-4 py-2 rounded-full flex-row items-center gap-2 border ${isPlayingAudio ? 'bg-primary-container border-primary/30' : 'bg-surface-container-high border-outline-variant/30'}`}
        >
          <Volume2 size={14} color={isPlayingAudio ? '#b61722' : '#73777f'} />
          <Text className={`text-[10px] font-black uppercase tracking-widest ${isPlayingAudio ? 'text-primary' : 'text-on-surface-variant'}`}>
            {selectedAudio.name}
          </Text>
          <ChevronDown size={14} color={isPlayingAudio ? '#b61722' : '#73777f'} />
        </Pressable>
      </View>

      {/* Audio Drawer Modal */}
      {isAudioDrawerOpen && (
        <View className="absolute z-50 bottom-0 left-0 right-0 bg-surface-container-highest rounded-t-3xl border-t border-outline-variant/30 pt-6 pb-12 px-6 shadow-2xl">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-black text-on-surface">Ambient Soundscapes</Text>
            <Pressable onPress={() => setIsAudioDrawerOpen(false)} className="p-2 bg-surface-variant/30 rounded-full">
              <ChevronDown size={20} color="#191c20" />
            </Pressable>
          </View>
          
          <View className="gap-3 mb-6">
            {SOUNDSCAPES.map(track => (
              <Pressable
                key={track.id}
                onPress={() => changeAudioTrack(track)}
                className={`flex-row items-center justify-between p-4 rounded-2xl border ${selectedAudio.id === track.id ? 'bg-primary/10 border-primary/30' : 'bg-surface border-outline-variant/30'}`}
              >
                <View className="flex-row items-center gap-3">
                  <Music size={20} color={selectedAudio.id === track.id ? '#b61722' : '#73777f'} />
                  <Text className={`font-bold text-base ${selectedAudio.id === track.id ? 'text-primary' : 'text-on-surface'}`}>{track.name}</Text>
                </View>
                {selectedAudio.id === track.id && <Check size={20} color="#b61722" />}
              </Pressable>
            ))}
          </View>
          
          <Pressable 
            onPress={toggleAudio} 
            className={`w-full py-4 rounded-full items-center justify-center border shadow-sm ${isPlayingAudio ? 'bg-surface border-primary' : 'bg-primary border-primary'}`}
          >
            <Text className={`font-black uppercase tracking-widest text-sm ${isPlayingAudio ? 'text-primary' : 'text-on-primary'}`}>
              {isPlayingAudio ? 'Pause Audio' : 'Play Audio'}
            </Text>
          </Pressable>
        </View>
      )}

      <View className="flex-1 items-center justify-center py-2 px-6">
        
        {/* Task Title */}
        <Text className="text-2xl font-black text-on-surface mb-2 text-center leading-tight tracking-tight">
          {focusTask.title}
        </Text>
        <Text className="text-sm text-on-surface-variant mb-10 text-center italic">
          {focusTask.priority.toUpperCase()} PRIORITY
        </Text>

        {/* Circular SVG Timer */}
        <View className="relative items-center justify-center mb-12">
          <Svg height="280" width="280" viewBox="0 0 280 280" className="rotate-[-90deg]">
            <Circle cx="140" cy="140" r={radius} stroke="#e0e3e5" strokeWidth="8" fill="none" />
            <Circle 
              cx="140" cy="140" r={radius} 
              stroke="#b61722" strokeWidth="12" fill="none" 
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </Svg>
          
          <View className="absolute items-center justify-center">
            <Text className="text-6xl font-black text-on-surface tracking-tighter mb-2">{formatTime(timeLeft)}</Text>
            
            <View className="flex-row gap-4 mt-2">
              <Pressable onPress={toggleTimer} className="w-14 h-14 bg-primary rounded-full items-center justify-center active:opacity-80">
                {isActive ? <Pause size={24} color="#ffffff" fill="#ffffff" /> : <Play size={24} color="#ffffff" fill="#ffffff" className="ml-1" />}
              </Pressable>
              
              <Pressable onPress={resetTimer} className="w-14 h-14 bg-surface-container-high rounded-full items-center justify-center border border-outline-variant active:opacity-80">
                <RotateCcw size={20} color="#44474e" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Action Controls */}
        <View className="flex-row items-center justify-center gap-4 w-full">
          <Pressable 
            onPress={handleDone}
            className="flex-1 h-16 rounded-2xl bg-tertiary-container flex-row items-center justify-center gap-2 active:opacity-90"
          >
             <Check color="#ffffff" size={24} />
             <Text className="text-on-tertiary uppercase tracking-widest text-xs font-black">Complete</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleSkip} className="mt-8 p-4">
            <Text className="text-on-surface-variant font-bold uppercase tracking-[0.2em] text-[10px]">
                Skip to next task
            </Text>
        </Pressable>

      </View>
    </SafeScreen>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, ScrollView } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { ArrowLeft, Check, Play, Pause, Volume2, RotateCcw, AlertOctagon, ChevronDown, Music, Sparkles, CloudRain, Waves, VolumeX, History, BarChart2, Award, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { useAudioPlayer } from 'expo-audio';
import { getRecommendedSoundscape } from '../lib/aiPlanner';
import { useAccentTheme } from '../hooks/useAccentTheme';
import { AdaptiveGlass } from '../components/ui/AdaptiveGlass';

const FOCUS_TIME_SECONDS = 25 * 60; // 25 Minutes Pomodoro

const SOUNDSCAPES = [
  { id: 'lofi', name: 'Study Lo-Fi', uri: 'https://cdn.freesound.org/previews/612/612260_5674468-lq.mp3' },
  { id: 'binaural', name: 'Binaural Beats', uri: 'https://cdn.freesound.org/previews/553/553315_5250656-lq.mp3' },
  { id: 'cafe', name: 'Coffee Shop', uri: 'https://cdn.freesound.org/previews/174/174753_1583271-lq.mp3' },
  { id: 'white_noise', name: 'Deep White Noise', uri: 'https://cdn.freesound.org/previews/316/316920_4230890-lq.mp3' },
];

const OVERLAYS = [
  { id: 'rain', name: 'Forest Rain', uri: 'https://cdn.freesound.org/previews/515/515286_11306359-lq.mp3' },
  { id: 'stream', name: 'Forest Stream', uri: 'https://cdn.freesound.org/previews/339/339326_4860163-lq.mp3' },
  { id: 'ocean', name: 'Ocean Waves', uri: 'https://cdn.freesound.org/previews/495/495546_2389369-lq.mp3' },
];

export default function ZenModePage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useAccentTheme();
  const isDark = useColorScheme() === 'dark';
  
  const tasks = useAppStore(state => state.tasks);
  const updateTask = useAppStore(state => state.updateTask);
  
  const focusSessions = useAppStore(state => state.focusSessions) || [];
  const distractions = useAppStore(state => state.distractions) || [];
  const addFocusSession = useAppStore(state => state.addFocusSession);
  const logDistraction = useAppStore(state => state.logDistraction);

  const focusTask = id 
    ? tasks.find(t => t.id === id) 
    : tasks.find(t => t.status === 'today' && t.priority === 'must' && !t.completed) || tasks.find(t => t.status === 'today' && !t.completed);

  const [showDashboard, setShowDashboard] = useState(false);
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME_SECONDS);
  const [isActive, setIsActive] = useState(false);
  
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(SOUNDSCAPES[0]);
  const [selectedOverlay, setSelectedOverlay] = useState(OVERLAYS[0]);
  
  const [soundscapeVol, setSoundscapeVol] = useState(0.6);
  const [overlayVol, setOverlayVol] = useState(0.2);
  
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState(false);
  const [isDistractionModalOpen, setIsDistractionModalOpen] = useState(false);
  const [distractionsCount, setDistractionsCount] = useState(0);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 11));
  const [aiConductionReason, setAiConductionReason] = useState('');

  const player = useAudioPlayer(selectedAudio.uri);
  const overlayPlayer = useAudioPlayer(selectedOverlay.uri);
  const anims = useRef(Array.from({ length: 7 }, () => new Animated.Value(0.8))).current;

  useEffect(() => {
    if (player) { player.loop = true; player.volume = soundscapeVol; }
  }, [player, selectedAudio.uri, soundscapeVol]);

  useEffect(() => {
    if (overlayPlayer) { overlayPlayer.loop = true; overlayPlayer.volume = overlayVol; }
  }, [overlayPlayer, selectedOverlay.uri, overlayVol]);

  useEffect(() => {
    let animations: Animated.CompositeAnimation[] = [];
    if (isPlayingAudio) {
      animations = anims.map((anim, index) => {
        const duration = 500 + index * 120;
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 2.4 - (index % 3) * 0.5, duration: duration * 0.4, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.5 + (index % 2) * 0.3, duration: duration * 0.6, useNativeDriver: true }),
          ])
        );
      });
      animations.forEach(a => a.start());
    } else {
      anims.forEach(anim => { Animated.timing(anim, { toValue: 0.8, duration: 350, useNativeDriver: true }).start(); });
    }
    return () => { animations.forEach(a => a.stop()); };
  }, [isPlayingAudio]);

  useEffect(() => {
    if (focusTask) {
      const recommendation = getRecommendedSoundscape(focusTask.type, focusTask.points);
      if (recommendation.trackId === 'rain') {
        setSelectedAudio(SOUNDSCAPES.find(s => s.id === 'lofi') || SOUNDSCAPES[0]);
        setSelectedOverlay(OVERLAYS.find(o => o.id === 'rain') || OVERLAYS[0]);
        setOverlayVol(0.4);
      } else {
        setSelectedAudio(SOUNDSCAPES.find(s => s.id === recommendation.trackId) || SOUNDSCAPES[0]);
      }
      setAiConductionReason(recommendation.reason);
      if (isPlayingAudio) {
        setTimeout(() => { player?.play(); if (overlayVol > 0) overlayPlayer?.play(); }, 150);
      }
    }
  }, [focusTask?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => { setTimeLeft((time) => time - 1); }, 1000);
    } else if (timeLeft === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsActive(false);
      if (focusTask) {
        addFocusSession({
          taskId: focusTask.id, taskTitle: focusTask.title, durationSeconds: FOCUS_TIME_SECONDS,
          targetSeconds: FOCUS_TIME_SECONDS, completed: true, distractionsCount,
          focusScore: Math.max(0, 100 - distractionsCount * 15)
        });
      }
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft]);

  const toggleAudio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlayingAudio) { player?.pause(); overlayPlayer?.pause(); setIsPlayingAudio(false); }
    else { player?.play(); if (overlayVol > 0) overlayPlayer?.play(); setIsPlayingAudio(true); }
  };

  const changeAudioTrack = (track: typeof SOUNDSCAPES[0]) => { Haptics.selectionAsync(); setSelectedAudio(track); if (isPlayingAudio) setTimeout(() => player?.play(), 100); };
  const changeOverlayTrack = (track: typeof OVERLAYS[0]) => { Haptics.selectionAsync(); setSelectedOverlay(track); if (isPlayingAudio && overlayVol > 0) setTimeout(() => overlayPlayer?.play(), 100); };
  const toggleTimer = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIsActive(!isActive); };
  const resetTimer = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid); setIsActive(false); setTimeLeft(FOCUS_TIME_SECONDS); };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (focusTask) {
      const durationSeconds = FOCUS_TIME_SECONDS - timeLeft;
      if (durationSeconds > 5) {
        const score = Math.max(0, Math.min(100, Math.round((durationSeconds / FOCUS_TIME_SECONDS) * 100) - distractionsCount * 15));
        addFocusSession({
          taskId: focusTask.id, taskTitle: focusTask.title, durationSeconds, targetSeconds: FOCUS_TIME_SECONDS,
          completed: timeLeft === 0 || durationSeconds >= FOCUS_TIME_SECONDS * 0.9, distractionsCount,
          focusScore: score
        });
      }
      updateTask(focusTask.id, { completed: true });
    }
    try { player?.pause(); overlayPlayer?.pause(); } catch (e) {}
    router.push('/');
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    const remainingTasks = tasks.filter(t => t.status === 'today' && !t.completed && t.id !== focusTask?.id);
    if (remainingTasks.length > 0) router.replace(`/zen?id=${remainingTasks[0].id}`);
    else router.push('/');
  };

  const totalSessions = focusSessions.length;
  const totalSecs = focusSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const avgScore = totalSessions > 0 ? Math.round(focusSessions.reduce((acc, s) => acc + s.focusScore, 0) / totalSessions) : 100;
  
  let grade = 'A+', gradeDesc = 'Flow State Master', gradeColor = '#22c55e';
  if (avgScore < 70) { grade = 'D'; gradeDesc = 'Constant Interruption'; gradeColor = '#ef4444'; }
  else if (avgScore < 80) { grade = 'C'; gradeDesc = 'Developing Focus'; gradeColor = '#f59e0b'; }
  else if (avgScore < 90) { grade = 'B'; gradeDesc = 'Focused Professional'; gradeColor = theme.primary; }
  else if (avgScore < 95) { grade = 'A'; gradeDesc = 'Deep Work Architect'; gradeColor = '#10b981'; }

  const totalDistractions = distractions.length;
  const externalCount = distractions.filter(d => d.category === 'external').length;
  const digitalCount = distractions.filter(d => d.category === 'digital').length;
  const fatigueCount = distractions.filter(d => d.category === 'fatigue').length;
  const sortedSessions = [...focusSessions].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (!focusTask || showDashboard) {
    return (
      <SafeScreen className="flex-1 bg-background" scrollable={true}>
        <View className="px-5 py-4 pb-12">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-3xl font-black text-on-surface tracking-tight">Zen Space</Text>
              <Text className="text-xs uppercase font-black tracking-widest text-on-surface-variant mt-0.5">Deep focus dashboard & analytics</Text>
            </View>
            {focusTask ? (
              <Pressable onPress={() => setShowDashboard(false)} className="px-4 py-2 bg-surface-container-high border border-slate-200/40 dark:border-slate-800/40 rounded-full flex-row items-center gap-1.5 active:opacity-75">
                <X size={14} color={isDark ? '#f8fafc' : '#191c20'} />
                <Text className="text-[10px] font-black uppercase tracking-wider text-on-surface">Timer</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push('/')} className="px-4 py-2 bg-surface-container-high border border-slate-200/40 dark:border-slate-800/40 rounded-full flex-row items-center gap-1.5 active:opacity-75">
                <ArrowLeft size={14} color={isDark ? '#f8fafc' : '#191c20'} />
                <Text className="text-[10px] font-black uppercase tracking-wider text-on-surface">Board</Text>
              </Pressable>
            )}
          </View>
          <View className="w-full mb-6 rounded-3xl overflow-hidden shadow-md">
            <AdaptiveGlass className="p-5 flex-row items-center gap-6 border border-slate-200/30 dark:border-slate-800/30">
              <View className="w-20 h-20 rounded-2xl items-center justify-center shadow-sm" style={{ backgroundColor: gradeColor + '15', borderStyle: 'solid', borderWidth: 2, borderColor: gradeColor }}>
                <Text className="text-4xl font-black" style={{ color: gradeColor }}>{grade}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black tracking-wider uppercase text-on-surface-variant">Focus Grade</Text>
                <Text className="text-xl font-black text-on-surface mt-0.5">{gradeDesc}</Text>
                <Text className="text-xs text-on-surface-variant font-medium mt-1 leading-relaxed">Your sessions average a focus score of {avgScore}/100.</Text>
              </View>
            </AdaptiveGlass>
          </View>
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1"><AdaptiveGlass className="p-4 rounded-3xl border border-slate-200/25 dark:border-slate-800/25 justify-center"><Text className="text-[9px] font-black tracking-widest uppercase text-on-surface-variant mb-1">Focus Duration</Text><Text className="text-2xl font-black text-on-surface">{timeString}</Text><Text className="text-[10px] text-on-surface-variant mt-0.5">{totalSessions} sessions logged</Text></AdaptiveGlass></View>
            <View className="flex-1"><AdaptiveGlass className="p-4 rounded-3xl border border-slate-200/25 dark:border-slate-800/25 justify-center"><Text className="text-[9px] font-black tracking-widest uppercase text-on-surface-variant mb-1">Interruptions</Text><Text className="text-2xl font-black text-on-surface">{totalDistractions}</Text><Text className="text-[10px] text-on-surface-variant mt-0.5">{totalSessions > 0 ? (totalDistractions / totalSessions).toFixed(1) : 0} per session avg</Text></AdaptiveGlass></View>
          </View>
          <View className="mb-6 rounded-3xl overflow-hidden shadow-sm">
            <AdaptiveGlass className="p-5 border border-slate-200/30 dark:border-slate-800/30">
              <Text className="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-4">Interruption Breakdown</Text>
              {totalDistractions === 0 ? <Text className="text-xs text-on-surface-variant font-medium text-center py-4">No interruptions logged yet. Amazing focus! 🧘</Text> : (
                <View className="gap-3">
                  {[
                    { id: 'external', label: 'External Interruption', count: externalCount, color: theme.primary },
                    { id: 'digital', label: 'Digital Urge (Social/Web)', count: digitalCount, color: '#ef4444' },
                    { id: 'fatigue', label: 'Physical Fatigue / Need Break', count: fatigueCount, color: '#f59e0b' },
                  ].map(item => {
                    const percentage = totalDistractions > 0 ? Math.round((item.count / totalDistractions) * 100) : 0;
                    return (
                      <View key={item.id}>
                        <View className="flex-row justify-between items-center mb-1"><Text className="text-xs font-black text-on-surface">{item.label}</Text><Text className="text-xs font-bold text-on-surface-variant">{item.count} ({percentage}%)</Text></View>
                        <View className="w-full h-2.5 bg-slate-200/40 dark:bg-slate-800/40 rounded-full overflow-hidden"><View className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color }} /></View>
                      </View>
                    );
                  })}
                </View>
              )}
            </AdaptiveGlass>
          </View>
          <Text className="text-xs font-black uppercase tracking-widest text-primary mb-3">Focus Session Retro Log</Text>
          {sortedSessions.length === 0 ? (
            <AdaptiveGlass className="p-8 rounded-3xl border border-slate-200/35 dark:border-slate-800/35 items-center justify-center">
              <History size={32} color="#73777f" className="mb-2" /><Text className="text-sm font-black text-on-surface text-center">No focus sessions recorded</Text>
            </AdaptiveGlass>
          ) : (
            <View className="gap-3">
              {sortedSessions.map((session: any, index: number) => (
                <AdaptiveGlass key={session.id || index} className="p-4 rounded-3xl border border-slate-200/30 dark:border-slate-800/30 flex-row justify-between items-center">
                  <View className="flex-1 pr-3"><Text className="text-sm font-black text-on-surface leading-tight" numberOfLines={1}>{session.taskTitle}</Text><View className="flex-row items-center gap-2 mt-1.5"><Text className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">{Math.round(session.durationSeconds / 60)} mins</Text></View></View>
                  <View className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900"><Text className="text-xs font-black">{session.focusScore}</Text></View>
                </AdaptiveGlass>
              ))}
            </View>
          )}
        </View>
      </SafeScreen>
    );
  }

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / FOCUS_TIME_SECONDS) * circumference;
  const formatTime = (secs: number) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  return (
    <SafeScreen className="flex-1 bg-background" scrollable={false}>
      <View className="w-full flex-row justify-between items-center mb-4 px-4">
        <Pressable onPress={() => { try { player?.pause(); overlayPlayer?.pause(); } catch (e) {} router.back(); }} className="flex-row items-center gap-2 py-2 active:opacity-70">
          <ArrowLeft size={20} color={isDark ? '#f8fafc' : '#191c20'} />
          <Text className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">Exit Focus</Text>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDashboard(true); }} className="w-9 h-9 rounded-full items-center justify-center bg-surface-container-high border border-slate-200/30 dark:border-slate-800/30">
            <History size={16} color={isDark ? '#94A3B8' : '#73777f'} />
          </Pressable>
          <Pressable onPress={() => setIsAudioDrawerOpen(true)} className={`px-3 py-1.5 rounded-full flex-row items-center gap-2 border ${isPlayingAudio ? theme.primaryContainer : 'bg-surface-container-high border-slate-200/30 dark:border-slate-800/30'}`}>
            <Volume2 size={14} color={isPlayingAudio ? theme.primary : (isDark ? '#94A3B8' : '#73777f')} />
            <Text className={`text-xs font-black uppercase tracking-widest ${isPlayingAudio ? theme.textPrimary : 'text-on-surface-variant'}`}>Mixer</Text>
          </Pressable>
        </View>
      </View>

      {isAudioDrawerOpen && (
        <View className="absolute z-50 bottom-0 left-0 right-0 bg-surface-container-highest rounded-t-[32px] border-t border-slate-200/40 dark:border-slate-800/40 pt-6 pb-10 px-6 shadow-2xl">
          <View className="flex-row justify-between items-center mb-5">
            <View>
              <Text className="text-xl font-black text-on-surface">Zen Sound Studio</Text>
              <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Customize your deep work soundtrack</Text>
            </View>
            <Pressable onPress={() => setIsAudioDrawerOpen(false)} className="p-2 bg-slate-200/30 dark:bg-slate-800/30 rounded-full active:scale-90"><X size={18} color={isDark ? '#fff' : '#000'} /></Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="max-h-[360px] gap-6 mb-6">
            {/* Soundscape Selector */}
            <View className="gap-2">
              <Text className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">1. Select Focus Soundscape</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {SOUNDSCAPES.map(s => {
                  const isSelected = selectedAudio.id === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => changeAudioTrack(s)}
                      style={isSelected ? { backgroundColor: theme.primary + '15', borderColor: theme.primary + '35' } : undefined}
                      className={`px-4 py-2.5 rounded-2xl border active:scale-95 ${isSelected ? 'border-primary' : 'bg-surface border-outline-variant/40'}`}
                    >
                      <Text style={isSelected ? { color: theme.primary } : undefined} className={`text-xs font-black uppercase tracking-wider ${isSelected ? '' : 'text-slate-600 dark:text-slate-350'}`}>
                        {s.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Soundscape Volume Fader */}
            <View className="gap-2 mt-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Soundscape Volume</Text>
                <View style={{ backgroundColor: theme.primary + '15' }} className="px-2 py-0.5 rounded-md border border-outline-variant/30">
                  <Text style={{ color: theme.primary }} className="text-xs font-black">{Math.round(soundscapeVol * 100)}%</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3">
                <Pressable 
                  onPress={() => {
                    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSoundscapeVol(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(1))));
                  }}
                  className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant items-center justify-center active:scale-90"
                >
                  <Text className="text-sm font-black text-on-surface">-</Text>
                </Pressable>
                <View className="flex-1 flex-row gap-1 items-center bg-surface-container/60 p-1.5 rounded-xl border border-outline-variant/30">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const stepVal = (idx + 1) / 10;
                    const isFilled = stepVal <= soundscapeVol;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSoundscapeVol(stepVal);
                        }}
                        style={{
                          flex: 1,
                          height: 14,
                          borderRadius: 4,
                          backgroundColor: isFilled ? theme.primary : (isDark ? '#1e293b' : '#cbd5e1'),
                          opacity: isFilled ? 1 : 0.35,
                        }}
                      />
                    );
                  })}
                </View>
                <Pressable 
                  onPress={() => {
                    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSoundscapeVol(prev => Math.min(1, parseFloat((prev + 0.1).toFixed(1))));
                  }}
                  className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant items-center justify-center active:scale-90"
                >
                  <Text className="text-sm font-black text-on-surface">+</Text>
                </Pressable>
              </View>
            </View>

            <View className="h-[1px] bg-slate-250/20 dark:bg-slate-800/20 my-2" />

            {/* Ambient Overlay Selector */}
            <View className="gap-2">
              <Text className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">2. Blend Ambient Overlay</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {OVERLAYS.map(o => {
                  const isSelected = selectedOverlay.id === o.id;
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => changeOverlayTrack(o)}
                      style={isSelected ? { backgroundColor: theme.primary + '15', borderColor: theme.primary + '35' } : undefined}
                      className={`px-4 py-2.5 rounded-2xl border active:scale-95 ${isSelected ? 'border-primary' : 'bg-surface border-outline-variant/40'}`}
                    >
                      <Text style={isSelected ? { color: theme.primary } : undefined} className={`text-xs font-black uppercase tracking-wider ${isSelected ? '' : 'text-slate-600 dark:text-slate-355'}`}>
                        {o.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Ambient Overlay Volume Fader */}
            <View className="gap-2 mt-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Overlay Volume</Text>
                <View style={{ backgroundColor: theme.primary + '15' }} className="px-2 py-0.5 rounded-md border border-outline-variant/30">
                  <Text style={{ color: theme.primary }} className="text-xs font-black">{Math.round(overlayVol * 100)}%</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3">
                <Pressable 
                  onPress={() => {
                    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setOverlayVol(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(1))));
                  }}
                  className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant items-center justify-center active:scale-90"
                >
                  <Text className="text-sm font-black text-on-surface">-</Text>
                </Pressable>
                <View className="flex-1 flex-row gap-1 items-center bg-surface-container/60 p-1.5 rounded-xl border border-outline-variant/30">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const stepVal = (idx + 1) / 10;
                    const isFilled = stepVal <= overlayVol;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setOverlayVol(stepVal);
                        }}
                        style={{
                          flex: 1,
                          height: 14,
                          borderRadius: 4,
                          backgroundColor: isFilled ? theme.primary : (isDark ? '#1e293b' : '#cbd5e1'),
                          opacity: isFilled ? 1 : 0.35,
                        }}
                      />
                    );
                  })}
                </View>
                <Pressable 
                  onPress={() => {
                    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setOverlayVol(prev => Math.min(1, parseFloat((prev + 0.1).toFixed(1))));
                  }}
                  className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant items-center justify-center active:scale-90"
                >
                  <Text className="text-sm font-black text-on-surface">+</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          <Pressable onPress={toggleAudio} className="w-full py-4 rounded-full items-center justify-center border" style={{ backgroundColor: isPlayingAudio ? '#ffffff' : theme.primary, borderColor: isPlayingAudio ? theme.primary + '40' : theme.primary }}>
            <Text className="font-black uppercase tracking-widest text-sm" style={{ color: isPlayingAudio ? theme.primary : '#ffffff' }}>{isPlayingAudio ? 'Mute' : 'Synthesize Studio'}</Text>
          </Pressable>
        </View>
      )}

      {isDistractionModalOpen && (
        <View className="absolute z-50 bottom-0 left-0 right-0 bg-surface-container-highest rounded-t-[32px] border-t pt-6 pb-10 px-6 shadow-2xl">
          <Text className="text-xl font-black mb-6">Log Interruption</Text>
          {[
            { id: 'external', name: 'External' }, { id: 'digital', name: 'Digital' }, { id: 'fatigue', name: 'Fatigue' },
          ].map(item => (
            <Pressable key={item.id} onPress={() => { logDistraction({ sessionId, category: item.id as any }); setDistractionsCount(prev => prev + 1); setIsDistractionModalOpen(false); }} className="p-4 mb-2 bg-surface rounded-2xl border border-slate-200"><Text>{item.name}</Text></Pressable>
          ))}
        </View>
      )}

      <View className="flex-1 items-center justify-center py-2 px-6">
        <Text className="text-2xl font-black text-on-surface mb-2 text-center">{focusTask.title}</Text>
        <View className="flex-row items-center justify-center gap-1.5 h-12 mb-2">
          {anims.map((anim, index) => <Animated.View key={index} style={{ transform: [{ scaleY: anim }], backgroundColor: theme.primary, width: 4, height: 18, borderRadius: 2, opacity: isPlayingAudio ? 0.9 : 0.35 }} />)}
        </View>
        <View className="relative items-center justify-center mb-8">
          <Svg height="270" width="270" viewBox="0 0 270 270" className="rotate-[-90deg]">
            <Circle cx="135" cy="135" r={radius} stroke={isDark ? '#1e293b' : '#e0e3e5'} strokeWidth="6" fill="none" />
            <Circle cx="135" cy="135" r={radius} stroke={theme.primary} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
          </Svg>
          <View className="absolute items-center justify-center">
            <Text className="text-5xl font-black">{formatTime(timeLeft)}</Text>
            <View className="flex-row gap-4 mt-2">
              <Pressable onPress={toggleTimer} className="w-12 h-12 rounded-full items-center justify-center shadow-md" style={{ backgroundColor: theme.primary }}><Text className="text-white font-bold">{isActive ? '||' : '>'}</Text></Pressable>
              <Pressable onPress={resetTimer} className="w-12 h-12 bg-surface-container-high rounded-full items-center justify-center"><RotateCcw size={18} /></Pressable>
            </View>
          </View>
        </View>
        <View className="flex-col items-center justify-center w-full px-4 gap-3">
          <Pressable onPress={() => setIsDistractionModalOpen(true)} className="w-full h-12 rounded-2xl items-center justify-center bg-red-500/10 border border-red-500/20"><Text className="text-red-500 text-[11px] font-black">LOG INTERRUPTION</Text></Pressable>
          <Pressable onPress={handleDone} className="w-full h-14 rounded-2xl items-center justify-center shadow-md" style={{ backgroundColor: theme.primary }}><Text className="text-on-primary uppercase font-black text-xs">Complete & Exit</Text></Pressable>
        </View>
      </View>
    </SafeScreen>
  );
}

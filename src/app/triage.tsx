import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import Animated, { 
  FadeInRight, 
  FadeOutLeft, 
  LinearTransition, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS 
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Flame, CheckCircle2, PlusCircle, CloudSnow, Sparkles, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react-native';
import { Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '../hooks/use-color-scheme';
import { AdaptiveGlass } from '../components/ui/AdaptiveGlass';
import { useAccentTheme } from '../hooks/useAccentTheme';
import { getSmartCapacityRecommendation } from '../lib/aiPlanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VERTICAL_THRESHOLD = 120;

export default function TriagePage() {
  const router = useRouter();
  const allTasks = useAppStore(state => state.tasks);
  const tasks = allTasks.filter(t => t.status === 'backlog');
  const settings = useAppStore(state => state.settings);
  const updateTask = useAppStore(state => state.updateTask);
  
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const activeTask = tasks[0];

  const handleTriage = (priority: 'must' | 'should' | 'could' | 'wont') => {
    if (!activeTask) return;

    const taskPoints = activeTask.points !== null && activeTask.points !== undefined ? activeTask.points : 2;
    const isAddingLoad = priority !== 'wont';
    
    // Check if adding this task causes overcapacity
    const completedSprints = settings.sprints?.filter(s => s.completedPoints > 0) || [];
    const defaultOptimal = Math.round((settings.dailyCapacity || 8) * (settings.sprintLengthDays || 7) * 0.65);
    const optimalCapacity = completedSprints.length > 0 
      ? Math.round(completedSprints.reduce((sum, s) => sum + s.completedPoints, 0) / completedSprints.length) 
      : defaultOptimal;
    
    const currentLoad = allTasks.filter(t => (t.status === 'sprint' || t.status === 'today') && !t.completed).reduce((sum, t) => sum + (t.points !== null && t.points !== undefined ? t.points : 2), 0);
    const nextLoad = currentLoad + (isAddingLoad ? taskPoints : 0);
    
    if (isAddingLoad && nextLoad > optimalCapacity) {
      if (settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } else {
      if (settings.hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    const status = settings.autoArchiveWontTasks && priority === 'wont' ? 'archive' : 'sprint';
    updateTask(activeTask.id, {
      priority,
      status,
    });
  };

  const recommendation = getSmartCapacityRecommendation(allTasks, settings);
  const currentLoad = recommendation.currentLoad;
  const optimalCapacity = recommendation.optimalCapacity;
  const percentage = Math.min(100, Math.round((currentLoad / optimalCapacity) * 100));

  if (!activeTask) {
    return (
      <SafeScreen className="flex-1 bg-background" scrollable={false}>
        <View className="flex-1 items-center justify-center p-4">
          <AdaptiveGlass
            style={{
              padding: 32,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.3)' : '0 10px 25px rgba(0, 0, 0, 0.05)',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxWidth: 400,
            }}
          >
            <View className="bg-tertiary/15 p-6 rounded-full border border-tertiary/25 mb-6">
              <Sparkles color={theme.tertiary} size={48} />
            </View>
            <View className="items-center mb-6">
              <Text className="text-3xl font-black text-on-surface mb-2 text-center">Triage Complete!</Text>
              <Text className="text-slate-650 dark:text-slate-300 text-center max-w-sm">
                Your backlog is fully prioritized. Check the Board to start your sprint.
              </Text>
            </View>
            <Pressable 
              onPress={() => router.push('/')}
              className="bg-primary px-8 py-3.5 rounded-full shadow-md active:opacity-90"
              style={{ backgroundColor: theme.primary }}
            >
              <Text className="text-on-primary font-black uppercase tracking-wider text-sm">View Daily Board</Text>
            </Pressable>
          </AdaptiveGlass>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="flex-1 bg-background" scrollable={true}>
      <View className="flex-1 items-center justify-center w-full max-w-md mx-auto py-4 px-4">
        <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest mb-4">
          Backlog Triage ({tasks.length} remaining)
        </Text>
        
        {/* Capacity Advisor Dashboard Panel */}
        <AdaptiveGlass
          style={{
            padding: 16,
            borderRadius: 24,
            width: '100%',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.03)',
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <Flame size={16} color={
                recommendation.level === 'danger' ? theme.primary :
                recommendation.level === 'warning' ? theme.secondary : theme.tertiary
              } />
              <Text className="text-xs font-black uppercase tracking-wider text-on-surface">
                {recommendation.title}
              </Text>
            </View>
            <Text className="text-xs font-black text-slate-650 dark:text-slate-300">
              {currentLoad} / {optimalCapacity} pts ({percentage}%)
            </Text>
          </View>
          <View className="h-2.5 w-full bg-slate-200/40 dark:bg-slate-800/40 rounded-full overflow-hidden mb-3.5 border border-slate-200/10 dark:border-slate-800/10">
            <View 
              className="h-full rounded-full"
              style={{ 
                width: `${percentage}%`,
                backgroundColor: 
                  recommendation.level === 'danger' ? theme.primary : 
                  recommendation.level === 'warning' ? theme.secondary : theme.tertiary
              }}
            />
          </View>
          <Text className="text-xs leading-relaxed text-slate-650 dark:text-slate-300">
            {recommendation.message}
          </Text>
        </AdaptiveGlass>
        
        {/* Triage Deck Card */}
        <TriageCard task={activeTask} onTriage={handleTriage} />

        {/* Swipe Instructions overlay */}
        <View className="flex-row items-center justify-between w-full px-6 mt-6">
          <View className="items-center opacity-70">
            <ChevronLeft color="#64748b" size={20} />
            <Text className="text-xs font-black uppercase text-slate-650 dark:text-slate-300 mt-1">Won't</Text>
          </View>
          <View className="items-center opacity-70">
            <ChevronUp color={theme.secondary} size={20} />
            <Text className="text-xs font-black uppercase text-secondary mt-1">Should</Text>
          </View>
          <View className="items-center opacity-70">
            <ChevronDown color={theme.tertiary} size={20} />
            <Text className="text-xs font-black uppercase text-tertiary mt-1">Could</Text>
          </View>
          <View className="items-center opacity-70">
            <ChevronRight color={theme.primary} size={20} />
            <Text className="text-xs font-black uppercase text-primary mt-1">Must</Text>
          </View>
        </View>
      </View>
    </SafeScreen>
  );
}

function TriageCard({ task, onTriage }: { task: any; onTriage: (p: 'must' | 'should' | 'could' | 'wont') => void }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const theme = useAccentTheme();

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { velocity: e.velocityX });
        runOnJS(onTriage)('must');
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { velocity: e.velocityX });
        runOnJS(onTriage)('wont');
      } else if (e.translationY < -VERTICAL_THRESHOLD) {
        translateY.value = withSpring(-800, { velocity: e.velocityY });
        runOnJS(onTriage)('should');
      } else if (e.translationY > VERTICAL_THRESHOLD) {
        translateY.value = withSpring(800, { velocity: e.velocityY });
        runOnJS(onTriage)('could');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = (translateX.value / SCREEN_WIDTH) * 15;
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const mustStyle = useAnimatedStyle(() => {
    const opacity = translateX.value > 0 ? Math.min(0.95, translateX.value / SWIPE_THRESHOLD) : 0;
    return { opacity };
  });

  const wontStyle = useAnimatedStyle(() => {
    const opacity = translateX.value < 0 ? Math.min(0.95, -translateX.value / SWIPE_THRESHOLD) : 0;
    return { opacity };
  });

  const shouldStyle = useAnimatedStyle(() => {
    const opacity = translateY.value < 0 ? Math.min(0.95, -translateY.value / VERTICAL_THRESHOLD) : 0;
    return { opacity };
  });

  const couldStyle = useAnimatedStyle(() => {
    const opacity = translateY.value > 0 ? Math.min(0.95, translateY.value / VERTICAL_THRESHOLD) : 0;
    return { opacity };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        key={task.id}
        entering={FadeInRight.springify().damping(15)}
        exiting={FadeOutLeft.duration(200)}
        layout={LinearTransition}
        style={[animatedStyle, { width: '100%', aspectRatio: 4/3, marginBottom: 16, zIndex: 10 }]}
      >
        <AdaptiveGlass
          style={{
            flex: 1,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.3)' : '0 10px 25px rgba(0, 0, 0, 0.05)',
            padding: 24,
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <View className="bg-slate-200/40 dark:bg-slate-800/40 px-3 py-1 rounded-full mb-3 border border-slate-200/20 dark:border-slate-800/20">
            <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">
              {task.type || 'Feature'} • {task.points !== null && task.points !== undefined ? task.points : 2} pts
            </Text>
          </View>
          <Text className="text-3xl font-black text-on-surface text-center mb-3 px-2 leading-tight">
            {task.title}
          </Text>
          <Text className="text-sm text-slate-650 dark:text-slate-300 text-center px-4 leading-normal" numberOfLines={4}>
            {task.description || "No description provided. Swipe to decide its priority."}
          </Text>

          {/* Live Swipe Banners */}
          <Animated.View 
            pointerEvents="none" 
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.primary, padding: 24 }, mustStyle]}
          >
            <Flame color="white" size={48} />
            <Text className="text-white font-black text-2xl mt-3 uppercase tracking-wider">MUST-HAVE</Text>
            <Text className="text-white/80 font-bold text-sm mt-1">+{task.points !== null && task.points !== undefined ? task.points : 2} pts to Sprint Load</Text>
          </Animated.View>

          <Animated.View 
            pointerEvents="none" 
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.secondary, padding: 24 }, shouldStyle]}
          >
            <CheckCircle2 color="white" size={48} />
            <Text className="text-white font-black text-2xl mt-3 uppercase tracking-wider">SHOULD-HAVE</Text>
            <Text className="text-white/80 font-bold text-sm mt-1">+{task.points !== null && task.points !== undefined ? task.points : 2} pts to Sprint Load</Text>
          </Animated.View>

          <Animated.View 
            pointerEvents="none" 
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.tertiary, padding: 24 }, couldStyle]}
          >
            <PlusCircle color="white" size={48} />
            <Text className="text-white font-black text-2xl mt-3 uppercase tracking-wider">COULD-HAVE</Text>
            <Text className="text-white/80 font-bold text-sm mt-1">+{task.points !== null && task.points !== undefined ? task.points : 2} pts to Sprint Load</Text>
          </Animated.View>

          <Animated.View 
            pointerEvents="none" 
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#64748b', padding: 24 }, wontStyle]}
          >
            <CloudSnow color="white" size={48} />
            <Text className="text-white font-black text-2xl mt-3 uppercase tracking-wider">WON'T-HAVE</Text>
            <Text className="text-white/80 font-bold text-sm mt-1">+0 pts (Moved to Backlog/Archive)</Text>
          </Animated.View>

        </AdaptiveGlass>
      </Animated.View>
    </GestureDetector>
  );
}



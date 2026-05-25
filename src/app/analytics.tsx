import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { AdaptiveGlass } from '../components/ui/AdaptiveGlass';
import { TrendingUp, Award, Target, Info, Sparkles, BarChart2, Lock, History, ChevronRight, MessageSquare, AlertCircle, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { generateDailyCoachRetrospective } from '../lib/aiPlanner';
import { useAccentTheme } from '../hooks/useAccentTheme';
import Svg, { Rect, Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { SprintScorecardModal } from '../components/SprintScorecardModal';
import { ConfettiReward, ConfettiRewardRef } from '../components/ConfettiReward';

export default function AnalyticsPage() {
  const router = useRouter();
  const tasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const archiveCompletedTasks = useAppStore(state => state.archiveCompletedTasks);
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const confettiRef = React.useRef<ConfettiRewardRef>(null);
  const [streakModalVisible, setStreakModalVisible] = React.useState(false);
  const [streakEarned, setStreakEarned] = React.useState(0);

  const [isLoadingCoach, setIsLoadingCoach] = React.useState(false);
  const [selectedSprintForShare, setSelectedSprintForShare] = React.useState<any | null>(null);
  const [shareModalVisible, setShareModalVisible] = React.useState(false);

  const consultCoach = async () => {
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsLoadingCoach(true);
    try {
      const response = await generateDailyCoachRetrospective(tasks, settings);
      updateSettings({
        latestAiCoachMessage: response,
        lastCoachGeneratedDate: new Date().toLocaleDateString(),
      });
      if (settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error(e);
      if (settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsLoadingCoach(false);
    }
  };

  // Compute Must-Have Metrics
  const mustHaves = tasks.filter(t => t.priority === 'must');
  const completedMustHaves = mustHaves.filter(t => t.completed);
  const completionRate = mustHaves.length === 0 ? 0 : Math.round((completedMustHaves.length / mustHaves.length) * 100);

  // Compute Point Usage
  const boardTasks = tasks.filter(t => t.status === 'today');
  const usedPoints = boardTasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const isUnderCapacity = usedPoints <= settings.dailyCapacity;

  const simulateDayCompletion = () => {
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (isUnderCapacity) {
      const newStreak = settings.currentStreakDays + 1;
      updateSettings({
        currentStreakDays: newStreak,
        longestStreakDays: Math.max(newStreak, settings.longestStreakDays)
      });
      setStreakEarned(newStreak);
      setStreakModalVisible(true);
      setTimeout(() => {
        confettiRef.current?.fire();
      }, 300);
    } else {
      updateSettings({ currentStreakDays: 0 });
    }
    archiveCompletedTasks();
  };

  // ----------------------------------------------------
  // SPRINT RETROSPECTIVE & VELOCITY ANALYTICS
  // ----------------------------------------------------
  const sprints = settings.sprints || [];

  const generateSimulatedSprints = () => {
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const mockSprints = [
      {
        id: 'mock-1',
        sprintNumber: 1,
        startDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        totalPoints: 12,
        completedPoints: 9,
        completedMusts: 4,
        totalMusts: 5,
        velocityScore: 75,
        notes: 'Initial sprint focusing on onboarding and app shell skeleton. Learned how to manage local state cleanly.'
      },
      {
        id: 'mock-2',
        sprintNumber: 2,
        startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        totalPoints: 15,
        completedPoints: 12,
        completedMusts: 5,
        totalMusts: 5,
        velocityScore: 80,
        notes: 'Perfect Must-Have rate! Refined layout styling and established bottom tab layout integration.'
      },
      {
        id: 'mock-3',
        sprintNumber: 3,
        startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        totalPoints: 18,
        completedPoints: 14,
        completedMusts: 4,
        totalMusts: 6,
        velocityScore: 77,
        notes: 'Encountered some complexity overflow during task triaging. Improved capacity estimations for future sprints.'
      },
      {
        id: 'mock-4',
        sprintNumber: 4,
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        totalPoints: 14,
        completedPoints: 14,
        completedMusts: 6,
        totalMusts: 6,
        velocityScore: 100,
        notes: 'Outstanding sprint! 100% capacity efficiency and perfect Must-Have execution. Team morale is peak.'
      },
      {
        id: 'mock-5',
        sprintNumber: 5,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        totalPoints: 16,
        completedPoints: 15,
        completedMusts: 5,
        totalMusts: 5,
        velocityScore: 93,
        notes: 'Fabulous focus. Polished dynamic color theme selections and tested interactive retro modal layouts.'
      }
    ];
    updateSettings({ sprints: mockSprints, sprintNumber: 6 });
  };

  const clearSprintHistory = () => {
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updateSettings({ sprints: [], sprintNumber: 1 });
  };

  // Metrics calculators
  const averageVelocity = sprints.length > 0 
    ? Math.round(sprints.reduce((sum, s) => sum + s.velocityScore, 0) / sprints.length) 
    : 0;

  const totalSprintsCompleted = sprints.length;
  
  const averagePointsCompleted = sprints.length > 0
    ? (sprints.reduce((sum, s) => sum + s.completedPoints, 0) / sprints.length).toFixed(1)
    : '0';

  const averageMustSuccessRate = sprints.length > 0
    ? Math.round((sprints.reduce((sum, s) => sum + (s.totalMusts > 0 ? (s.completedMusts / s.totalMusts) : 0), 0) / sprints.length) * 100)
    : 0;

  // Backlog Friction & Sprint Health Index Calculations
  const activeTasksWithRollover = tasks.filter(t => !t.completed && t.status !== 'archive');
  const sumRolloverCounts = activeTasksWithRollover.reduce((sum, t) => sum + (t.rolloverCount || 0), 0);
  const uncompletedMustsCount = tasks.filter(t => !t.completed && t.priority === 'must' && t.status !== 'archive').length;
  
  const rawScore = 100 - (sumRolloverCounts * 12) - (uncompletedMustsCount * 15);
  const frictionScore = Math.max(0, Math.min(100, rawScore));

  // Render SVG velocity line/bar chart
  const renderVelocityChart = () => {
    if (sprints.length === 0) return null;

    const chartWidth = 320;
    const chartHeight = 160;
    const padding = 24;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;
    
    // Last 5 sprints max
    const activeSprints = sprints.slice(-5);
    const sprintCount = activeSprints.length;

    // Y values: Max of either points completed or 20 points
    const maxPoints = Math.max(20, ...activeSprints.map(s => s.totalPoints));
    
    // Bar coordinates
    const barWidth = 14;
    const pointsCoordinates = activeSprints.map((s, idx) => {
      const x = padding + (graphWidth / (sprintCount > 1 ? sprintCount - 1 : 1)) * idx;
      
      const totalBarHeight = (s.totalPoints / maxPoints) * graphHeight;
      const completedBarHeight = (s.completedPoints / maxPoints) * graphHeight;
      
      const yTotal = chartHeight - padding - totalBarHeight;
      const yCompleted = chartHeight - padding - completedBarHeight;
      
      return { x, yTotal, yCompleted, totalHeight: totalBarHeight, completedHeight: completedBarHeight, ...s };
    });

    // Line coordinates for Velocity Score (0 to 100%)
    const scoreCoordinates = activeSprints.map((s, idx) => {
      const x = padding + (graphWidth / (sprintCount > 1 ? sprintCount - 1 : 1)) * idx;
      // Map 0-100 score to graphHeight
      const y = chartHeight - padding - (s.velocityScore / 100) * graphHeight;
      return { x, y, score: s.velocityScore };
    });

    // Construct Line Path (d attribute)
    let linePath = '';
    scoreCoordinates.forEach((coord, idx) => {
      if (idx === 0) {
        linePath += `M ${coord.x} ${coord.y}`;
      } else {
        linePath += ` L ${coord.x} ${coord.y}`;
      }
    });

    return (
      <View className="items-center my-4 bg-surface-container-low/40 p-4 rounded-2xl border border-slate-200/10 dark:border-slate-800/10">
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          <Line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke={isDark ? '#27313f' : '#e6e8ea'} strokeWidth="1" />
          <Line x1={padding} y1={padding + graphHeight / 2} x2={chartWidth - padding} y2={padding + graphHeight / 2} stroke={isDark ? '#27313f' : '#e6e8ea'} strokeWidth="1" strokeDasharray="4 4" />
          <Line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke={isDark ? '#27313f' : '#e6e8ea'} strokeWidth="1.5" />

          {/* Left Y Axis label */}
          <SvgText x={padding - 6} y={padding + 4} fill={isDark ? '#9ca3af' : '#6b7280'} fontSize="8" fontWeight="bold" textAnchor="end">
            {maxPoints}pt
          </SvgText>
          <SvgText x={padding - 6} y={padding + graphHeight / 2 + 3} fill={isDark ? '#9ca3af' : '#6b7280'} fontSize="8" fontWeight="bold" textAnchor="end">
            {Math.round(maxPoints / 2)}pt
          </SvgText>
          <SvgText x={padding - 6} y={chartHeight - padding + 3} fill={isDark ? '#9ca3af' : '#6b7280'} fontSize="8" fontWeight="bold" textAnchor="end">
            0pt
          </SvgText>

          {/* Right Y Axis label (Velocity Score %) */}
          <SvgText x={chartWidth - padding + 6} y={padding + 4} fill={theme.primary} fontSize="8" fontWeight="black" textAnchor="start">
            100%
          </SvgText>
          <SvgText x={chartWidth - padding + 6} y={chartHeight - padding + 3} fill={theme.primary} fontSize="8" fontWeight="black" textAnchor="start">
            0%
          </SvgText>

          {/* Draw Point Completion Bars */}
          {pointsCoordinates.map((pt, idx) => {
            // Draw Total Points Estimations (translucent background bar)
            return (
              <G key={`bar-g-${idx}`}>
                <Rect 
                  x={pt.x - barWidth / 2} 
                  y={pt.yTotal} 
                  width={barWidth} 
                  height={pt.totalHeight} 
                  fill={isDark ? '#27313f' : '#e6e8ea'} 
                  rx="3"
                />
                {/* Completed Points (filled active bar) */}
                <Rect 
                  x={pt.x - barWidth / 2} 
                  y={pt.yCompleted} 
                  width={barWidth} 
                  height={pt.completedHeight} 
                  fill={theme.primary + '50'} 
                  rx="3"
                />
              </G>
            );
          })}

          {/* Draw Velocity Score Sparkline path */}
          {linePath !== '' && (
            <Path 
              d={linePath} 
              fill="none" 
              stroke={theme.primary} 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {/* Draw Velocity Score Node circles */}
          {scoreCoordinates.map((coord, idx) => (
            <G key={`circle-g-${idx}`}>
              <Circle 
                cx={coord.x} 
                cy={coord.y} 
                r="5" 
                fill={isDark ? '#121c2a' : '#ffffff'} 
                stroke={theme.primary} 
                strokeWidth="2.5" 
              />
              <SvgText 
                x={coord.x} 
                y={coord.y - 8} 
                fill={theme.primary} 
                fontSize="8" 
                fontWeight="black" 
                textAnchor="middle"
              >
                {coord.score}%
              </SvgText>
            </G>
          ))}

          {/* X Axis labels (Sprint numbers) */}
          {pointsCoordinates.map((pt, idx) => (
            <SvgText 
              key={`x-label-${idx}`}
              x={pt.x} 
              y={chartHeight - padding + 14} 
              fill={isDark ? '#9ca3af' : '#6b7280'} 
              fontSize="9" 
              fontWeight="bold" 
              textAnchor="middle"
            >
              S{pt.sprintNumber}
            </SvgText>
          ))}
        </Svg>
        
        {/* Chart Legend */}
        <View className="flex-row justify-center gap-6 mt-2 flex-wrap">
          <View className="flex-row items-center gap-1.5">
            <View className="w-3 h-3 bg-slate-200/60 dark:bg-slate-800/60 rounded-sm" />
            <Text className="text-xs font-bold text-on-surface-variant uppercase">Estimated Points</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View style={{ backgroundColor: theme.primary + '50' }} className="w-3 h-3 rounded-sm" />
            <Text className="text-xs font-bold text-on-surface-variant uppercase">Completed Points</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View style={{ backgroundColor: theme.primary }} className="w-4 h-1.5 rounded-full" />
            <Text className="text-xs font-black text-primary uppercase tracking-wider">Velocity Score</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeScreen className="flex-1 bg-background relative">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        
        <View className="flex-row items-center gap-3 mb-8 mt-4">
          <TrendingUp size={32} color={theme.primary} />
          <Text className="text-4xl font-black text-on-surface tracking-tight">Analytics</Text>
        </View>

        {/* Completion Rate Widget (Free Tier Feature - Always Fully Visible) */}
        <AdaptiveGlass className="p-6 rounded-3xl mb-6 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-on-surface-variant font-bold uppercase tracking-widest text-xs mb-1">Must-Have Success</Text>
            <Text className="text-on-surface font-black text-5xl tracking-tighter">{completionRate}%</Text>
            <Text className="text-on-surface-variant text-sm mt-2">
              {completedMustHaves.length} of {mustHaves.length} critical tasks finished.
            </Text>
          </View>
          <View className="w-24 h-24 rounded-full border-[8px] border-surface-container-highest items-center justify-center relative">
            <View className={`absolute w-24 h-24 rounded-full border-[8px] border-primary ${completionRate === 100 ? 'opacity-100' : 'opacity-20'}`} />
            <Target size={32} color={completionRate > 50 ? theme.primary : '#73777f'} />
          </View>
        </AdaptiveGlass>

        {/* Unified Gated Container for Pro Features */}
        <View className="relative">
          <View pointerEvents={!settings.isPremium ? 'none' : 'auto'} className={!settings.isPremium ? 'opacity-20 select-none' : ''}>
            
            {/* SVG "Sprint Friction" Dial Gauge */}
            {(() => {
              // Needle angle calculation (0 score points to -180 deg, 100 score points to 0 deg)
              const angleRad = (-180 + (frictionScore * 1.8)) * Math.PI / 180;
              const needleX = 150 + 75 * Math.cos(angleRad);
              const needleY = 135 + 75 * Math.sin(angleRad);

              // Grade determination
              let agilityGrade = 'F';
              let gradeColor = 'text-red-500';
              let gradeBg = 'bg-red-500/10';
              let advice = '';

              if (frictionScore >= 90) {
                agilityGrade = 'A+';
                gradeColor = 'text-emerald-500';
                gradeBg = 'bg-emerald-500/10';
                advice = 'Pristine backlog health! Your velocity is clean and tasks are well scoped. Maintain this flow by preventing large backlog piles.';
              } else if (frictionScore >= 80) {
                agilityGrade = 'A';
                gradeColor = 'text-emerald-500';
                gradeBg = 'bg-emerald-500/10';
                advice = 'Pristine backlog health! Your velocity is clean and tasks are well scoped. Maintain this flow by preventing large backlog piles.';
              } else if (frictionScore >= 70) {
                agilityGrade = 'B';
                gradeColor = 'text-blue-500';
                gradeBg = 'bg-blue-500/10';
                advice = 'Good agility! Minimal friction detected. Ensure any rollover task from the previous sprint is prioritized or decomposed to keep boards tidy.';
              } else if (frictionScore >= 50) {
                agilityGrade = 'C';
                gradeColor = 'text-amber-500';
                gradeBg = 'bg-amber-500/10';
                advice = 'Moderate congestion. Must-Have tasks are starting to pile up. Consider running a 5-minute triage session to demote secondary items.';
              } else if (frictionScore >= 30) {
                agilityGrade = 'D';
                gradeColor = 'text-orange-500';
                gradeBg = 'bg-orange-500/10';
                advice = 'Critical friction overload! Stale tasks are decaying in the backlog, blocking team momentum. Drop stale tasks using the Backlog Friction Optimizer or trigger AI Splits now!';
              } else {
                agilityGrade = 'F';
                gradeColor = 'text-red-500';
                gradeBg = 'bg-red-500/10';
                advice = 'Critical friction overload! Stale tasks are decaying in the backlog, blocking team momentum. Drop stale tasks using the Backlog Friction Optimizer or trigger AI Splits now!';
              }

              return (
                <AdaptiveGlass className="p-6 rounded-3xl mb-6">
                  <View className="flex-row items-center gap-2 mb-4">
                    <Target size={20} color={theme.primary} />
                    <Text className="text-on-surface font-black text-xl tracking-tight">Sprint Friction Gauge</Text>
                  </View>

                  <Text className="text-xs text-on-surface-variant mb-6">
                    Calculates cognitive drag based on task rollover decay rate and active Must-Have backlogs.
                  </Text>

                  <View className="items-center justify-center my-2 relative">
                    <Svg width="300" height="160">
                      {/* Segment 1: Red (Friction, 0 to 33) */}
                      <Path 
                        d="M 50 135 A 100 100 0 0 1 100 48.4" 
                        fill="none" 
                        stroke="#ef4444" 
                        strokeWidth="14" 
                        strokeLinecap="round" 
                      />
                      {/* Segment 2: Yellow (Moderate, 33 to 66) */}
                      <Path 
                        d="M 100 48.4 A 100 100 0 0 1 200 48.4" 
                        fill="none" 
                        stroke="#f59e0b" 
                        strokeWidth="14" 
                        strokeLinecap="round" 
                      />
                      {/* Segment 3: Green (Agile, 66 to 100) */}
                      <Path 
                        d="M 200 48.4 A 100 100 0 0 1 250 135" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="14" 
                        strokeLinecap="round" 
                      />

                      {/* Needle line */}
                      <Line 
                        x1="150" 
                        y1="135" 
                        x2={needleX} 
                        y2={needleY} 
                        stroke={isDark ? '#f8fafc' : '#0f172a'} 
                        strokeWidth="4.5" 
                        strokeLinecap="round" 
                      />

                      {/* Anchor point */}
                      <Circle 
                        cx="150" 
                        cy="135" 
                        r="8.5" 
                        fill={theme.primary} 
                        stroke={isDark ? '#121c2a' : '#ffffff'} 
                        strokeWidth="2.5" 
                      />
                    </Svg>

                    <View className="absolute bottom-2 items-center">
                      <Text className="text-3xl font-black text-on-surface tracking-tighter">{frictionScore}</Text>
                      <Text className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Agility Index</Text>
                    </View>
                  </View>

                  {/* Score breakdown metrics */}
                  <View className="flex-row gap-3 mt-4 border-t border-slate-250/20 dark:border-slate-700/20 pt-4 flex-wrap">
                    <View className="flex-1 min-w-[120px] items-center p-3 bg-surface-container-low/40 rounded-2xl border border-slate-200/15 dark:border-slate-800/15">
                      <Text className="text-[10px] font-black text-slate-650 dark:text-slate-350 uppercase tracking-widest">Active Rollover Sum</Text>
                      <Text className="text-lg font-black text-on-surface mt-1">{sumRolloverCounts}</Text>
                    </View>
                    <View className="flex-1 min-w-[120px] items-center p-3 bg-surface-container-low/40 rounded-2xl border border-slate-200/15 dark:border-slate-800/15">
                      <Text className="text-[10px] font-black text-slate-650 dark:text-slate-350 uppercase tracking-widest">Must-Have Bottlenecks</Text>
                      <Text className="text-lg font-black text-on-surface mt-1">{sumRolloverCounts > 0 || uncompletedMustsCount > 0 ? uncompletedMustsCount : 0}</Text>
                    </View>
                  </View>

                  {/* Interactive Coach Feedback Card */}
                  <View className="mt-4 bg-slate-200/25 dark:bg-slate-800/25 border border-slate-200/20 dark:border-slate-800/20 p-4 rounded-2xl flex-row items-center gap-3">
                    <View className={`w-12 h-12 rounded-xl ${gradeBg} items-center justify-center`}>
                      <Text className={`text-xl font-black ${gradeColor}`}>{agilityGrade}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-black text-on-surface uppercase tracking-wider">Agility Coach Recommendation</Text>
                      <Text className="text-xs text-slate-650 dark:text-slate-300 mt-1 leading-relaxed">{advice}</Text>
                    </View>
                  </View>
                </AdaptiveGlass>
              );
            })()}

            {/* AI Daily Coach Section */}
            <AdaptiveGlass className="p-6 rounded-3xl mb-6 relative overflow-hidden">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-2.5">
                  <View className="p-2 bg-red-500/10 dark:bg-red-950/20 rounded-xl">
                    <Sparkles size={20} color={theme.primary} />
                  </View>
                  <View>
                    <Text className="text-on-surface font-black text-xl tracking-tight">Daily Coach</Text>
                    <Text className="text-xs font-black uppercase tracking-widest text-primary">AI Assistant</Text>
                  </View>
                </View>
                
                {settings.latestAiCoachMessage && !isLoadingCoach ? (
                  <Pressable 
                    onPress={consultCoach} 
                    className="px-3 py-1.5 bg-surface-variant/40 rounded-full active:opacity-70"
                  >
                    <Text className="text-xs font-black uppercase tracking-wider text-primary">Refresh</Text>
                  </Pressable>
                ) : null}
              </View>

              {isLoadingCoach ? (
                <View className="py-6 items-center justify-center gap-3">
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text className="text-xs text-on-surface-variant font-bold uppercase tracking-widest animate-pulse">Consulting advisor…</Text>
                </View>
              ) : settings.latestAiCoachMessage ? (
                <View className="bg-surface-container-lowest/40 border border-slate-200/20 dark:border-slate-800/20 p-4 rounded-2xl mb-2">
                  <Text className="text-on-surface text-sm leading-relaxed font-medium">
                    {settings.latestAiCoachMessage}
                  </Text>
                  {settings.lastCoachGeneratedDate ? (
                    <Text className="text-xs text-slate-650/60 dark:text-slate-300/60 font-black uppercase tracking-wider mt-3 text-right">
                      Retrospective • {settings.lastCoachGeneratedDate}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View className="py-4 items-center justify-center gap-4">
                  <Text className="text-on-surface-variant text-sm text-center font-medium leading-relaxed px-4">
                    {"Let's review your progress and prioritization to build stronger, more sustainable focus habits."}
                  </Text>
                  <Pressable 
                    onPress={consultCoach}
                    style={{ backgroundColor: theme.primary }}
                    className="px-6 py-3.5 rounded-2xl shadow-sm w-full items-center justify-center active:opacity-90"
                  >
                    <Text className="text-on-primary font-black uppercase tracking-wider text-xs">
                      Generate Daily Review
                    </Text>
                  </Pressable>
                </View>
              )}
            </AdaptiveGlass>

            {/* Sprint Retro Velocity Widget */}
            <AdaptiveGlass className="p-6 rounded-3xl mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <BarChart2 size={20} color={theme.primary} />
                  <Text className="text-on-surface font-black text-xl tracking-tight">Sprint Velocity</Text>
                </View>
                {sprints.length > 0 ? (
                  <View style={{ backgroundColor: theme.primary + '20' }} className="px-3 py-1 rounded-full border border-primary/10">
                    <Text style={{ color: theme.primary }} className="font-black text-xs uppercase tracking-widest">
                      Avg Score: {averageVelocity}%
                    </Text>
                  </View>
                ) : null}
              </View>
              
              <Text className="text-xs text-on-surface-variant mb-4">Track completion rates, story point capacity trends, and efficiency metrics across your sprints.</Text>

              {sprints.length === 0 ? (
                // Blank state calling simulation
                <View className="border border-dashed border-slate-200/40 dark:border-slate-800/40 p-6 rounded-2xl items-center gap-4 bg-surface-container-low/30">
                  <AlertCircle size={32} color={isDark ? '#4b5563' : '#9ca3af'} />
                  <View className="items-center">
                    <Text className="text-sm font-black text-on-surface text-center">No Sprint History Found</Text>
                    <Text className="text-xs text-on-surface-variant text-center mt-1 px-4 leading-4">
                      Complete daily retrospects to build real velocity logs, or instantly mock past sprints to preview high-end charts.
                    </Text>
                  </View>
                  <Pressable
                    onPress={generateSimulatedSprints}
                    style={{ backgroundColor: theme.primary }}
                    className="px-5 py-3 rounded-xl active:opacity-95 shadow-sm"
                  >
                    <Text className="text-on-primary font-black text-xs uppercase tracking-widest">Simulate 5 Sprints</Text>
                  </Pressable>
                </View>
              ) : (
                // Visual SVG Velocity chart
                <>
                  {renderVelocityChart()}

                  {/* KPI cards Grid */}
                  <View className="flex-row gap-3 mt-4">
                    <View className="flex-1 bg-surface-container-lowest/30 p-3 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
                      <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">Total Sprints</Text>
                      <Text className="text-xl font-black text-on-surface mt-1">{totalSprintsCompleted}</Text>
                    </View>
                    <View className="flex-1 bg-surface-container-lowest/30 p-3 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
                      <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">Avg Must-Haves</Text>
                      <Text style={{ color: theme.primary }} className="text-xl font-black mt-1">{averageMustSuccessRate}%</Text>
                    </View>
                    <View className="flex-1 bg-surface-container-lowest/30 p-3 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
                      <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">Avg completed</Text>
                      <Text className="text-xl font-black text-on-surface mt-1">{averagePointsCompleted} pt</Text>
                    </View>
                  </View>
                </>
              )}
            </AdaptiveGlass>

            {/* Retrospective Log (Shows only when sprints exist) */}
            {sprints.length > 0 && (
              <AdaptiveGlass className="p-6 rounded-3xl mb-6">
                <View className="flex-row items-center gap-2 mb-4">
                  <History size={20} color={theme.primary} />
                  <Text className="text-on-surface font-black text-xl tracking-tight">Retrospective Log</Text>
                </View>
                
                <View className="gap-4">
                  {sprints.slice().reverse().map((s) => (
                    <View key={s.id} className="bg-surface-container/45 rounded-2xl p-4 border border-slate-200/15 dark:border-slate-800/15">
                      <View className="flex-row justify-between items-center mb-2 flex-wrap gap-2">
                        <View className="flex-row items-center gap-2">
                          <View style={{ backgroundColor: theme.primary }} className="px-2.5 py-0.5 rounded-full">
                            <Text className="text-on-primary font-black text-xs uppercase tracking-widest">Sprint {s.sprintNumber}</Text>
                          </View>
                          <Text className="text-xs text-slate-650 dark:text-slate-300 font-semibold">
                            {new Date(s.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2.5">
                          <Text style={{ color: theme.primary }} className="text-xs font-black">
                            {s.velocityScore}% Efficiency
                          </Text>
                          <Pressable
                            onPress={() => {
                              if (settings.hapticsEnabled) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }
                              setSelectedSprintForShare(s);
                              setShareModalVisible(true);
                            }}
                            className="p-1 rounded-lg bg-surface-container-high/60 active:opacity-75"
                          >
                            <Share2 size={12} color={theme.primary} />
                          </Pressable>
                        </View>
                      </View>
                      
                      {s.notes ? (
                        <View className="flex-row gap-2 mt-2 bg-surface-container-lowest/40 p-3 rounded-xl border border-slate-200/10 dark:border-slate-800/10">
                          <MessageSquare size={12} color={theme.primary} className="mt-0.5 opacity-70" />
                          <Text className="text-xs text-on-surface font-medium leading-relaxed flex-1 italic">
                            &quot;{s.notes}&quot;
                          </Text>
                        </View>
                      ) : null}
                      
                      <View className="flex-row justify-between mt-3 px-1 text-xs text-on-surface-variant font-bold">
                        <Text className="text-xs text-on-surface-variant">Points Completed: <Text className="font-black text-on-surface">{s.completedPoints}/{s.totalPoints}</Text></Text>
                        <Text className="text-xs text-on-surface-variant">Musts Finished: <Text className="font-black text-on-surface">{s.completedMusts}/{s.totalMusts}</Text></Text>
                      </View>
                    </View>
                  ))}
                </View>
                
                <Pressable
                  onPress={clearSprintHistory}
                  className="mt-6 py-3.5 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl items-center justify-center bg-surface-container-low/40 active:opacity-70"
                >
                  <Text className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Clear Sprint History</Text>
                </Pressable>
              </AdaptiveGlass>
            )}

            {/* Capacity Streak Widget */}
            <AdaptiveGlass
              style={{
                backgroundColor: isDark ? 'rgba(127, 29, 29, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                borderColor: isDark ? 'rgba(127, 29, 29, 0.3)' : 'rgba(239, 68, 68, 0.25)',
              }}
              className="p-6 rounded-3xl mb-6"
            >
              <View className="flex-row items-center gap-2 mb-4">
                <Award size={24} color={theme.primary} />
                <Text className="text-primary font-black text-xl tracking-tight">Discipline Streak</Text>
              </View>

              <View className="flex-row items-center justify-between mb-4">
                <View className="items-center flex-1">
                  <Text className="text-primary font-black text-6xl tracking-tighter">{settings.currentStreakDays}</Text>
                  <Text className="text-primary font-bold text-sm uppercase tracking-widest">Current</Text>
                </View>
                <View className="w-[1px] h-12 bg-red-500/20 dark:bg-red-950/40 mx-4" />
                <View className="items-center flex-1">
                  <Text className="text-on-surface font-black text-4xl tracking-tighter">{settings.longestStreakDays}</Text>
                  <Text className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">Record</Text>
                </View>
              </View>

              <Text className="text-on-surface text-center text-sm leading-relaxed mb-6 px-4">
                {settings.currentStreakDays === 0 
                  ? "Stay under your capacity limit to build a streak!" 
                  : `You've stayed within your daily capacity for ${settings.currentStreakDays} consecutive days. Great balance!`}
              </Text>

              {/* Dev Simulate Button */}
              <Pressable 
                onPress={simulateDayCompletion}
                style={{ backgroundColor: isUnderCapacity ? theme.primary : '#b61722' }}
                className="py-3.5 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90 shadow-sm"
              >
                <Text className="font-black uppercase tracking-wider text-xs text-on-primary">
                  Simulate Day End
                </Text>
              </Pressable>
            </AdaptiveGlass>

            {/* Status Info */}
            <View className="flex-row gap-3 bg-surface-container/35 border border-slate-200/10 dark:border-slate-800/10 p-4 rounded-2xl">
              <Info size={20} color="#73777f" />
              <Text className="text-on-surface-variant text-sm flex-1">
                Streaks automatically increment at midnight if your scheduled board points ({usedPoints}) remain at or under your daily capacity limit ({settings.dailyCapacity}).
              </Text>
            </View>

          </View>

          {/* Gorgeous Lock Overlay (Free Tier Only) */}
          {!settings.isPremium && (
            <View className="absolute inset-0 bg-slate-50/40 dark:bg-slate-950/60 justify-start pt-20 items-center p-4">
              <AdaptiveGlass className="p-8 rounded-3xl items-center max-w-sm w-full gap-4">
                <View className="w-12 h-12 rounded-2xl bg-red-500/10 dark:bg-red-950/20 items-center justify-center">
                  <Lock size={24} color={theme.primary} />
                </View>
                <View className="items-center">
                  <Text className="text-xs font-black uppercase tracking-widest text-primary mb-1">PRO FEATURES</Text>
                  <Text className="text-on-surface font-black text-xl text-center tracking-tight">Unlock Advanced Analytics & AI Coach</Text>
                  <Text className="text-xs text-on-surface-variant text-center mt-2 font-medium leading-relaxed">
                    Supercharge your focus with Velocity charts, discipline streaks, and daily retrospectives driven by your personal AI coach.
                  </Text>
                </View>
                <Pressable 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    router.push('/paywall');
                  }}
                  style={{ backgroundColor: theme.primary }}
                  className="py-3.5 rounded-2xl w-full items-center justify-center active:scale-95 shadow-lg mt-2"
                >
                  <Text className="text-on-primary font-black uppercase tracking-widest text-xs">Upgrade to Pro</Text>
                </Pressable>
              </AdaptiveGlass>
            </View>
          )}
        </View>

      </ScrollView>

      <SprintScorecardModal
        visible={shareModalVisible}
        onClose={() => {
          setShareModalVisible(false);
          setSelectedSprintForShare(null);
        }}
        sprint={selectedSprintForShare}
        hapticsEnabled={settings.hapticsEnabled}
      />

      {/* Confetti Reward Component */}
      <ConfettiReward ref={confettiRef} />

      {/* Streak Milestone Celebration Overlay Modal */}
      {streakModalVisible && (
        <View className="absolute inset-0 z-50 bg-black/60 items-center justify-center p-6">
          <AdaptiveGlass
            style={{
              padding: 32,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.3)' : '0 10px 25px rgba(0, 0, 0, 0.05)',
              alignItems: 'center',
              width: '100%',
              maxWidth: 340,
            }}
          >
            <View className="w-20 h-20 bg-amber-500/10 rounded-2xl border border-amber-500/20 items-center justify-center mb-5">
              <Text className="text-4xl">🔥</Text>
            </View>
            <Text className="text-xs font-black uppercase tracking-widest text-primary mb-1">Discipline Milestone</Text>
            <Text className="text-3xl font-black text-on-surface text-center mb-2">{streakEarned}-Day Streak!</Text>
            <Text className="text-xs text-on-surface-variant text-center font-semibold leading-relaxed mb-6">
              Incredible focus! You successfully completed your day while staying balanced and within your daily capacity constraints.
            </Text>
            
            <Pressable 
              onPress={() => setStreakModalVisible(false)}
              style={{ backgroundColor: theme.primary }}
              className="px-8 py-3.5 rounded-2xl active:opacity-90 w-full items-center shadow-md"
            >
              <Text className="text-on-primary font-black uppercase tracking-wider text-xs">Keep the Streak Hot</Text>
            </Pressable>
          </AdaptiveGlass>
        </View>
      )}
    </SafeScreen>
  );
}

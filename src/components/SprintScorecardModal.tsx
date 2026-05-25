import React, { useState } from 'react';
import { View, Text, Modal, Pressable, Share, Clipboard, Platform } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Flame, 
  Target, 
  TrendingUp, 
  Calendar, 
  MessageSquare,
  Sparkles
} from 'lucide-react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useAccentTheme } from '../hooks/useAccentTheme';
import { AdaptiveGlass } from './ui/AdaptiveGlass';
import * as Haptics from 'expo-haptics';

interface SprintData {
  id: string;
  sprintNumber: number;
  startDate: string;
  endDate: string;
  totalPoints: number;
  completedPoints: number;
  completedMusts: number;
  totalMusts: number;
  velocityScore: number;
  notes?: string;
}

interface SprintScorecardModalProps {
  visible: boolean;
  onClose: () => void;
  sprint: SprintData | null;
  hapticsEnabled?: boolean;
}

export function SprintScorecardModal({ visible, onClose, sprint, hapticsEnabled = true }: SprintScorecardModalProps) {
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [copied, setCopied] = useState(false);

  if (!visible || !sprint) return null;

  // Generate ASCII progress bar
  const generateProgressBar = (completed: number, total: number) => {
    if (total === 0) return '░░░░░░░5░░░░░░░';
    const totalBlocks = 15;
    const filledBlocks = Math.round((completed / total) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
  };

  const formattedStartDate = new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedEndDate = new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Generate beautiful text representation of the scorecard
  const getScorecardText = () => {
    const progressBar = generateProgressBar(sprint.completedPoints, sprint.totalPoints);
    return `🏆 MSCW SPRINT SCORECARD (Sprint ${sprint.sprintNumber}) 🏆
📅 Period: ${formattedStartDate} - ${formattedEndDate}

🔥 Sprint Progress
[${progressBar}] ${sprint.completedPoints}/${sprint.totalPoints} Story Points Burned (${sprint.velocityScore}% Efficiency)

🎯 Prioritization Success
• Must-Have Tasks Finished: ${sprint.completedMusts}/${sprint.totalMusts} (${sprint.totalMusts > 0 ? Math.round((sprint.completedMusts / sprint.totalMusts) * 100) : 0}%)
• Overall Velocity Score: ${sprint.velocityScore}%

💬 Retrospective Learnings
"${sprint.notes || 'No retrospective comments logged for this sprint cycle.'}"

--
Generated with MSCW Productivity App
    `;
  };

  const handleShare = async () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const text = getScorecardText();
      await Share.share({
        message: text,
        title: `Sprint ${sprint.sprintNumber} Scorecard`,
      });
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  const handleCopy = () => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const text = getScorecardText();
    Clipboard.setString(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-center items-center p-6">
        <Animated.View 
          entering={ZoomIn.springify().damping(15)}
          className="w-full max-w-sm"
        >
          <AdaptiveGlass
            style={{
              padding: 24,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: isDark ? 0.4 : 0.06,
              shadowRadius: 32,
              elevation: 8,
            }}
          >
            {/* Header section with Close */}
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center gap-2">
                <Sparkles size={18} color={theme.primary} />
                <Text style={{ color: theme.primary }} className="font-black text-xs uppercase tracking-widest">
                  Sprint Scorecard
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-surface-container-high/60 items-center justify-center active:opacity-75"
              >
                <X size={16} color={isDark ? '#e2e8f0' : '#475569'} />
              </Pressable>
            </View>

            {/* Scorecard Visual Graphics Container */}
            <View className="bg-surface-container/40 border border-slate-200/10 dark:border-slate-800/10 p-5 rounded-2xl mb-6">
              {/* Scorecard Title Card */}
              <View className="items-center mb-4">
                <Text className="text-on-surface font-black text-2xl tracking-tight">
                  Sprint #{sprint.sprintNumber}
                </Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <Calendar size={11} color={isDark ? '#94a3b8' : '#64748b'} />
                  <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">
                    {formattedStartDate} - {formattedEndDate}
                  </Text>
                </View>
              </View>

              {/* Progress ASCII Bar Graphic */}
              <View className="bg-surface-container-lowest border border-slate-200/10 dark:border-slate-800/10 p-3.5 rounded-xl items-center mb-4">
                <Text style={{ color: theme.primary }} className="font-mono text-base font-bold tracking-tight">
                  [{generateProgressBar(sprint.completedPoints, sprint.totalPoints)}]
                </Text>
                <Text className="text-[10px] text-on-surface-variant font-black uppercase tracking-wider mt-2">
                  Points Burned: {sprint.completedPoints} of {sprint.totalPoints} pt
                </Text>
              </View>

              {/* Scorecard stats cards grid */}
              <View className="flex-row gap-2 mb-4">
                <View className="flex-1 bg-surface-container-lowest p-2.5 rounded-xl border border-slate-200/10 dark:border-slate-800/10 items-center">
                  <Flame size={12} color="#ef4444" className="mb-0.5" />
                  <Text className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Musts Success</Text>
                  <Text className="text-sm font-black text-on-surface mt-0.5">
                    {sprint.totalMusts > 0 ? Math.round((sprint.completedMusts / sprint.totalMusts) * 100) : 0}%
                  </Text>
                </View>
                <View className="flex-1 bg-surface-container-lowest p-2.5 rounded-xl border border-slate-200/10 dark:border-slate-800/10 items-center">
                  <TrendingUp size={12} color={theme.primary} className="mb-0.5" />
                  <Text className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Efficiency</Text>
                  <Text style={{ color: theme.primary }} className="text-sm font-black mt-0.5">
                    {sprint.velocityScore}%
                  </Text>
                </View>
              </View>

              {/* Retrospective learner notes */}
              <View className="bg-surface-container-lowest p-3 rounded-xl border border-slate-200/10 dark:border-slate-800/10">
                <View className="flex-row items-center gap-1 mb-1">
                  <MessageSquare size={10} color={theme.primary} />
                  <Text className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Team Retrospective</Text>
                </View>
                <Text className="text-[11px] text-on-surface font-medium italic leading-relaxed">
                  &quot;{sprint.notes || 'No retrospective comments logged for this sprint cycle.'}&quot;
                </Text>
              </View>
            </View>

            {/* Scorecard controls */}
            <View className="flex-row gap-3 w-full">
              <Pressable
                onPress={handleCopy}
                className="flex-1 flex-row items-center justify-center gap-2 bg-surface-container-high border border-outline-variant py-3.5 rounded-2xl active:opacity-70"
              >
                {copied ? (
                  <>
                    <Check size={14} color="#10b981" />
                    <Text className="text-slate-600 dark:text-slate-350 font-bold text-xs uppercase tracking-wider">Copied</Text>
                  </>
                ) : (
                  <>
                    <Copy size={14} color={isDark ? '#e2e8f0' : '#475569'} />
                    <Text className="text-slate-600 dark:text-slate-350 font-bold text-xs uppercase tracking-wider">Copy Text</Text>
                  </>
                )}
              </Pressable>
              
              <Pressable
                onPress={handleShare}
                style={{ backgroundColor: theme.primary }}
                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-2xl active:opacity-90 shadow-md shadow-black/10"
              >
                <Share2 size={14} color="white" />
                <Text className="text-on-primary font-black uppercase tracking-wider text-xs">Share Card</Text>
              </Pressable>
            </View>
          </AdaptiveGlass>
        </Animated.View>
      </View>
    </Modal>
  );
}

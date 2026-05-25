import React from 'react';
import { View, Text, Modal, Pressable, TextInput, Share, Clipboard } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { 
  Sparkles, 
  Trophy, 
  Flame, 
  Target, 
  MessageSquare,
  Share2,
  Copy,
  Check,
  TrendingUp
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppStore } from '../store';
import { useAccentTheme } from '../hooks/useAccentTheme';
import { ConfettiReward, ConfettiRewardRef } from './ConfettiReward';
import * as Haptics from 'expo-haptics';

interface DailyRetroModalProps {
  visible: boolean;
  onClose: () => void;
  completedMusts: number;
  totalMusts: number;
  pointsBurned: number;
}

export function DailyRetroModal({ visible, onClose, completedMusts, totalMusts, pointsBurned }: DailyRetroModalProps) {
  const settings = useAppStore(state => state.settings);
  const endSprintAction = useAppStore(state => state.endSprint);
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const confettiRef = React.useRef<ConfettiRewardRef>(null);
  const [notes, setNotes] = React.useState('');
  const [sprintScorecard, setSprintScorecard] = React.useState<any | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setTimeout(() => {
        confettiRef.current?.fire();
      }, 300);
    }
  }, [visible]);

  if (!visible) return null;

  const isPerfect = totalMusts > 0 && completedMusts === totalMusts;

  const handleEndSprint = () => {
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Fire confetti one last time on success
    confettiRef.current?.fire();
    
    // Execute store transaction
    endSprintAction(notes);
    
    // Retrieve the newly created sprint history entry
    const sprints = useAppStore.getState().settings.sprints || [];
    const latestSprint = sprints[sprints.length - 1];
    
    if (latestSprint) {
      setSprintScorecard(latestSprint);
    } else {
      // Fallback
      setNotes('');
      onClose();
    }
  };

  const handleDone = () => {
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSprintScorecard(null);
    setNotes('');
    onClose();
  };

  const generateProgressBar = (completed: number, total: number) => {
    if (total === 0) return '░░░░░░░░░░░░░░░';
    const totalBlocks = 15;
    const filledBlocks = Math.round((completed / total) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
  };

  const getScorecardText = (sprint: any) => {
    const formattedStartDate = new Date(sprint.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedEndDate = new Date(sprint.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
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

  const handleShareScorecard = async () => {
    if (!sprintScorecard) return;
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await Share.share({
        message: getScorecardText(sprintScorecard),
        title: `Sprint ${sprintScorecard.sprintNumber} Scorecard`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyScorecard = () => {
    if (!sprintScorecard) return;
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Clipboard.setString(getScorecardText(sprintScorecard));
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
        {sprintScorecard ? (
          <Animated.View 
            entering={FadeInDown.springify().damping(15)}
            className="bg-surface-container-lowest w-full max-w-sm rounded-[32px] p-6 items-center shadow-2xl border border-outline-variant/40"
          >
            {/* Celebration Crown */}
            <View style={{ backgroundColor: theme.primary + '1a' }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
              <Trophy color={theme.primary} size={32} />
            </View>

            <Text className="text-2xl font-black text-on-surface mb-1 text-center tracking-tight">
              Sprint Completed!
            </Text>
            
            <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-5 px-4 leading-relaxed">
              Fantastic work! Your velocity score, prioritization efficiency, and retrospective insights are recorded successfully. Share your sprint scorecard with your team!
            </Text>

            {/* Micro score details */}
            <View className="w-full bg-surface-container-low border border-slate-200/10 dark:border-slate-800/10 p-5 rounded-2xl mb-6">
              <View className="items-center mb-4">
                <Text style={{ color: theme.primary }} className="font-mono text-xs font-bold tracking-tight">
                  [{generateProgressBar(sprintScorecard.completedPoints, sprintScorecard.totalPoints)}]
                </Text>
                <Text className="text-[10px] text-on-surface-variant font-black uppercase tracking-wider mt-2">
                  {sprintScorecard.completedPoints} of {sprintScorecard.totalPoints} Story Points Burned
                </Text>
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1 bg-surface-container-lowest p-2.5 rounded-xl border border-slate-200/10 dark:border-slate-800/10 items-center">
                  <Flame size={12} color="#ef4444" className="mb-0.5" />
                  <Text className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Must-Haves</Text>
                  <Text className="text-sm font-black text-on-surface mt-0.5">
                    {sprintScorecard.totalMusts > 0 ? Math.round((sprintScorecard.completedMusts / sprintScorecard.totalMusts) * 100) : 0}%
                  </Text>
                </View>
                <View className="flex-1 bg-surface-container-lowest p-2.5 rounded-xl border border-slate-200/10 dark:border-slate-800/10 items-center">
                  <TrendingUp size={12} color={theme.primary} className="mb-0.5" />
                  <Text className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Efficiency</Text>
                  <Text style={{ color: theme.primary }} className="text-sm font-black mt-0.5">
                    {sprintScorecard.velocityScore}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Scorecard sharing buttons */}
            <View className="flex-col gap-3 w-full">
              <View className="flex-row gap-3 w-full">
                <Pressable
                  onPress={handleCopyScorecard}
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
                  onPress={handleShareScorecard}
                  style={{ backgroundColor: theme.primary }}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-2xl active:opacity-90 shadow-md shadow-black/10"
                >
                  <Share2 size={14} color="white" />
                  <Text className="text-on-primary font-black uppercase tracking-wider text-xs">Share Card</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleDone}
                className="w-full bg-surface-container py-3.5 rounded-2xl items-center justify-center border border-outline-variant active:opacity-75"
              >
                <Text className="text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-widest">Done</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <Animated.View 
            entering={FadeInDown.springify().damping(15)}
            className="bg-surface-container-lowest w-full max-w-sm rounded-[32px] p-6 items-center shadow-2xl border border-outline-variant/40"
          >
            {/* Accent-colored icon crown */}
            <View style={{ backgroundColor: theme.primary + '1a' }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
              {isPerfect ? (
                <Trophy color={theme.primary} size={32} />
              ) : (
                <Target color={theme.primary} size={32} />
              )}
            </View>

            <Text className="text-2xl font-black text-on-surface mb-1 text-center tracking-tight">
              Sprint Retrospective
            </Text>
            
            <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-5 px-2">
              {isPerfect 
                ? "Magnificent sprint! Every Must-Have is completed. Log your retrospective insights below."
                : "Great attempt. Let's record what we learned and lock in your velocity statistics."}
            </Text>

            {/* Stats Bar */}
            <View className="w-full bg-surface-container-low p-4 rounded-2xl mb-5 flex-row justify-between border border-outline-variant/30">
              <View className="items-center flex-1">
                <View className="flex-row items-center gap-1.5 mb-0.5 justify-center">
                  <Flame size={14} color="#ef4444" />
                  <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-wider">Must-Haves</Text>
                </View>
                <Text className="text-lg font-black text-on-surface">{completedMusts}/{totalMusts}</Text>
              </View>
              
              <View className="w-[1px] bg-outline-variant/40" />
              
              <View className="items-center flex-1">
                <View className="flex-row items-center gap-1.5 mb-0.5 justify-center">
                  <Sparkles size={14} color={theme.primary} />
                  <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-wider">Points Burned</Text>
                </View>
                <Text className="text-lg font-black text-on-surface">{pointsBurned} pts</Text>
              </View>
            </View>

            {/* Custom Retrospective Notes input */}
            <View className="w-full mb-6">
              <View className="flex-row items-center gap-1.5 mb-2 ml-1">
                <MessageSquare size={12} color={theme.primary} />
                <Text className="text-xs font-black uppercase text-slate-650 dark:text-slate-300 tracking-widest">Retrospective Notes</Text>
              </View>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="What went well? What obstacles did you encounter?"
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="w-full bg-surface-container p-3 rounded-2xl border border-outline-variant text-xs text-on-surface h-20 leading-5"
              />
            </View>

            {/* Control Actions */}
            <View className="flex-row gap-3 w-full">
              <Pressable 
                onPress={onClose}
                className="flex-1 bg-surface-container-high py-3.5 rounded-2xl items-center border border-outline-variant/60 active:opacity-70"
              >
                <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">Cancel</Text>
              </Pressable>
              <Pressable 
                onPress={handleEndSprint}
                style={{ backgroundColor: theme.primary }}
                className="flex-[2] py-3.5 rounded-2xl items-center active:opacity-90 shadow-md shadow-black/10"
              >
                <Text className="text-on-primary font-black uppercase tracking-wider text-xs">End & Archive Sprint</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
      <ConfettiReward ref={confettiRef} />
    </Modal>
  );
}

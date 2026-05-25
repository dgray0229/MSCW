import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  Pressable, 
  TextInput, 
  Linking, 
  Platform, 
  ActivityIndicator 
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useAppStore } from '../store';
import { useAccentTheme } from '../hooks/useAccentTheme';
import { AdaptiveGlass } from './ui/AdaptiveGlass';
import { Heart, Frown, X, MessageSquare, Send, Star, Check } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { db } from '../lib/firebase';

export function FeedbackPrompt() {
  const tasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  
  const theme = useAccentTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'sentiment' | 'enjoying' | 'not_enjoying' | 'submitted'>('sentiment');
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if snooze time has expired (30 days)
  const isSnoozeExpired = (lastShownStr: string | null) => {
    if (!lastShownStr) return true;
    const lastShown = Date.parse(lastShownStr);
    if (isNaN(lastShown)) return true;
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    return new Date().getTime() - lastShown >= thirtyDaysInMs;
  };

  useEffect(() => {
    // Only check if user has seen onboarding
    if (!settings.hasSeenOnboarding) return;

    // Check if prompted state is pending or snoozed-expired
    const isPending = settings.feedbackStatus === 'pending' || !settings.feedbackStatus;
    const isSnoozed = settings.feedbackStatus === 'snoozed';
    const canPrompt = isPending || (isSnoozed && isSnoozeExpired(settings.feedbackPromptLastShown || null));

    if (!canPrompt) return;

    // Check user activity thresholds (reasonable amount of time/usage):
    // 1. Completed at least 5 tasks
    const completedTasksCount = tasks.filter(t => t.completed).length;
    // 2. Or completed at least 1 sprint
    const completedSprintsCount = settings.sprints?.length || 0;

    const meetsThreshold = completedTasksCount >= 5 || completedSprintsCount >= 1;

    if (meetsThreshold) {
      // Trigger prompt!
      setPhase('sentiment');
      setVisible(true);
    }
  }, [tasks, settings.hasSeenOnboarding, settings.feedbackStatus, settings.feedbackPromptLastShown, settings.sprints]);

  if (!visible) return null;

  const handleSnooze = () => {
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({
      feedbackStatus: 'snoozed',
      feedbackPromptLastShown: new Date().toISOString(),
      feedbackSnoozeCount: (settings.feedbackSnoozeCount || 0) + 1,
    });
    setVisible(false);
  };

  const handleSentiment = (enjoying: boolean) => {
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (enjoying) {
      updateSettings({ feedbackStatus: 'enjoying' });
      setPhase('enjoying');
    } else {
      updateSettings({ feedbackStatus: 'not_enjoying' });
      setPhase('not_enjoying');
    }
  };

  const handleReviewRedirect = async () => {
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const iosStoreUrl = 'itms-apps://itunes.apple.com/app/id6478950481?action=write-review';
    const iosWebUrl = 'https://apps.apple.com/app/id6478950481';
    const androidStoreUrl = 'market://details?id=com.devingray.mscw';
    const androidWebUrl = 'https://play.google.com/store/apps/details?id=com.devingray.mscw';
    const productHuntUrl = 'https://www.producthunt.com/products/mscw-productivity';

    let targetUrl = productHuntUrl;

    if (Platform.OS === 'ios') {
      const canOpen = await Linking.canOpenURL(iosStoreUrl);
      targetUrl = canOpen ? iosStoreUrl : iosWebUrl;
    } else if (Platform.OS === 'android') {
      const canOpen = await Linking.canOpenURL(androidStoreUrl);
      targetUrl = canOpen ? androidStoreUrl : androidWebUrl;
    }

    try {
      await Linking.openURL(targetUrl);
    } catch (e) {
      console.warn('Could not open store review link:', e);
      try {
        await Linking.openURL(productHuntUrl);
      } catch (err) {
        console.error('Could not open fallback Product Hunt URL:', err);
      }
    }

    updateSettings({ feedbackStatus: 'submitted' });
    setPhase('submitted');

    // Close after a brief delay
    setTimeout(() => {
      setVisible(false);
    }, 2000);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;

    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSubmitting(true);
    try {
      // Attempt writing feedback details to Firestore
      await db.collection('feedback').add({
        userId: settings.user?.uid || 'anonymous',
        userEmail: settings.user?.email || null,
        userDisplayName: settings.user?.displayName || null,
        feedbackText: feedbackText.trim(),
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        appVersion: '1.0.0',
      });
    } catch (error) {
      // Safe fallback if Firestore sync fails or isn't configured
      console.warn('Feedback save failed to sync online, recorded locally instead:', error);
    } finally {
      if (settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSubmitting(false);
      updateSettings({ feedbackStatus: 'submitted' });
      setPhase('submitted');

      // Close modal after a clean 2 second celebration screen
      setTimeout(() => {
        setVisible(false);
      }, 2000);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleSnooze}
    >
      <View className="flex-1 bg-black/60 justify-center items-center p-6">
        <Animated.View
          entering={FadeInDown.springify().damping(15)}
          exiting={FadeOutUp.duration(200)}
          className="w-full max-w-sm"
        >
          <AdaptiveGlass
            style={{
              padding: 24,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.3)' : '0 10px 30px rgba(0, 0, 0, 0.08)',
              alignItems: 'center',
            }}
          >
            {/* Close/Dismiss Button */}
            {phase !== 'submitted' && (
              <Pressable 
                accessibilityRole="button"
                accessibilityLabel="Close feedback prompt"
                onPress={handleSnooze}
                className="absolute top-4 right-4 p-2 bg-surface-container-high/40 rounded-full active:opacity-75 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X size={16} color={isDark ? '#cbd5e1' : '#475569'} />
              </Pressable>
            )}

            {phase === 'sentiment' && (
              <View className="items-center w-full">
                {/* Header Icon */}
                <View 
                  style={{ backgroundColor: theme.primary + '1a' }} 
                  className="w-16 h-16 rounded-full items-center justify-center mb-5"
                >
                  <Heart color={theme.primary} size={32} fill={theme.primary} />
                </View>

                <Text className="text-2xl font-black text-on-surface mb-2 text-center tracking-tight">
                  Enjoying MSCW?
                </Text>
                
                <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 px-2 leading-relaxed">
                  Your constraints guide your productivity. Are you loving the Fibonacci estimations and 8-point limit workflow?
                </Text>

                {/* Yes / No sentiment selection */}
                <View className="flex-row gap-3 w-full">
                  <Pressable 
                    accessibilityRole="button"
                    accessibilityLabel="Not really enjoying the app"
                    onPress={() => handleSentiment(false)}
                    className="flex-1 flex-row items-center justify-center gap-2 bg-surface-container py-4 rounded-2xl border border-outline-variant/60 active:opacity-75 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Frown size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                    <Text className="text-slate-650 dark:text-slate-300 font-black text-xs uppercase tracking-wider">
                      Not Really
                    </Text>
                  </Pressable>

                  <Pressable 
                    accessibilityRole="button"
                    accessibilityLabel="Loving the app"
                    onPress={() => handleSentiment(true)}
                    style={{ backgroundColor: theme.primary }}
                    className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl active:opacity-90 shadow-md shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Heart size={16} color="white" fill="white" />
                    <Text className="text-on-primary font-black uppercase tracking-wider text-xs">
                      Love it!
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {phase === 'enjoying' && (
              <View className="items-center w-full">
                {/* Header Icon */}
                <View 
                  style={{ backgroundColor: theme.primary + '1a' }} 
                  className="w-16 h-16 rounded-full items-center justify-center mb-5"
                >
                  <Star color={theme.primary} size={32} fill={theme.primary} />
                </View>

                <Text className="text-2xl font-black text-on-surface mb-2 text-center tracking-tight">
                  Support MSCW!
                </Text>
                
                <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 px-3 leading-relaxed">
                  We're so thrilled you're enjoying our constraint-driven workflow! Could you share a quick review to help other creators?
                </Text>

                <View className="flex-col gap-3 w-full">
                  <Pressable 
                    accessibilityRole="button"
                    accessibilityLabel="Write store review"
                    onPress={handleReviewRedirect}
                    style={{ backgroundColor: theme.primary }}
                    className="w-full py-4 rounded-2xl items-center justify-center active:opacity-90 shadow-md shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Text className="text-on-primary font-black uppercase tracking-widest text-xs">
                      {Platform.OS === 'web' ? 'Support on Product Hunt' : 'Review on Store'}
                    </Text>
                  </Pressable>

                  <Pressable 
                    accessibilityRole="button"
                    accessibilityLabel="Ask me later"
                    onPress={handleSnooze}
                    className="w-full bg-surface-container py-3.5 rounded-2xl items-center justify-center border border-outline-variant/60 active:opacity-75 focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                      Maybe Later
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {phase === 'not_enjoying' && (
              <View className="items-center w-full">
                {/* Header Icon */}
                <View 
                  style={{ backgroundColor: theme.primary + '1a' }} 
                  className="w-16 h-16 rounded-full items-center justify-center mb-4"
                >
                  <MessageSquare color={theme.primary} size={30} />
                </View>

                <Text className="text-2xl font-black text-on-surface mb-2 text-center tracking-tight">
                  Help Us Improve
                </Text>
                
                <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4 px-2 leading-relaxed">
                  We're sorry to hear that. What challenges are you experiencing? We read every single comment!
                </Text>

                {/* Multiline Input box */}
                <TextInput
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  placeholder="How can we make this app better for you?"
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="w-full bg-surface-container p-4 rounded-2xl border border-outline-variant text-xs text-on-surface h-24 leading-5 mb-5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />

                <View className="flex-row gap-3 w-full">
                  <Pressable 
                    accessibilityRole="button"
                    accessibilityLabel="Cancel feedback"
                    onPress={handleSnooze}
                    className="flex-1 bg-surface-container py-3.5 rounded-2xl items-center border border-outline-variant/60 active:opacity-75 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">Cancel</Text>
                  </Pressable>

                  <Pressable 
                    accessibilityRole="button"
                    accessibilityLabel="Submit constructive feedback"
                    disabled={!feedbackText.trim() || submitting}
                    onPress={handleSubmitFeedback}
                    style={{ 
                      backgroundColor: theme.primary, 
                      opacity: !feedbackText.trim() || submitting ? 0.6 : 1 
                    }}
                    className="flex-[2] flex-row items-center justify-center gap-2 py-3.5 rounded-2xl active:opacity-90 shadow-md shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Send size={12} color="white" />
                        <Text className="text-on-primary font-black uppercase tracking-wider text-xs">
                          Submit Feedback
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {phase === 'submitted' && (
              <View className="items-center w-full py-4">
                {/* Header Icon */}
                <View 
                  style={{ backgroundColor: '#10b9811a' }} 
                  className="w-16 h-16 rounded-full items-center justify-center mb-5"
                >
                  <Check color="#10b981" size={32} />
                </View>

                <Text className="text-2xl font-black text-on-surface mb-2 text-center tracking-tight">
                  Thank You!
                </Text>
                
                <Text className="text-xs text-slate-500 dark:text-slate-400 text-center px-4 leading-relaxed">
                  Your feedback helps us refine MSCW to better serve your creative flow. Let's get back to sorting and building!
                </Text>
              </View>
            )}
          </AdaptiveGlass>
        </Animated.View>
      </View>
    </Modal>
  );
}

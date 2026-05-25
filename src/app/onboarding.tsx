import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { ChevronRight, ArrowRight, X, ShieldCheck, Flame, GitPullRequest } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function OnboardingPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [step, setStep] = useState(0);
  const [capacity, setCapacity] = useState(8);
  const [firstTask, setFirstTask] = useState('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  
  const updateSettings = useAppStore(state => state.updateSettings);
  const addTask = useAppStore(state => state.addTask);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(prev => Math.min(3, prev + 1));
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateSettings({ hasSeenOnboarding: true });
  };

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({ hasSeenOnboarding: true, dailyCapacity: capacity });
    if (firstTask.trim().length > 0) {
      addTask({
        title: firstTask.trim(),
        points: null,
        priority: 'must',
        status: 'today',
      });
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background relative">
      {/* Sign In Button (Top Left) */}
      <View className="absolute top-4 left-4 z-10">
        <Pressable 
          accessibilityRole="button"
          accessibilityLabel="Sign In"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/auth' as any);
          }}
          className="flex-row items-center gap-1.5 bg-primary/10 px-4 py-2 rounded-full border border-primary/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <Text className="text-primary font-black text-sm uppercase tracking-wider">Sign In</Text>
        </Pressable>
      </View>

      {/* Skip Button */}
      <View className="absolute top-4 right-4 z-10">
        <Pressable 
          accessibilityRole="button"
          accessibilityLabel="Skip Onboarding"
          onPress={handleSkip}
          className="flex-row items-center gap-1 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <Text className="text-on-surface font-bold text-sm">Skip</Text>
          <X size={16} color="#44474e" />
        </Pressable>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 items-center justify-center p-6">
            
            {/* Slide 0: Core Philosophy */}
            {step === 0 && (
              <View className="items-center w-full max-w-sm">
                <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-8">
                  <ShieldCheck size={48} color="#b61722" />
                </View>
                <Text className="text-4xl font-black text-on-surface text-center mb-4 tracking-tight">The 8-Point Limit</Text>
                <Text className="text-lg text-on-surface-variant text-center mb-10 leading-relaxed">
                  Setting limits empowers you to prioritize. Capping your day protects your energy and guarantees high-impact focus.
                </Text>
              </View>
            )}

            {/* Slide 1: Fibonacci Estimation */}
            {step === 1 && (
              <View className="items-center w-full max-w-sm">
                <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-8">
                  <Flame size={48} color="#b61722" />
                </View>
                <Text className="text-4xl font-black text-on-surface text-center mb-4 tracking-tight">Fibonacci Weight</Text>
                <Text className="text-lg text-on-surface-variant text-center mb-10 leading-relaxed">
                  Estimate effort, not time. Use 1, 2, 3, 5, or 8 points. An 8 is a massive project; a 1 is a quick fix.
                </Text>
              </View>
            )}

            {/* Slide 2: MoSCoW Prioritization */}
            {step === 2 && (
              <View className="items-center w-full max-w-sm">
                <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-8">
                  <GitPullRequest size={48} color="#b61722" />
                </View>
                <Text className="text-4xl font-black text-on-surface text-center mb-4 tracking-tight">MoSCoW Triage</Text>
                <Text className="text-lg text-on-surface-variant text-center mb-10 leading-relaxed">
                  {"Clear your backlog fast: Must-Haves are non-negotiable. Should/Could are flexible. Won't-Haves are instantly archived."}
                </Text>
              </View>
            )}

            {/* Slide 3: Setup */}
            {step === 3 && (
              <View className="items-center w-full max-w-sm">
                <Text className="text-3xl font-black text-on-surface text-center mb-8 tracking-tight">Set Your Baseline</Text>
                
                <View className="w-full bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant shadow-sm mb-6">
                  <Text className="font-bold text-on-surface mb-2">Daily Point Limit</Text>
                  <View className="flex-row items-center gap-4">
                    <Pressable 
                      accessibilityRole="button"
                      accessibilityLabel="Decrease Capacity"
                      onPress={() => { Haptics.selectionAsync(); setCapacity(Math.max(1, capacity - 1)); }}
                      className="w-12 h-12 bg-surface-container-high rounded-full items-center justify-center active:opacity-75 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <Text className="text-2xl text-on-surface font-black">-</Text>
                    </Pressable>
                    <Text className="text-3xl font-black text-primary flex-1 text-center">{capacity}</Text>
                    <Pressable 
                      accessibilityRole="button"
                      accessibilityLabel="Increase Capacity"
                      onPress={() => { Haptics.selectionAsync(); setCapacity(Math.min(40, capacity + 1)); }}
                      className="w-12 h-12 bg-surface-container-high rounded-full items-center justify-center active:opacity-75 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <Text className="text-2xl text-on-surface font-black">+</Text>
                    </Pressable>
                  </View>
                </View>

                <View className="w-full bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant shadow-sm mb-10">
                  <Text className="font-bold text-on-surface mb-2">{"Your First \"Must-Have\""}</Text>
                  <TextInput
                    accessibilityLabel="Your First Must-Have Task"
                    accessibilityHint="Enter a task to begin"
                    className="bg-background text-on-surface text-lg px-4 py-3 rounded-xl border border-outline-variant focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    placeholder="E.g., Finalize project roadmap"
                    placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                    value={firstTask}
                    onChangeText={setFirstTask}
                    onSubmitEditing={handleFinish}
                  />
                </View>

                <Pressable 
                  onPress={() => {
                    Haptics.selectionAsync();
                    setHasAcceptedTerms(!hasAcceptedTerms);
                  }}
                  className="flex-row items-center justify-center gap-3 w-full mb-8 px-4"
                >
                  <View className={`w-6 h-6 rounded border items-center justify-center ${hasAcceptedTerms ? 'bg-primary border-primary' : 'bg-transparent border-outline-variant'}`}>
                    {hasAcceptedTerms && <ShieldCheck size={14} color="white" />}
                  </View>
                  <Text className="text-xs text-on-surface-variant flex-1 flex-wrap">
                    I accept the <Text className="font-bold text-primary underline">Terms of Service</Text> and <Text className="font-bold text-primary underline">Privacy Policy</Text>, including AI task processing.
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Pagination & Next */}
            <View className="w-full max-w-sm flex-row items-center justify-between">
              <View className="flex-row gap-2">
                {[0, 1, 2, 3].map(i => (
                  <View 
                    key={i} 
                    className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-2 bg-outline-variant/50'}`} 
                  />
                ))}
              </View>

              {step < 3 ? (
                <Pressable 
                  accessibilityRole="button"
                  onPress={handleNext}
                  className="bg-primary px-6 py-4 rounded-full flex-row items-center gap-2 active:opacity-80 focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none"
                >
                  <Text className="text-on-primary font-black uppercase tracking-wider text-sm">Next</Text>
                  <ChevronRight size={18} color="#ffffff" />
                </Pressable>
              ) : (
                <Pressable 
                  accessibilityRole="button"
                  onPress={hasAcceptedTerms ? handleFinish : undefined}
                  className={`px-6 py-4 rounded-full flex-row items-center gap-2 ${hasAcceptedTerms ? 'bg-primary active:opacity-80' : 'bg-surface-variant opacity-50'}`}
                >
                  <Text className={`font-black uppercase tracking-wider text-sm ${hasAcceptedTerms ? 'text-on-primary' : 'text-on-surface-variant'}`}>Launch</Text>
                  <ArrowRight size={18} color={hasAcceptedTerms ? '#ffffff' : '#44474e'} />
                </Pressable>
              )}
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

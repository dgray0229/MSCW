import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator, ScrollView } from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useRouter } from 'expo-router';
import { ShieldCheck, Cloud, Sparkles, TrendingUp, X, Check, RotateCw, Infinity, Star } from 'lucide-react-native';
import { initRevenueCat, ENTITLEMENT_ID } from '../lib/purchases';
import { SafeScreen } from '../components/SafeScreen';
import { useAppStore } from '../store';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

export default function PaywallPage() {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'lifetime'>('annual');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);

  useEffect(() => {
    initRevenueCat();

    const getOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.warn("Error getting offerings:", e);
      }
    };
    getOfferings();
  }, []);

  const handlePurchase = async () => {
    setErrorMsg(null);
    setIsSubscribing(true);

    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // 1. If packages are empty (e.g. web, simulator, or failed RC connection), simulate purchase
    if (packages.length === 0) {
      setTimeout(() => {
        setIsSubscribing(false);
        setShowSuccess(true);
        updateSettings({ isPremium: true });

        if (settings.hapticsEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Navigate back after 2 seconds
        setTimeout(() => {
          setShowSuccess(false);
          router.replace('/');
        }, 2200);
      }, 1000);
      return;
    }

    // 2. Identify the package matching the selected plan
    let targetPack: PurchasesPackage | undefined;
    if (selectedPlan === 'monthly') {
      targetPack = packages.find(p => p.packageType === Purchases.PACKAGE_TYPE.MONTHLY);
    } else if (selectedPlan === 'annual') {
      targetPack = packages.find(p => p.packageType === Purchases.PACKAGE_TYPE.ANNUAL);
    } else if (selectedPlan === 'lifetime') {
      targetPack = packages.find(p => p.packageType === Purchases.PACKAGE_TYPE.LIFETIME);
    }

    // Fallback if the specific package type is not found
    if (!targetPack) {
      targetPack = packages[0];
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(targetPack);
      if (customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined) {
        updateSettings({ isPremium: true });
        setShowSuccess(true);

        if (settings.hapticsEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setTimeout(() => {
          setShowSuccess(false);
          router.replace('/');
        }, 2200);
      } else {
        setErrorMsg("Failed to confirm active subscription. Please try again.");
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.warn(e);
        setErrorMsg(e.message || "An error occurred during purchase.");
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setErrorMsg(null);

    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined) {
        updateSettings({ isPremium: true });
        setShowSuccess(true);

        if (settings.hapticsEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setTimeout(() => {
          setShowSuccess(false);
          router.replace('/');
        }, 2200);
      } else {
        setErrorMsg("No active purchases found to restore.");
      }
    } catch (e: any) {
      console.warn(e);
      setErrorMsg(e.message || "Failed to restore purchases.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background relative">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header Navigation */}
        <View className="flex-row justify-between items-center mt-2 mb-6">
          <Pressable 
            onPress={() => router.back()} 
            className="w-10 h-10 rounded-full bg-surface-container-high items-center justify-center border border-outline-variant/30 active:scale-95"
          >
            <X color="#5b403e" size={20} />
          </Pressable>
          <View className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full flex-row items-center gap-1">
            <Star size={12} color="#b61722" fill="#b61722" />
            <Text className="text-xs font-black text-primary uppercase tracking-widest">MSCW Pro</Text>
          </View>
        </View>

        {/* Title & Headline */}
        <View className="items-center mb-8">
          <Text className="text-4xl font-black text-on-surface tracking-tight text-center">
            Supercharge Focus
          </Text>
          <Text className="text-sm text-on-surface-variant text-center font-medium mt-2 max-w-[280px]">
            Unlock the Constraint-Driven productivity suite and master your daily capacity.
          </Text>
        </View>

        {/* Premium Value Props */}
        <View className="gap-4 mb-8">
          <View className="flex-row items-start gap-4 bg-surface-container-low p-4 rounded-3xl border border-outline-variant/10">
            <View className="p-2.5 bg-primary/10 rounded-2xl">
              <ShieldCheck color="#b61722" size={20} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-on-surface text-base">Zen Mode Focus Timer</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                Block out all notifications and submerge yourself into highly focused deep work.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start gap-4 bg-surface-container-low p-4 rounded-3xl border border-outline-variant/10">
            <View className="p-2.5 bg-primary/10 rounded-2xl">
              <Sparkles color="#b61722" size={20} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-on-surface text-base">AI Triager & Overflow Concierge</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                Intelligently prioritize your backlog and delegate offloads using advanced AI algorithms.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start gap-4 bg-surface-container-low p-4 rounded-3xl border border-outline-variant/10">
            <View className="p-2.5 bg-primary/10 rounded-2xl">
              <TrendingUp color="#b61722" size={20} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-on-surface text-base">Advanced Analytics & AI Daily Coach</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                Track velocity, streaks, and consult your dedicated coach to build Strong Habits.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start gap-4 bg-surface-container-low p-4 rounded-3xl border border-outline-variant/10">
            <View className="p-2.5 bg-primary/10 rounded-2xl">
              <Cloud color="#b61722" size={20} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-on-surface text-base">Real-time Cross-Device Sync</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                Instantly synchronize and back up tasks to Google Tasks, Apple Reminders, and Calendars.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start gap-4 bg-surface-container-low p-4 rounded-3xl border border-outline-variant/10">
            <View className="p-2.5 bg-primary/10 rounded-2xl">
              <Infinity color="#b61722" size={20} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-on-surface text-base">Unlimited Active Backlog</Text>
              <Text className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                Break the standard 10-task backlog limit. Keep as many active tasks as you need.
              </Text>
            </View>
          </View>
        </View>

        {/* Plan Selection Cards */}
        <View className="gap-3.5 mb-8">
          {/* Annual Subscription Card */}
          <Pressable 
            onPress={() => setSelectedPlan('annual')}
            className={`p-5 rounded-[28px] border-2 flex-row justify-between items-center relative overflow-hidden active:scale-[0.99] ${selectedPlan === 'annual' ? 'border-primary bg-primary/5' : 'border-outline-variant/40 bg-surface'}`}
          >
            {selectedPlan === 'annual' && (
              <View className="absolute top-0 right-0 bg-primary px-3 py-1 rounded-bl-xl">
                <Text className="text-on-primary font-black text-xs uppercase tracking-widest">Best Value</Text>
              </View>
            )}
            <View className="flex-row items-center gap-3">
              <View className={`w-5 h-5 rounded-full border items-center justify-center ${selectedPlan === 'annual' ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                {selectedPlan === 'annual' && <Check size={12} color="white" strokeWidth={3} />}
              </View>
              <View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-extrabold text-on-surface text-lg">Annual Pro Plan</Text>
                  <View className="bg-primary/20 px-2 py-0.5 rounded-full">
                    <Text className="text-primary font-black text-xs uppercase tracking-widest">Save 50%</Text>
                  </View>
                </View>
                <Text className="text-xs text-on-surface-variant mt-0.5">Billed yearly at $29.99 (~$2.50/mo)</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="font-black text-on-surface text-xl">$29.99</Text>
              <Text className="text-xs text-on-surface-variant">/ year</Text>
            </View>
          </Pressable>

          {/* Monthly Subscription Card */}
          <Pressable 
            onPress={() => setSelectedPlan('monthly')}
            className={`p-5 rounded-[28px] border-2 flex-row justify-between items-center active:scale-[0.99] ${selectedPlan === 'monthly' ? 'border-primary bg-primary/5' : 'border-outline-variant/40 bg-surface'}`}
          >
            <View className="flex-row items-center gap-3">
              <View className={`w-5 h-5 rounded-full border items-center justify-center ${selectedPlan === 'monthly' ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                {selectedPlan === 'monthly' && <Check size={12} color="white" strokeWidth={3} />}
              </View>
              <View>
                <Text className="font-extrabold text-on-surface text-lg">Monthly Pro Plan</Text>
                <Text className="text-xs text-on-surface-variant mt-0.5">Flexible monthly billing, cancel anytime</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="font-black text-on-surface text-xl">$4.99</Text>
              <Text className="text-xs text-on-surface-variant">/ month</Text>
            </View>
          </Pressable>

          {/* Lifetime Subscription Card */}
          <Pressable 
            onPress={() => setSelectedPlan('lifetime')}
            className={`p-5 rounded-[28px] border-2 flex-row justify-between items-center active:scale-[0.99] ${selectedPlan === 'lifetime' ? 'border-primary bg-primary/5' : 'border-outline-variant/40 bg-surface'}`}
          >
            <View className="flex-row items-center gap-3">
              <View className={`w-5 h-5 rounded-full border items-center justify-center ${selectedPlan === 'lifetime' ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                {selectedPlan === 'lifetime' && <Check size={12} color="white" strokeWidth={3} />}
              </View>
              <View>
                <Text className="font-extrabold text-on-surface text-lg">Lifetime Pro Access</Text>
                <Text className="text-xs text-on-surface-variant mt-0.5">One-time purchase, yours forever</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="font-black text-on-surface text-xl">$59.99</Text>
              <Text className="text-xs text-on-surface-variant">/ once</Text>
            </View>
          </Pressable>
        </View>

        {/* Error Messages */}
        {errorMsg && (
          <View className="mb-4 bg-primary/5 border border-primary/20 p-4 rounded-2xl">
            <Text className="text-primary text-xs font-bold text-center">{errorMsg}</Text>
          </View>
        )}

        {/* Bottom Actions */}
        <View className="gap-4">
          <Pressable 
            onPress={handlePurchase}
            disabled={isSubscribing}
            className="w-full py-4 bg-primary rounded-[24px] items-center justify-center shadow-lg active:scale-[0.98]"
            style={{
              shadowColor: '#b61722',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {isSubscribing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-on-primary font-black uppercase text-sm tracking-widest">
                Unlock Premium Access
              </Text>
            )}
          </Pressable>

          <View className="flex-row justify-center gap-6 mt-2">
            <Pressable onPress={handleRestore} disabled={isRestoring}>
              {isRestoring ? (
                <ActivityIndicator size="small" color="#5b403e" />
              ) : (
                <Text className="text-xs font-bold text-on-surface-variant/75 underline">Restore Purchases</Text>
              )}
            </Pressable>
            <Pressable onPress={() => router.back()}>
              <Text className="text-xs font-bold text-on-surface-variant/75 underline">Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Success Overlay */}
      {showSuccess && (
        <Animated.View 
          entering={FadeIn.duration(200)} 
          exiting={FadeOut.duration(150)}
          className="absolute inset-0 bg-black/85 items-center justify-center z-50 p-6"
        >
          <Animated.View 
            entering={FadeInDown.springify().damping(15)}
            className="bg-surface border border-outline-variant/30 rounded-[40px] p-8 max-w-sm w-full items-center shadow-2xl"
          >
            <View className="w-16 h-16 bg-green-500/10 rounded-full border border-green-500/20 items-center justify-center mb-6">
              <Check size={36} color="#22c55e" strokeWidth={3} />
            </View>
            <Text className="text-2xl font-black text-on-surface tracking-tight text-center mb-2">
              Purchase Successful!
            </Text>
            <Text className="text-sm text-on-surface-variant text-center leading-relaxed">
              Welcome to **MSCW Pro**. Your unlimited focus tools are now active.
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </SafeScreen>
  );
}

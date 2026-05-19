import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useRouter } from 'expo-router';
import { ShieldCheck, CloudSnow, CheckCircle2 } from 'lucide-react-native';
import { SafeScreen } from '../components/SafeScreen';

export default function PaywallPage() {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'ios' && process.env.EXPO_PUBLIC_RC_IOS_KEY) {
        Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_RC_IOS_KEY });
    } else if (Platform.OS === 'android' && process.env.EXPO_PUBLIC_RC_ANDROID_KEY) {
        Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_RC_ANDROID_KEY });
    } else {
        console.warn("RevenueCat API keys missing in environment variables.");
    }

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

  const purchasePackage = async (pack: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      if (typeof customerInfo.entitlements.active['Premium'] !== "undefined") {
        router.push('/');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.warn(e);
      }
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background">
      <Pressable onPress={() => router.back()} className="mb-8">
        <Text className="text-on-surface-variant font-bold">Close</Text>
      </Pressable>


      <Text className="text-4xl font-black text-on-surface tracking-tight text-center mb-4">
        Unlock Premium
      </Text>
      <Text className="text-lg text-on-surface-variant text-center mb-12">
        Get the most out of Constraint-Driven Productivity.
      </Text>

      <View className="gap-6 mb-12">
        <View className="flex-row items-center gap-4 bg-surface-container-low p-4 rounded-2xl">
            <ShieldCheck color="#b61722" size={24} />
            <View>
                <Text className="font-bold text-on-surface">Zen Mode</Text>
                <Text className="text-xs text-on-surface-variant">Focus strictly on what matters.</Text>
            </View>
        </View>
        <View className="flex-row items-center gap-4 bg-surface-container-low p-4 rounded-2xl">
            <CloudSnow color="#b61722" size={24} />
            <View>
                <Text className="font-bold text-on-surface">Cross-Device Syncing</Text>
                <Text className="text-xs text-on-surface-variant">Never lose your backlog.</Text>
            </View>
        </View>
        <View className="flex-row items-center gap-4 bg-surface-container-low p-4 rounded-2xl">
            <CheckCircle2 color="#b61722" size={24} />
            <View>
                <Text className="font-bold text-on-surface">Advanced Analytics</Text>
                <Text className="text-xs text-on-surface-variant">Track your burnout rate.</Text>
            </View>
        </View>
      </View>

      <View className="gap-4">
        {packages.map((pack) => (
            <Pressable 
                key={pack.identifier}
                onPress={() => purchasePackage(pack)}
                className="bg-primary p-4 rounded-3xl flex-row justify-between items-center shadow-sm"
            >
                <Text className="text-on-primary font-bold text-lg">{pack.product.title}</Text>
                <Text className="text-on-primary font-black text-xl">{pack.product.priceString}</Text>
            </Pressable>
        ))}
        {packages.length === 0 && (
            <View className="bg-surface-container-lowest border border-outline-variant p-4 rounded-3xl flex-row justify-between items-center shadow-sm">
                <Text className="text-on-surface font-bold text-lg">Premium Tier</Text>
                <Text className="text-on-surface font-black text-xl">$4.99/mo</Text>
            </View>
        )}
      </View>
    </SafeScreen>
  );
}


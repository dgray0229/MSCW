import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { useAppStore } from '../store';

// Default API Key provided by the user
const REVENUECAT_API_KEY = 'test_CcIQClCwvFMyzCWkkNTEuUWqTCo';
export const ENTITLEMENT_ID = 'MSCW Pro';

/**
 * Synchronizes the premium status with the global Zustand store
 */
export const updatePremiumStore = (isActive: boolean) => {
  try {
    useAppStore.getState().updateSettings({ isPremium: isActive });
  } catch (err) {
    console.warn('Failed to update premium store:', err);
  }
};

export const initRevenueCat = async () => {
  try {
    // Enable debug logs in development for easy troubleshooting
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Configure SDK with platform-specific keys, falling back to the user's key
    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_RC_IOS_KEY || REVENUECAT_API_KEY,
      android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY || REVENUECAT_API_KEY,
      default: REVENUECAT_API_KEY,
    });

    await Purchases.configure({ apiKey });
    console.log('RevenueCat initialized successfully with key:', apiKey);

    // Fetch and check initial premium status on launch
    const isPro = await checkPremiumStatus();
    updatePremiumStore(isPro);
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
};

/**
 * Checks if the user currently holds the active premium entitlement ('MSCW Pro')
 */
export const checkPremiumStatus = async (): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    updatePremiumStore(isActive);
    return isActive;
  } catch (error) {
    console.error('Failed to retrieve customer info:', error);
    // Fall back to local Zustand premium state if offline or failed
    try {
      return useAppStore.getState().settings.isPremium;
    } catch {
      return false;
    }
  }
};

/**
 * Fetches available offerings and returns packages matching Monthly, Yearly, and Lifetime configurations
 */
export const fetchOfferings = async (): Promise<{
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
  lifetime: PurchasesPackage | null;
}> => {
  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) {
      return { monthly: null, yearly: null, lifetime: null };
    }

    const currentOffering = offerings.current;
    return {
      monthly: currentOffering.monthly || null,
      yearly: currentOffering.annual || null,
      lifetime: currentOffering.lifetime || null,
    };
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return { monthly: null, yearly: null, lifetime: null };
  }
};

/**
 * Purchases a specific package and returns the updated customer info
 */
export const purchasePackage = async (pack: PurchasesPackage): Promise<CustomerInfo | null> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pack);
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    updatePremiumStore(isActive);
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('User cancelled purchase.');
    } else {
      console.error('Error executing purchase:', error);
    }
    return null;
  }
};

/**
 * Restores previous purchases (e.g. if the user reinstalls the app)
 */
export const restorePurchases = async (): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    updatePremiumStore(isActive);
    return isActive;
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return false;
  }
};

/**
 * Presents the RevenueCat Native Paywall if the user does not have 'MSCW Pro'
 * Returns true if the user now has active premium, false otherwise.
 */
export const presentPaywallIfNeeded = async (): Promise<boolean> => {
  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
    });
    const isActive =
      result === RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED ||
      result === RevenueCatUI.PAYWALL_RESULT.PURCHASED;
    updatePremiumStore(isActive);
    return isActive;
  } catch (error) {
    console.error('Error presenting paywall:', error);
    return false;
  }
};

/**
 * Presents the RevenueCat Customer Center (Self-Service management screen)
 */
export const presentCustomerCenter = async () => {
  try {
    if (Platform.OS === 'ios') {
      await RevenueCatUI.presentCustomerCenter();
    } else {
      // Manage subscription on Android via Play Store link
      const customerInfo = await Purchases.getCustomerInfo();
      if (customerInfo.managementURL) {
        // You can use Linking to open managementURL
        const { Linking } = require('react-native');
        await Linking.openURL(customerInfo.managementURL);
      }
    }
  } catch (error) {
    console.error('Error opening Customer Center:', error);
  }
};

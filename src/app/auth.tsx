import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store';
import { firebaseAuth } from '../lib/firebase';
import auth from '@react-native-firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Haptics from 'expo-haptics';
import { SafeScreen } from '../components/SafeScreen';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle,
  Sparkles,
  Info
} from 'lucide-react-native';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthPage() {
  const router = useRouter();
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email validation regex
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  // Real-time password strength evaluation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200/30 dark:bg-slate-800/30' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(password);

  const handleAppleSignIn = async () => {
    setError(null);
    setLoading(true);
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      if (Platform.OS === 'web') {
        // Simulated Apple Login on Web for seamless developer sandbox
        updateSettings({
          user: { email: 'simulated-apple-user@icloud.com', uid: 'web-apple-uid', displayName: 'Apple Guest' }
        });
        if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/' as any);
        return;
      }

      const response = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (response.identityToken) {
        const credential = auth.AppleAuthProvider.credential(response.identityToken);
        await firebaseAuth.signInWithCredential(credential);
        if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/' as any);
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error("Apple Sign-In Failed:", e);
        setError(e.message || "Apple Sign-In was cancelled or failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (Platform.OS === 'web') {
        // Simulated Google Login on Web for seamless developer sandbox
        updateSettings({
          user: { email: 'simulated-google-user@gmail.com', uid: 'web-google-uid', displayName: 'Google Guest' }
        });
        if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/' as any);
        return;
      }

      GoogleSignin.configure({
        webClientId: '515447198418-rlde94lrm4vk6181sm8p7be8cd0u50a0.apps.googleusercontent.com',
      });
      
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      
      if (tokens.idToken) {
        const credential = auth.GoogleAuthProvider.credential(tokens.idToken);
        await firebaseAuth.signInWithCredential(credential);
        if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/' as any);
      } else {
        throw new Error('Failed to retrieve Google Identity Token.');
      }
    } catch (e: any) {
      console.error("Google Sign-In Failed:", e);
      setError(e.message || "Google Sign-In was cancelled or failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);

    // Common validations
    if (!email) {
      setError("Email address is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (mode !== 'forgot') {
      if (!password) {
        setError("Password is required.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!displayName.trim()) {
        setError("Display Name is required.");
        return;
      }
    }

    setLoading(true);
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (mode === 'signin') {
        // Sign In Flow
        if (Platform.OS === 'web' && email.startsWith('simulated')) {
          updateSettings({
            user: { email: email, uid: 'simulated-uid-' + Date.now(), displayName: 'Simulated User' }
          });
        } else {
          await firebaseAuth.signInWithEmailAndPassword(email, password);
        }
        if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/' as any);
      } else if (mode === 'signup') {
        // Sign Up Flow
        let userCred;
        if (Platform.OS === 'web' && email.startsWith('simulated')) {
          updateSettings({
            user: { email: email, uid: 'simulated-uid-' + Date.now(), displayName: displayName.trim() }
          });
        } else {
          userCred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
          if (userCred.user) {
            await userCred.user.updateProfile({
              displayName: displayName.trim(),
            });
            // Trigger local sync manually since user listener may fire before the name updates
            updateSettings({
              user: {
                uid: userCred.user.uid,
                email: userCred.user.email,
                displayName: displayName.trim(),
              }
            });
          }
        }
        if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/' as any);
      } else {
        // Password Reset Flow
        if (Platform.OS === 'web' && email.startsWith('simulated')) {
          setSuccessMessage("Simulation: A password reset email has been sent to " + email);
        } else {
          await firebaseAuth.sendPasswordResetEmail(email);
          setSuccessMessage("A password reset email has been sent to " + email);
        }
        if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMode('signin');
      }
    } catch (e: any) {
      console.error("Auth action failed:", e);
      let friendlyError = e.message || "An authentication error occurred. Please try again.";
      if (e.code === 'auth/user-not-found') friendlyError = "No account found with this email.";
      if (e.code === 'auth/wrong-password') friendlyError = "Incorrect password. Please try again.";
      if (e.code === 'auth/email-already-in-use') friendlyError = "An account already exists with this email.";
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Explicitly navigate away to Today board
    router.replace('/' as any);
  };

  return (
    <SafeScreen className="flex-1 bg-background" scrollable={true}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <View className="flex-row items-center justify-between mb-8">
          <Pressable 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={20} color="#b61722" />
          </Pressable>
          <Text className="text-sm font-black text-primary uppercase tracking-widest">MSCW Sync</Text>
          <View className="w-10 h-10" />
        </View>

        <View className="flex-1 justify-center max-w-md w-full mx-auto pb-12">
          {/* Headline */}
          <View className="items-center mb-8">
            <View className="bg-primary/10 p-3.5 rounded-full mb-3 border border-primary/20">
              <Sparkles size={32} color="#b61722" />
            </View>
            <Text className="text-3xl font-black text-on-surface tracking-tight text-center">
              {mode === 'signin' && 'Welcome Back'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </Text>
            <Text className="text-sm text-on-surface-variant text-center mt-1 px-4 leading-relaxed">
              {mode === 'signin' && 'Sign in to access your constraint-driven sprint dashboard.'}
              {mode === 'signup' && 'Unlock real-time cross-device cloud synchronization.'}
              {mode === 'forgot' && "Enter your email, and we'll send you recovery details."}
            </Text>
          </View>

          {/* Feedback Messages */}
          {error && (
            <View className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex-row items-center gap-3 mb-6">
              <AlertCircle size={20} color="#ef4444" />
              <Text className="text-xs font-bold text-red-500 flex-1">{error}</Text>
            </View>
          )}

          {successMessage && (
            <View className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex-row items-center gap-3 mb-6">
              <CheckCircle size={20} color="#10b981" />
              <Text className="text-xs font-bold text-green-600 flex-1">{successMessage}</Text>
            </View>
          )}

          {/* GLASSMORPHIC CARD */}
          <View className="bg-surface-container-lowest rounded-[32px] p-6 border border-outline-variant shadow-lg gap-5">
            {/* Display Name Input (Sign Up Only) */}
            {mode === 'signup' && (
              <View className="gap-1.5">
                <Text className="text-xs font-black text-on-surface-variant uppercase tracking-wider ml-1">Display Name</Text>
                <View className="flex-row items-center bg-surface-container-high border border-slate-200/60 dark:border-slate-800/60 rounded-xl px-3.5 py-3">
                  <User size={18} color="#79747e" />
                  <TextInput
                    placeholder="E.g., Dev Planner"
                    placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                    className="flex-1 text-on-surface font-medium text-base ml-2.5"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            {/* Email Input */}
            <View className="gap-1.5">
              <Text className="text-xs font-black text-on-surface-variant uppercase tracking-wider ml-1">Email Address</Text>
              <View className="flex-row items-center bg-surface-container-high border border-slate-200/60 dark:border-slate-800/60 rounded-xl px-3.5 py-3">
                <Mail size={18} color="#79747e" />
                <TextInput
                  placeholder="name@domain.com"
                  placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                  className="flex-1 text-on-surface font-medium text-base ml-2.5"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Input */}
            {mode !== 'forgot' && (
              <View className="gap-1.5">
                <Text className="text-xs font-black text-on-surface-variant uppercase tracking-wider ml-1">Password</Text>
                <View className="flex-row items-center bg-surface-container-high border border-slate-200/60 dark:border-slate-800/60 rounded-xl px-3.5 py-3">
                  <Lock size={18} color="#79747e" />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                    className="flex-1 text-on-surface font-medium text-base ml-2.5"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secureTextEntry}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setSecureTextEntry(!secureTextEntry)}>
                    {secureTextEntry ? <EyeOff size={18} color="#79747e" /> : <Eye size={18} color="#79747e" />}
                  </Pressable>
                </View>

                {/* Password Strength Meter */}
                {mode === 'signup' && password.length > 0 && (
                  <View className="mt-2 ml-1">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-xs text-slate-650 dark:text-slate-300 font-bold">Password Strength:</Text>
                      <Text className={`text-xs font-black uppercase ${strength.label === 'Strong' ? 'text-green-600 dark:text-green-400' : strength.label === 'Good' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {strength.label}
                      </Text>
                    </View>
                    <View className="flex-row gap-1 h-1.5 rounded-full overflow-hidden bg-slate-200/30 dark:bg-slate-800/30 w-full">
                      <View className={`h-full ${strength.color} ${strength.score >= 1 ? 'w-[33%]' : 'w-0'}`} />
                      <View className={`h-full ${strength.color} ${strength.score >= 3 ? 'w-[33%]' : 'w-0'}`} />
                      <View className={`h-full ${strength.color} ${strength.score >= 5 ? 'w-[34%]' : 'w-0'}`} />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Confirm Password (Sign Up Only) */}
            {mode === 'signup' && (
              <View className="gap-1.5">
                <Text className="text-xs font-black text-on-surface-variant uppercase tracking-wider ml-1">Confirm Password</Text>
                <View className="flex-row items-center bg-surface-container-high border border-slate-200/60 dark:border-slate-800/60 rounded-xl px-3.5 py-3">
                  <Lock size={18} color="#79747e" />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                    className="flex-1 text-on-surface font-medium text-base ml-2.5"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={secureConfirmTextEntry}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)}>
                    {secureConfirmTextEntry ? <EyeOff size={18} color="#79747e" /> : <Eye size={18} color="#79747e" />}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Forgot Password trigger */}
            {mode === 'signin' && (
              <Pressable 
                onPress={() => setMode('forgot')}
                className="self-end mr-1 active:opacity-60"
              >
                <Text className="text-xs text-primary font-bold">Forgot Password?</Text>
              </Pressable>
            )}

            {/* Primary Action Button */}
            <Pressable
              disabled={loading}
              onPress={handleSubmit}
              className={`bg-primary py-4 rounded-xl items-center justify-center active:opacity-85 shadow-md ${loading ? 'opacity-70' : ''}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-on-primary font-black uppercase tracking-wider text-sm">
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Sign Up'}
                  {mode === 'forgot' && 'Send Reset Email'}
                </Text>
              )}
            </Pressable>

            {/* Toggle Sign In / Sign Up modes */}
            <View className="flex-row justify-center items-center gap-1.5 mt-2">
              <Text className="text-xs text-on-surface-variant">
                {mode === 'signin' && "Don't have an account?"}
                {mode === 'signup' && 'Already have an account?'}
                {mode === 'forgot' && 'Remembered your password?'}
              </Text>
              <Pressable 
                onPress={() => {
                  setError(null);
                  setSuccessMessage(null);
                  if (mode === 'signin') setMode('signup');
                  else setMode('signin');
                }}
                className="active:opacity-60"
              >
                <Text className="text-xs text-primary font-extrabold underline">
                  {mode === 'signin' && 'Sign Up'}
                  {mode === 'signup' && 'Sign In'}
                  {mode === 'forgot' && 'Sign In'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Social Sign-In Connectors (Only for auth modes, not password reset) */}
          {mode !== 'forgot' && (
            <View className="mt-8 gap-4">
              <View className="flex-row items-center gap-3">
                <View className="h-[1px] bg-slate-200/40 dark:bg-slate-800/40 flex-1" />
                <Text className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">Or Sync Instantly With</Text>
                <View className="h-[1px] bg-slate-200/40 dark:bg-slate-800/40 flex-1" />
              </View>

              <View className="flex-row gap-3">
                <Pressable
                  disabled={loading}
                  onPress={handleAppleSignIn}
                  className="flex-1 bg-black py-4 rounded-xl items-center justify-center border border-slate-200/40 dark:border-slate-800/40 flex-row gap-2 active:opacity-80"
                >
                  <Text className="text-white font-black text-sm">Apple</Text>
                </Pressable>
                
                <Pressable
                  disabled={loading}
                  onPress={handleGoogleSignIn}
                  className="flex-1 bg-surface-container-lowest border border-outline-variant py-4 rounded-xl items-center justify-center flex-row gap-2 active:opacity-85"
                >
                  <Text className="text-on-surface font-black text-sm">Google</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Guest Action */}
          <Pressable 
            onPress={handleGuestAccess}
            className="mt-8 self-center bg-surface-container-high/40 border border-slate-200/35 dark:border-slate-800/35 px-6 py-2.5 rounded-full active:opacity-70"
          >
            <Text className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Continue as Guest</Text>
          </Pressable>

          {/* Developer Web Warning Simulation Banner */}
          {Platform.OS === 'web' && (
            <View className="mt-8 flex-row items-start gap-2 bg-secondary-container/20 border border-secondary/15 p-4 rounded-2xl">
              <Info size={16} color="#855300" className="mt-0.5" />
              <View className="flex-1">
                <Text className="text-xs font-black uppercase text-secondary tracking-wide">Developer Web Sandbox</Text>
                <Text className="text-xs text-on-surface-variant leading-relaxed mt-1">
                  You are testing on web. Email addresses starting with &quot;simulated&quot; will use state credentials, and Google/Apple buttons will authenticate simulated accounts for high-speed local evaluation.
                </Text>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

import { tokenCache } from '@/utils/cache';
import { ClerkProvider } from '@clerk/clerk-expo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider } from '../contexts/AuthContext';

import { AlertsProvider } from '@/contexts/AlertsContext';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import '../services/backgroundTask';

export {
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

// Custom dark theme for Guardian AI
const GuardianTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#3b82f6',
    background: '#0d0d0d',
    card: '#1a1a1a',
    text: '#ffffff',
    border: 'rgba(255, 255, 255, 0.1)',
    notification: '#ef4444',
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [isSplashAnimationComplete, setSplashAnimationComplete] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // 1. Hide the native splash screen immediately so our custom one shows
      SplashScreen.hideAsync();

      // 2. Start Pulse Animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 3. After a delay, fade out and show app
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setSplashAnimationComplete(true);
        });
      }, 3000); // Show splash for 3 seconds
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ThemeProvider value={GuardianTheme}>
        <AuthProvider>
          <AlertsProvider>
            <ActionSheetProvider>
              <View style={{ flex: 1 }}>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#0d0d0d' },
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="auth" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
                  <Stack.Screen name="family" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                  {/* <Stack.Screen name="kit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /> */}
                  {/* <Stack.Screen name="documents" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /> */}
                  {/* <Stack.Screen name="neighbors" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /> */}
                  <Stack.Screen name="navigation" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
                </Stack>

                {/* Custom Splash Screen Overlay */}
                {!isSplashAnimationComplete && (
                  <Animated.View style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: fadeAnim,
                      zIndex: 999
                    }
                  ]}>
                    <Animated.Image
                      source={require('../assets/images/logo.png')}
                      resizeMode="contain"
                      style={{
                        width: 280,
                        height: 280,
                        transform: [{ scale: scaleAnim }]
                      }}
                    />
                  </Animated.View>
                )}
              </View>
            </ActionSheetProvider>
          </AlertsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}

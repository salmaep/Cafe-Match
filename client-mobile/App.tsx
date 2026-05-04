import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/query-client';
import { mobileAds, adsAvailable } from './src/lib/ads';
import { AuthProvider } from './src/context/AuthContext';
import { ShortlistProvider } from './src/context/ShortlistContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { LocationProvider } from './src/context/LocationContext';
import AppNavigator from './src/navigation/AppNavigator';
import InAppNotificationBanner from './src/components/InAppNotificationBanner';
// NotificationProvider disabled for Expo Go testing — expo-notifications doesn't
// work in Expo Go SDK 53+ and was causing slow loads + "Something went wrong".
// Re-enable when switching to a dev build (npx expo prebuild + run:android/ios).
// import { NotificationProvider } from './src/context/NotificationContext';

export default function App() {
  const navRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    if (!adsAvailable) return;
    mobileAds()
      .initialize()
      .catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer ref={navRef}>
          <LocationProvider>
            <AuthProvider>
              <ShortlistProvider>
                <PreferencesProvider>
                  <StatusBar style="dark" />
                  <AppNavigator />
                  <InAppNotificationBanner
                    onTap={() => {
                      try {
                        navRef.current?.navigate('Notifications' as never);
                      } catch {}
                    }}
                  />
                </PreferencesProvider>
              </ShortlistProvider>
            </AuthProvider>
          </LocationProvider>
        </NavigationContainer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

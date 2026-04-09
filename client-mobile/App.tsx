import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { ShortlistProvider } from './src/context/ShortlistContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { LocationProvider } from './src/context/LocationContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <LocationProvider>
          <AuthProvider>
            <ShortlistProvider>
              <PreferencesProvider>
                <StatusBar style="dark" />
                <AppNavigator />
              </PreferencesProvider>
            </ShortlistProvider>
          </AuthProvider>
        </LocationProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

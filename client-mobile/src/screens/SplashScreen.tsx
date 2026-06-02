import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CafeMatchLogo from '../components/CafeMatchLogo';
import { usePreferences } from '../context/PreferencesContext';
import { colors } from '../theme';
import { APP_VERSION } from '../constant/version';

export default function SplashScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { hydrated, wizardCompleted, preferences } = usePreferences();
  const [minElapsed, setMinElapsed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    // Keep the logo on screen a beat so it doesn't flash by on fast devices.
    const timer = setTimeout(() => setMinElapsed(true), 1500);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  // Route once prefs are hydrated AND the min splash time has elapsed. Returning
  // users (completed wizard + saved prefs) skip straight into the app; everyone
  // else is sent to onboarding. Mirrors web DiscoverPage gating.
  useEffect(() => {
    if (!minElapsed || !hydrated) return;
    if (wizardCompleted && preferences) {
      navigation.replace('MainTabs');
    } else {
      navigation.replace('Wizard');
    }
  }, [minElapsed, hydrated, wizardCompleted, preferences, navigation]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <CafeMatchLogo size={64} />
      </Animated.View>
      <Animated.Text
        style={[styles.version, { opacity: fadeAnim, bottom: 40 + insets.bottom }]}
      >
        v{APP_VERSION}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  version: {
    position: 'absolute',
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

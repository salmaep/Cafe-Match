import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'CafeMatch',
  slug: 'cafematch',
  scheme: 'cafematch',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: false,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FAF9F6',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.anonymous.cafematch',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-web-browser'],
  // Ads plugin disabled — uncomment after configuring AdMob
  // plugins: [
  //   'expo-web-browser',
  //   [
  //     'react-native-google-mobile-ads',
  //     { androidAppId: '...', iosAppId: '...' },
  //   ],
  // ],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: {
      projectId: '3a248a2a-407e-49bf-ae6e-16fa84499b98',
    },
  },
});

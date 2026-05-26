import { ExpoConfig, ConfigContext } from 'expo/config';

// Only attach googleServicesFile when the file actually exists on disk.
// Firebase plugin is currently disabled, so missing files shouldn't break prebuild.
// Uses require() to avoid needing @types/node — this file runs on Node at
// build time, so the modules are available at runtime regardless.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs') as { existsSync: (p: string) => boolean };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodePath = require('path') as { resolve: (...p: string[]) => string };
declare const __dirname: string;

function resolveIfExists(envVar: string | undefined, fallback: string): string | undefined {
  const candidate = envVar ?? nodePath.resolve(__dirname, fallback);
  return fs.existsSync(candidate) ? candidate : undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'CafeMatch',
  slug: 'cafematch',
  scheme: 'cafematch',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FAF9F6',
  },
  ios: {
    supportsTablet: true,
    googleServicesFile: resolveIfExists(
      process.env.GOOGLE_SERVICES_PLIST,
      './GoogleService-Info.plist',
    ),
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.anonymous.cafematch',
    googleServicesFile: resolveIfExists(
      process.env.GOOGLE_SERVICES_JSON,
      './google-services.json',
    ),
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    '@react-native-firebase/app',
    '@react-native-google-signin/google-signin',
    [
      'react-native-fbsdk-next',
      {
        appID: process.env.EXPO_PUBLIC_FB_APP_ID ?? '805065779071148',
        clientToken:
          process.env.EXPO_PUBLIC_FB_CLIENT_TOKEN ?? 'cf15a6aeb63968ce1bae60a2e2bfbbbb',
        displayName: 'CafeMatch',
        scheme: `fb${process.env.EXPO_PUBLIC_FB_APP_ID ?? '805065779071148'}`,
        advertiserIDCollectionEnabled: false,
        autoLogAppEventsEnabled: false,
        isAutoInitEnabled: true,
      },
    ],
    'expo-web-browser',
    [
      'expo-build-properties',
      {
        ios: { useFrameworks: 'static' },
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        // TEMPORARY: Google's official test App IDs while the real AdMob app
        // ID (`ca-app-pub-1232702196287166~3064497244`) propagates — Google
        // notes new ad units can take up to ~1 hour to start serving. Test
        // App IDs always work instantly, so this lets us verify the SDK is
        // wired correctly. Swap back to the real App ID once it's live.
        androidAppId: 'ca-app-pub-3940256099942544~3347511713',
        iosAppId: 'ca-app-pub-3940256099942544~1458002511',
        userTrackingUsageDescription:
          'This identifier will be used to deliver more relevant ads to you.',
      },
    ],
  ],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL,
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    googleMapsMapId: process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID,
    eas: {
      projectId: '482a9e47-290d-408a-b5b9-413705fc18d0',
    },
  },
});

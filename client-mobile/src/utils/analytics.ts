/**
 * Firebase Analytics wrapper.
 *
 * The native module is not available in Expo Go — Firebase Analytics requires
 * a dev build (`expo prebuild` + `expo run:android|ios`) and the
 * `google-services.json` / `GoogleService-Info.plist` files configured via
 * `app.config.ts`. Until that's set up, every call here is a no-op so
 * developer-on-Expo-Go workflows keep working.
 */

import { NativeModules } from 'react-native';

type AnalyticsInstance = {
  logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>;
  logScreenView: (params: { screen_name: string; screen_class?: string }) => Promise<void>;
};

let analyticsInstance: AnalyticsInstance | null = null;
let attempted = false;

function getInstance(): AnalyticsInstance | null {
  if (attempted) return analyticsInstance;
  attempted = true;
  // Skip entirely if the native module isn't linked (e.g. Expo Go).
  if (!NativeModules?.RNFBAppModule) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app') as {
      getApp: () => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analytics = require('@react-native-firebase/analytics') as {
      default: (app: unknown) => AnalyticsInstance;
    };
    // Pass the app explicitly — avoids the deprecated no-arg `app()` call
    // that triggers the "use getApp() instead" warning in v21+.
    analyticsInstance = analytics.default(getApp());
  } catch {
    analyticsInstance = null;
  }
  return analyticsInstance;
}

export async function logScreenView(screenName: string, screenClass?: string): Promise<void> {
  const analytics = getInstance();
  if (!analytics) return;
  try {
    await analytics.logScreenView({
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    });
  } catch {
    // Swallow — analytics must never break the UI.
  }
}

export async function logEvent(name: string, params?: Record<string, unknown>): Promise<void> {
  const analytics = getInstance();
  if (!analytics) return;
  try {
    await analytics.logEvent(name, params);
  } catch {
    // Swallow.
  }
}

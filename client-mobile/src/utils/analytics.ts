/**
 * Firebase Analytics wrapper.
 *
 * The native module is not available in Expo Go — Firebase Analytics requires
 * a dev build (`expo prebuild` + `expo run:android|ios`) and the
 * `google-services.json` / `GoogleService-Info.plist` files configured via
 * `app.config.ts`. Until that's set up, every call here is a no-op so
 * developer-on-Expo-Go workflows keep working.
 */

type AnalyticsModule = {
  default?: () => {
    logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>;
    logScreenView: (params: { screen_name: string; screen_class?: string }) => Promise<void>;
  };
};

let analyticsModule: AnalyticsModule | null = null;
let attempted = false;

function getAnalytics() {
  if (attempted) return analyticsModule;
  attempted = true;
  try {
    // Loaded lazily so a missing native module fails soft.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    analyticsModule = require('@react-native-firebase/analytics') as AnalyticsModule;
  } catch {
    analyticsModule = null;
  }
  return analyticsModule;
}

export async function logScreenView(screenName: string, screenClass?: string): Promise<void> {
  const mod = getAnalytics();
  if (!mod?.default) return;
  try {
    await mod.default().logScreenView({
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    });
  } catch {
    // Swallow — analytics must never break the UI.
  }
}

export async function logEvent(name: string, params?: Record<string, unknown>): Promise<void> {
  const mod = getAnalytics();
  if (!mod?.default) return;
  try {
    await mod.default().logEvent(name, params);
  } catch {
    // Swallow.
  }
}

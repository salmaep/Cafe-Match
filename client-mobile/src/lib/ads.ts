import Constants from 'expo-constants';

// Expo Go does not bundle `react-native-google-mobile-ads` (the native module
// `RNGoogleMobileAdsModule` is missing), so importing the package at all crashes
// the JS runtime via `TurboModuleRegistry.getEnforcing(...)`. Lazy-require it
// behind this flag instead of using a static `import`.
export const isExpoGo = Constants.appOwnership === 'expo';

type AdsModule = typeof import('react-native-google-mobile-ads');

let mod: AdsModule | null = null;
if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('react-native-google-mobile-ads') as AdsModule;
  } catch {
    mod = null;
  }
}

export const adsAvailable = mod !== null;

// `mobileAds()` initializer — no-op stub in Expo Go so callers don't have to
// branch.
const mobileAdsStub = () => ({
  initialize: () => Promise.resolve(),
});
export const mobileAds: AdsModule['default'] =
  (mod?.default as AdsModule['default']) ?? (mobileAdsStub as unknown as AdsModule['default']);

// Constants — provide empty fallbacks. Callers should still gate rendering
// with `adsAvailable`, but these stubs keep the imports type-safe.
export const TestIds: AdsModule['TestIds'] =
  mod?.TestIds ??
  ({
    BANNER: '',
    INTERSTITIAL: '',
    REWARDED: '',
    REWARDED_INTERSTITIAL: '',
    APP_OPEN: '',
    NATIVE: '',
    NATIVE_VIDEO: '',
    GAM_BANNER: '',
    GAM_INTERSTITIAL: '',
    GAM_REWARDED: '',
    GAM_REWARDED_INTERSTITIAL: '',
    GAM_APP_OPEN: '',
    GAM_NATIVE: '',
    GAM_NATIVE_VIDEO: '',
  } as unknown as AdsModule['TestIds']);

// Re-export the JSX/runtime symbols. They're undefined in Expo Go — components
// that use them must early-return when `adsAvailable` is false.
export const NativeAd = mod?.NativeAd as AdsModule['NativeAd'] | undefined;
export const NativeAdView = mod?.NativeAdView as AdsModule['NativeAdView'] | undefined;
export const NativeAsset = mod?.NativeAsset as AdsModule['NativeAsset'] | undefined;
export const NativeAssetType =
  mod?.NativeAssetType as AdsModule['NativeAssetType'] | undefined;
export const NativeMediaView =
  mod?.NativeMediaView as AdsModule['NativeMediaView'] | undefined;

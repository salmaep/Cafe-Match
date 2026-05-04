import { Platform } from 'react-native';
import { TestIds } from '../lib/ads';

// Set to true to force test ads on physical devices during QA in a release build.
// Production builds should leave this false so real ads serve.
const FORCE_TEST_ADS = false;

const USE_TEST_ADS = __DEV__ || FORCE_TEST_ADS;

// Real AdMob unit IDs — fill in before shipping to prod.
// Keep platform-specific because AdMob unit IDs are per-platform.
const PROD_UNIT_IDS = {
  native: Platform.select({
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    default: '',
  }) as string,
};

export const adUnitIds = {
  native: USE_TEST_ADS ? TestIds.NATIVE : PROD_UNIT_IDS.native,
};

export const isTestMode = USE_TEST_ADS;

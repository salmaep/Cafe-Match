// AdSense client + slot config. Real values are read from Vite env at build time
// so we don't hardcode prod IDs in the repo. In dev (`npm run dev`) the values
// are typically empty, so the in-feed ad component renders a placeholder
// instead of calling AdSense (avoids "invalid traffic" flags during testing).
//
// To enable in prod, set in .env.production (or your deploy env):
//   VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
//   VITE_ADSENSE_INFEED_SLOT=XXXXXXXXXX
//
// To smoke-test the AdSense embed in dev without serving real ads, also set
// VITE_ADSENSE_TEST=true — AdSense will return test creatives.

export const ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string) || '';
export const ADSENSE_INFEED_SLOT =
  (import.meta.env.VITE_ADSENSE_INFEED_SLOT as string) || '';

export const ADSENSE_TEST_MODE =
  import.meta.env.DEV || import.meta.env.VITE_ADSENSE_TEST === 'true';

export const ADSENSE_ENABLED = !!ADSENSE_CLIENT && !!ADSENSE_INFEED_SLOT;

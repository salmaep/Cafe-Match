import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };

if (!extra.apiBaseUrl) {
  throw new Error(
    "[env] EXPO_PUBLIC_API_URL is not set.\n" +
      "Create a .env file in client-mobile/ with:\n" +
      "  EXPO_PUBLIC_API_URL=http://<your-ip>:3000/api/v1"
  );
}

export const API_BASE_URL: string = extra.apiBaseUrl;

export const API_TIMEOUT_MS = 30_000;

export const MAX_BODY_LENGTH = 50 * 1024 * 1024;

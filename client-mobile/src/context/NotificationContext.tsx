import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import { registerPushToken } from '../services/api';

// Expo Go (SDK 53+) no longer supports remote push tokens. Detect it so we skip
// getExpoPushTokenAsync() which throws and crashes the app in Expo Go.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// When a notification arrives while app is FOREGROUNDED, show banner+sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextValue {
  expoPushToken: string | null;
  /** Manually present an alert (used by Together Bomb detection) */
  presentLocalAlert: (title: string, body: string, data?: any) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  expoPushToken: null,
  presentLocalAlert: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

async function registerForPush(): Promise<string | null> {
  // Android requires a notification channel
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D48B3A',
      });
    } catch {}
  }

  if (!Device.isDevice) {
    console.log('[push] not a physical device, skipping push registration');
    return null;
  }

  // Expo Go SDK 53+ doesn't support remote push — skip to avoid crash
  if (IS_EXPO_GO) {
    console.log('[push] running in Expo Go — skipping push token (use dev build for push)');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[push] permission denied');
    return null;
  }

  try {
    // For Expo Go + EAS dev builds, projectId is picked up from app.json automatically
    const tokenResult = await Notifications.getExpoPushTokenAsync();
    console.log('[push] token:', tokenResult.data);
    return tokenResult.data;
  } catch (err: any) {
    console.warn('[push] failed to get token:', err?.message);
    return null;
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const receivedListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Register + upload token whenever a user logs in
  useEffect(() => {
    if (!user) return;

    (async () => {
      const token = await registerForPush();
      if (!token) return;
      setExpoPushToken(token);
      try {
        await registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
        console.log('[push] token registered with backend');
      } catch (err: any) {
        console.warn('[push] failed to register token with backend:', err?.message);
      }
    })();
  }, [user?.id]);

  // Listen to foreground notifications
  useEffect(() => {
    receivedListener.current = Notifications.addNotificationReceivedListener((notif) => {
      console.log('[push] received in foreground:', notif.request.content.title);
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener((resp) => {
      console.log('[push] user tapped notification:', resp.notification.request.content.data);
    });
    return () => {
      try { receivedListener.current?.remove(); } catch {}
      try { responseListener.current?.remove(); } catch {}
    };
  }, []);

  // Schedule a local notification immediately (for in-app Together Bomb trigger)
  const presentLocalAlert = async (title: string, body: string, data?: any) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data, sound: 'default' },
        trigger: null, // fire now
      });
    } catch {
      // Fallback: plain Alert
      Alert.alert(title, body);
    }
  };

  return (
    <NotificationContext.Provider value={{ expoPushToken, presentLocalAlert }}>
      {children}
    </NotificationContext.Provider>
  );
}

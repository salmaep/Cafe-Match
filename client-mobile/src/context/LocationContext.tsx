import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import { DEFAULT_LOCATION } from '../constant/location';

const CACHE_KEY = 'cm_last_location';

interface LocationContextType {
  latitude: number;
  longitude: number;
  isLoading: boolean;
  hasPermission: boolean;
  refresh: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType>({
  latitude: DEFAULT_LOCATION.latitude,
  longitude: DEFAULT_LOCATION.longitude,
  isLoading: true,
  hasPermission: false,
  refresh: async () => {},
});

export const useLocation = () => useContext(LocationContext);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [latitude, setLatitude] = useState(DEFAULT_LOCATION.latitude);
  const [longitude, setLongitude] = useState(DEFAULT_LOCATION.longitude);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  const persist = (lat: number, lng: number) => {
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng })).catch(() => {});
  };

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setHasPermission(false);
        setIsLoading(false);
        Alert.alert(
          'Location Permission Needed',
          'CafeMatch needs your location to find nearby cafes and show accurate distances. Please enable location access in your device settings.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Use Default', style: 'cancel' },
          ],
        );
        return;
      }

      setHasPermission(true);

      // Fast path — return device-cached position (no GPS query).
      try {
        const last = await Location.getLastKnownPositionAsync({
          maxAge: 60_000,
          requiredAccuracy: 200,
        });
        if (last) {
          setLatitude(last.coords.latitude);
          setLongitude(last.coords.longitude);
          persist(last.coords.latitude, last.coords.longitude);
          setIsLoading(false);
        }
      } catch {
        // Ignore — fall through to slow path.
      }

      // Slow path — fresh GPS reading.
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      persist(loc.coords.latitude, loc.coords.longitude);
    } catch {
      // Keep current/default location on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Hydrate from AsyncStorage cache first for instant render before GPS resolves.
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const { lat, lng } = JSON.parse(raw);
          if (typeof lat === 'number' && typeof lng === 'number') {
            setLatitude(lat);
            setLongitude(lng);
          }
        } catch {
          // ignore
        }
      })
      .finally(() => {
        requestLocation();
      });
  }, []);

  return (
    <LocationContext.Provider
      value={{ latitude, longitude, isLoading, hasPermission, refresh: requestLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
}

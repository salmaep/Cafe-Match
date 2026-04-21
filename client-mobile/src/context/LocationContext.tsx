import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import { DEFAULT_LOCATION } from '../data/mockCafes';

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
      // Use highest-precision GPS so wizard radius/check-in rely on the
      // user's actual coords, not a coarse balanced fix.
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
    } catch {
      // Keep default location on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <LocationContext.Provider
      value={{ latitude, longitude, isLoading, hasPermission, refresh: requestLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
}

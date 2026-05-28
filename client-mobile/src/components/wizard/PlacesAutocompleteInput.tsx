import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { MapPin, AlertTriangle, Check } from 'lucide-react-native';
import { errorsText, wizardText } from '@shared/i18n/keys';
import { colors, radius, spacing } from '../../theme';

interface Props {
  onSelect: (lat: number, lng: number, label: string) => void;
  placeholder?: string;
  country?: string;
}

interface Prediction {
  placeId: string;
  description: string;
}

const AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

function randomToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function PlacesAutocompleteInput({
  onSelect,
  placeholder,
  country = 'id',
}: Props) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t(wizardText.searchPlacePlaceholder);
  const apiKey = useMemo(() => {
    const extra = (Constants.expoConfig?.extra ?? {}) as {
      googleMapsApiKey?: string;
    };
    return extra.googleMapsApiKey ?? '';
  }, []);

  const [input, setInput] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<string>(randomToken());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const fetchPredictions = async (value: string) => {
    if (!apiKey) {
      setError(t(errorsText.googleMapsKeyMissing));
      setPredictions([]);
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      setPredictions([]);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        input: trimmed,
        key: apiKey,
        sessiontoken: sessionTokenRef.current,
      });
      if (country) params.set('components', `country:${country}`);
      const res = await fetch(`${AUTOCOMPLETE_URL}?${params.toString()}`, {
        signal: controller.signal,
      });
      const json = await res.json();
      if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
        setError(json.error_message || t(errorsText.searchFailedWithStatus, { status: json.status }));
        setPredictions([]);
        return;
      }
      const items: Prediction[] = (json.predictions ?? [])
        .slice(0, 5)
        .map((p: any) => ({
          placeId: p.place_id,
          description: p.description,
        }));
      setPredictions(items);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || t(errorsText.searchPlaceFailed));
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    setSelectedLabel(null);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 250);
  };

  const handlePick = async (p: Prediction) => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        place_id: p.placeId,
        key: apiKey,
        fields: 'geometry,formatted_address,name',
        sessiontoken: sessionTokenRef.current,
      });
      const res = await fetch(`${DETAILS_URL}?${params.toString()}`);
      const json = await res.json();
      if (json.status !== 'OK' || !json.result?.geometry?.location) {
        setError(json.error_message || t(errorsText.detailsFailedWithStatus, { status: json.status }));
        return;
      }
      const lat = json.result.geometry.location.lat;
      const lng = json.result.geometry.location.lng;
      const label =
        json.result.name || json.result.formatted_address || p.description;
      setInput(p.description);
      setSelectedLabel(label);
      setPredictions([]);
      setOpen(false);
      sessionTokenRef.current = randomToken();
      onSelect(lat, lng, label);
    } catch (err: any) {
      setError(err?.message || t(errorsText.placeDetailsFailed));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={handleInputChange}
          onFocus={() => setOpen(true)}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && (
          <ActivityIndicator
            color={colors.accent}
            style={styles.inputSpinner}
            size="small"
          />
        )}
      </View>

      {open && predictions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={predictions}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.placeId}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => handlePick(item)}
                style={[
                  styles.predictionItem,
                  index < predictions.length - 1 && styles.predictionItemBorder,
                ]}
              >
                <MapPin size={14} color={colors.textSecondary} strokeWidth={2} style={styles.predictionIconLead} />
                <Text style={styles.predictionText} numberOfLines={2}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {!!error && (
        <View style={styles.errorRow}>
          <AlertTriangle size={12} color="#B91C1C" strokeWidth={2.2} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {selectedLabel && (
        <View style={styles.selectedRow}>
          <Check size={12} color="#065F46" strokeWidth={2.5} />
          <Text style={styles.selectedText}>{selectedLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  inputRow: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: 40,
    fontSize: 15,
    color: colors.primary,
  },
  inputSpinner: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E8E4DD',
    maxHeight: 240,
    overflow: 'hidden',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  predictionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  predictionIconLead: { marginRight: spacing.xs },
  predictionText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: colors.accent,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  selectedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
});

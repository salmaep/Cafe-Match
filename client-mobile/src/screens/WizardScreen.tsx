import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { usePreferences } from '../context/PreferencesContext';
import { colors, spacing, radius } from '../theme';
import { Purpose, Facility, WizardPreferences } from '../types';
import { useLocation } from '../context/LocationContext';
import { usePurposes } from '../queries/purposes/use-purposes';
import { useDestinations } from '../queries/destinations/use-destinations';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 4;

// Emoji is presentation-only; mapped by slug from /purposes payload.
const PURPOSE_EMOJI_BY_SLUG: Record<string, string> = {
  'me-time': '🧘',
  'date': '💑',
  'family-time': '👨‍👩‍👧',
  'group-study': '📚',
  'wfc': '💻',
};

// Parse coord strings — supports paste from Google Maps, spreadsheets, plain text.
// Examples that work:
//   "-6.9148492, 107.6648254"
//   "-6.9148492 107.6648254"   (space separator)
//   "-6.9148492;107.6648254"   (semicolon)
//   "-6.9148492,107.6648254"   (no space)
//   "(-6.9148492, 107.6648254)" (parentheses, e.g. from Google Maps)
//   "  -6.9148492 ,  107.6648254  " (extra whitespace, tabs)
function parseCoords(input: string): { lat: number; lng: number } | null {
  // Strip outer whitespace, parentheses, brackets, and curly braces
  const cleaned = input.trim().replace(/^[\(\[\{]+|[\)\]\}]+$/g, '').trim();
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

const AMENITIES: { label: Facility; icon: string }[] = [
  { label: 'WiFi', icon: '📶' },
  { label: 'Power Outlet', icon: '🔌' },
  { label: 'Mushola', icon: '🕌' },
  { label: 'Parking', icon: '🅿️' },
  { label: 'Kid-Friendly', icon: '👶' },
  { label: 'Quiet Atmosphere', icon: '🤫' },
  { label: 'Large Tables', icon: '🪑' },
  { label: 'Outdoor Area', icon: '🌿' },
];

export default function WizardScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { setPreferences, setWizardCompleted } = usePreferences();
  const { latitude: userLat, longitude: userLng } = useLocation();
  const purposesQuery = usePurposes();
  const destinationsQuery = useDestinations();
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [purpose, setPurpose] = useState<Purpose | undefined>();
  const [locationType, setLocationType] = useState<'current' | 'custom'>('current');
  const [customAddress, setCustomAddress] = useState('');
  const [customLat, setCustomLat] = useState<number | null>(null);
  const [customLng, setCustomLng] = useState<number | null>(null);
  const [radiusVal, setRadiusVal] = useState(1);
  const [amenities, setAmenities] = useState<Facility[]>([]);

  const radiusOptions = [0.5, 1, 2];

  const animateStep = (next: number) => {
    Animated.timing(slideAnim, {
      toValue: -next * width,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setStep(next);
  };

  const handleSkip = () => {
    setPreferences(null);
    setWizardCompleted(false);
    navigation.replace('MainTabs');
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      animateStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 0) animateStep(step - 1);
  };

  const handleFinish = () => {
    const useCustomCoords = locationType === 'custom' && customLat !== null && customLng !== null;
    const prefs: WizardPreferences = {
      purpose,
      location: {
        type: locationType,
        latitude: useCustomCoords ? customLat! : userLat,
        longitude: useCustomCoords ? customLng! : userLng,
        label: locationType === 'custom' ? customAddress || 'Custom Destination' : 'Current Location',
      },
      radius: radiusVal,
      amenities: amenities.length > 0 ? amenities : undefined,
    };
    setPreferences(prefs);
    setWizardCompleted(true);
    navigation.replace('CardSwipe');
  };

  const toggleAmenity = (a: Facility) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  // Block "Next" on Step 2 (location) when user picked custom but coords are empty.
  const isNextDisabled =
    step === 1 &&
    locationType === 'custom' &&
    (customLat === null || customLng === null);

  const renderProgressDots = () => (
    <View style={styles.dotsRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {step > 0 ? (
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
        {renderProgressDots()}
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Steps */}
      <Animated.View
        style={[styles.stepsRow, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* Step 1: Purpose */}
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What's your vibe today?</Text>
          <Text style={styles.stepSubtitle}>Choose one that fits your mood</Text>
          {purposesQuery.isLoading ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : purposesQuery.isError ? (
            <Text style={styles.coordHint}>
              ⚠️ Gagal memuat purposes dari server.{' '}
              <Text style={{ color: colors.accent }} onPress={() => purposesQuery.refetch()}>
                Coba lagi
              </Text>
            </Text>
          ) : (
            <View style={styles.optionsGrid}>
              {(purposesQuery.data ?? []).map((p) => {
                const label = p.name as Purpose;
                const emoji = PURPOSE_EMOJI_BY_SLUG[p.slug] ?? '☕';
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.optionCard, purpose === label && styles.optionCardActive]}
                    onPress={() => setPurpose(label)}
                  >
                    <Text style={styles.optionEmoji}>{emoji}</Text>
                    <Text
                      style={[styles.optionLabel, purpose === label && styles.optionLabelActive]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Step 2: Location */}
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Where are you heading?</Text>
          <Text style={styles.stepSubtitle}>We'll find cafes near you</Text>
          <View style={styles.locationOptions}>
            <TouchableOpacity
              style={[styles.locationCard, locationType === 'current' && styles.optionCardActive]}
              onPress={() => setLocationType('current')}
            >
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={[styles.locationLabel, locationType === 'current' && styles.optionLabelActive]}>
                Use my current location
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.locationCard, locationType === 'custom' && styles.optionCardActive]}
              onPress={() => setLocationType('custom')}
            >
              <Text style={styles.locationIcon}>🔍</Text>
              <Text style={[styles.locationLabel, locationType === 'custom' && styles.optionLabelActive]}>
                Enter a destination
              </Text>
            </TouchableOpacity>
          </View>
          {locationType === 'custom' && (
            <>
              <TextInput
                style={styles.textInput}
                placeholder="Nama daerah atau koordinat (-6.9175, 107.6191)"
                placeholderTextColor={colors.textSecondary}
                value={customAddress}
                onChangeText={(text) => {
                  setCustomAddress(text);
                  const coords = parseCoords(text);
                  if (coords) {
                    setCustomLat(coords.lat);
                    setCustomLng(coords.lng);
                  } else {
                    setCustomLat(null);
                    setCustomLng(null);
                  }
                }}
              />
              {customAddress.length > 0 && (customLat === null || customLng === null) && (
                <Text style={styles.coordHint}>
                  ⚠️ Format koordinat: "lat, lng" — atau pilih suggestion di bawah
                </Text>
              )}
              {customLat !== null && customLng !== null && (
                <Text style={styles.coordOk}>
                  ✓ Koordinat: {customLat.toFixed(4)}, {customLng.toFixed(4)}
                </Text>
              )}
              <Text style={styles.suggestLabel}>Suggested Destinations</Text>
              {destinationsQuery.isLoading ? (
                <View style={styles.loaderRow}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : (
                <View style={styles.suggestRow}>
                  {(destinationsQuery.data ?? []).map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.suggestChip,
                        customAddress === s.label && styles.suggestChipActive,
                      ]}
                      onPress={() => {
                        setCustomAddress(s.label);
                        setCustomLat(s.latitude);
                        setCustomLng(s.longitude);
                      }}
                    >
                      <Text style={styles.suggestChipMain}>{s.label}</Text>
                      {s.sublabel ? (
                        <Text style={styles.suggestChipSub}>{s.sublabel}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Step 3: Radius */}
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>How far are you willing to go?</Text>
          <Text style={styles.stepSubtitle}>Select your search radius</Text>
          <View style={styles.radiusRow}>
            {radiusOptions.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusBtn, radiusVal === r && styles.radiusBtnActive]}
                onPress={() => setRadiusVal(r)}
              >
                <Text style={[styles.radiusText, radiusVal === r && styles.radiusTextActive]}>
                  {r} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.radiusVisual}>
            <View
              style={[
                styles.radiusCircle,
                { width: radiusVal * 80, height: radiusVal * 80, borderRadius: radiusVal * 40 },
              ]}
            />
            <Text style={styles.radiusCenterDot}>📍</Text>
          </View>
        </View>

        {/* Step 4: Amenities */}
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Anything specific you need?</Text>
          <Text style={styles.stepSubtitle}>Select all that apply</Text>
          <ScrollView contentContainerStyle={styles.amenitiesGrid} showsVerticalScrollIndicator={false}>
            {AMENITIES.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={[styles.amenityChip, amenities.includes(a.label) && styles.amenityChipActive]}
                onPress={() => toggleAmenity(a.label)}
              >
                <Text style={styles.amenityIcon}>{a.icon}</Text>
                <Text
                  style={[
                    styles.amenityLabel,
                    amenities.includes(a.label) && styles.amenityLabelActive,
                  ]}
                >
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, isNextDisabled && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={isNextDisabled}
        >
          <Text style={styles.nextBtnText}>
            {step === TOTAL_STEPS - 1 ? 'Find My Cafe' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '500' },
  skipText: { fontSize: 15, color: colors.textSecondary },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  dotActive: { backgroundColor: colors.accent, width: 24 },
  dotDone: { backgroundColor: colors.accent },
  stepsRow: { flexDirection: 'row', flex: 1 },
  stepContainer: {
    width,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    minWidth: (width - spacing.lg * 2 - spacing.sm) / 2 - 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: colors.accent,
    backgroundColor: '#FDF6EC',
  },
  optionEmoji: { fontSize: 28, marginBottom: spacing.xs },
  optionLabel: { fontSize: 14, fontWeight: '600', color: colors.primary },
  optionLabelActive: { color: colors.accent },
  locationOptions: { gap: spacing.sm },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  locationIcon: { fontSize: 24, marginRight: spacing.md },
  locationLabel: { fontSize: 15, fontWeight: '600', color: colors.primary },
  textInput: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.primary,
  },
  coordHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.accent,
  },
  coordOk: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  suggestLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  suggestChipActive: {
    borderColor: colors.accent,
    backgroundColor: '#FDF6EC',
  },
  suggestChipMain: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  suggestChipSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  radiusBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  radiusBtnActive: {
    borderColor: colors.accent,
    backgroundColor: '#FDF6EC',
  },
  radiusText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  radiusTextActive: { color: colors.accent },
  radiusVisual: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  radiusCircle: {
    backgroundColor: 'rgba(212, 139, 58, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(212, 139, 58, 0.3)',
    position: 'absolute',
  },
  radiusCenterDot: { fontSize: 24 },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: 100,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  amenityChipActive: {
    borderColor: colors.accent,
    backgroundColor: '#FDF6EC',
  },
  loaderRow: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  amenityIcon: { fontSize: 16, marginRight: spacing.xs },
  amenityLabel: { fontSize: 14, fontWeight: '600', color: colors.primary },
  amenityLabelActive: { color: colors.accent },
  bottomBar: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

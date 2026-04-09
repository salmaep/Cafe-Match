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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { usePreferences } from '../context/PreferencesContext';
import { colors, spacing, radius } from '../theme';
import { Purpose, Facility, WizardPreferences } from '../types';
import { useLocation } from '../context/LocationContext';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 4;

const PURPOSES: { label: Purpose; emoji: string }[] = [
  { label: 'Me Time', emoji: '🧘' },
  { label: 'Date', emoji: '💑' },
  { label: 'Family Time', emoji: '👨‍👩‍👧' },
  { label: 'Group Study', emoji: '📚' },
  { label: 'WFC', emoji: '💻' },
];

const DESTINATION_SUGGESTIONS: { label: string; sublabel: string; latitude: number; longitude: number }[] = [
  { label: 'Dago', sublabel: 'Bandung', latitude: -6.8800, longitude: 107.6100 },
  { label: 'Tebet', sublabel: 'Jakarta Selatan', latitude: -6.2241, longitude: 106.8446 },
  { label: 'Bandung', sublabel: 'Kota Bandung', latitude: -6.9175, longitude: 107.6191 },
  { label: 'Jakarta Selatan', sublabel: 'DKI Jakarta', latitude: -6.2615, longitude: 106.8106 },
];

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
          <View style={styles.optionsGrid}>
            {PURPOSES.map((p) => (
              <TouchableOpacity
                key={p.label}
                style={[styles.optionCard, purpose === p.label && styles.optionCardActive]}
                onPress={() => setPurpose(p.label)}
              >
                <Text style={styles.optionEmoji}>{p.emoji}</Text>
                <Text
                  style={[styles.optionLabel, purpose === p.label && styles.optionLabelActive]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
                placeholder="e.g. Senopati, Jakarta"
                placeholderTextColor={colors.textSecondary}
                value={customAddress}
                onChangeText={(text) => {
                  setCustomAddress(text);
                  // Clear pinned coords when user types manually
                  setCustomLat(null);
                  setCustomLng(null);
                }}
              />
              <Text style={styles.suggestLabel}>Suggested Destinations</Text>
              <View style={styles.suggestRow}>
                {DESTINATION_SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s.label}
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
                    <Text style={styles.suggestChipSub}>{s.sublabel}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
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
  nextBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

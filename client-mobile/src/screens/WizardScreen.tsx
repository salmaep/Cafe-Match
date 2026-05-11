import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { Circle } from 'react-native-maps';
import RadiusPickerModal from '../components/cafe/RadiusPickerModal';
import { usePreferences } from '../context/PreferencesContext';
import { colors, spacing, radius } from '../theme';
import { Purpose, WizardPreferences } from '../types';
import { useLocation } from '../context/LocationContext';
import { useDestinations } from '../queries/destinations/use-destinations';
import { useCafeFilters } from '../queries/cafes/use-cafe-filters';
import { FACILITY_ICONS } from '../utils/facilities';
import { WIZARD_PURPOSES, getPurposeBySlug } from '@shared/constants/purposes';
import { usePurposes } from '../queries/purposes/use-purposes';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 4;

// WIZARD_PURPOSES is now centralized at repo-root `shared/constants/purposes.ts`
// and imported above so web + mobile stay in lockstep with one edit.

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

const PRICE_OPTIONS = [
  { key: '$', label: '$' },
  { key: '$$', label: '$$' },
  { key: '$$$', label: '$$$' },
];

interface WizardScreenProps {
  /** Called after the user finishes the wizard. If not provided, navigates to
   *  CardSwipe (standalone-screen behavior). Pass this when embedding the
   *  wizard inside another screen (e.g. Discover tab). */
  onComplete?: () => void;
  /** Called when the user taps Skip. Defaults to navigating to MainTabs. */
  onSkip?: () => void;
}

export default function WizardScreen({ onComplete, onSkip }: WizardScreenProps = {}) {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { setPreferences, setWizardCompleted } = usePreferences();
  const { latitude: userLat, longitude: userLng } = useLocation();
  const destinationsQuery = useDestinations();
  const filtersQuery = useCafeFilters();
  const filterGroups = filtersQuery.data?.groups ?? [];
  // Mirror web StepPurpose: drive options from server `/purposes` so adding
  // or renaming a purpose server-side reflects in the app without a release.
  // While loading, fall back to the local WIZARD_PURPOSES so users still see
  // a populated grid (matches the mobile "always-something-visible" feel).
  const purposesQuery = usePurposes();
  const wizardPurposes = (purposesQuery.data ?? []).map((p) => {
    const local = getPurposeBySlug(p.slug);
    return {
      slug: p.slug,
      label: p.name,
      emoji: local?.emoji ?? '⭐',
      tagline: p.description ?? local?.tagline ?? '',
    };
  });
  const purposeOptions = wizardPurposes.length > 0 ? wizardPurposes : WIZARD_PURPOSES;
  const [step, setStep] = useState(0);

  const [purpose, setPurpose] = useState<Purpose | undefined>();
  const [locationType, setLocationType] = useState<'current' | 'custom'>('current');
  const [customAddress, setCustomAddress] = useState('');
  const [customLat, setCustomLat] = useState<number | null>(null);
  const [customLng, setCustomLng] = useState<number | null>(null);
  const [radiusVal, setRadiusVal] = useState(1);
  const [radiusModalOpen, setRadiusModalOpen] = useState(false);
  // Amenities = server facility keys (e.g. "wifi"); price = "$" | "$$" | "$$$".
  const [amenities, setAmenities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('');

  // Radius slider bounds (mirrors web RadiusSlider: 0.5 → 10km)
  const RADIUS_MIN_KM = 0.5;
  const RADIUS_MAX_KM = 10;

  const handleSkip = () => {
    setPreferences(null);
    setWizardCompleted(false);
    if (onSkip) {
      onSkip();
      return;
    }
    navigation.replace('MainTabs');
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
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
      priceRange: priceRange || undefined,
    };
    setPreferences(prefs);
    setWizardCompleted(true);
    if (onComplete) {
      onComplete();
      return;
    }
    navigation.replace('CardSwipe');
  };

  const toggleAmenity = (a: string) => {
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

      {/* Steps — only active step rendered to avoid hit-test/layout issues
          with multi-view parallel rendering. */}
      <View style={{ flex: 1 }}>
        {step === 0 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What's your vibe today?</Text>
          <Text style={styles.stepSubtitle}>Choose one that fits your mood</Text>
          <ScrollView
            contentContainerStyle={styles.optionsGrid}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            {purposeOptions.map((p) => (
              <TouchableOpacity
                key={p.slug}
                style={[styles.optionCard, purpose === p.label && styles.optionCardActive]}
                onPress={() => setPurpose(p.label as Purpose)}
              >
                <Text style={styles.optionEmoji}>{p.emoji}</Text>
                <Text
                  style={[styles.optionLabel, purpose === p.label && styles.optionLabelActive]}
                >
                  {p.label}
                </Text>
                {!!p.tagline && (
                  <Text
                    style={[styles.optionTagline, purpose === p.label && styles.optionTaglineActive]}
                    numberOfLines={2}
                  >
                    {p.tagline}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        )}
        {step === 1 && (
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

        )}
        {step === 2 && (
        <View style={styles.stepContainer}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <Text style={styles.stepTitle}>How far are you willing to go?</Text>
            <Text style={styles.stepSubtitle}>Pilih radius pencarian</Text>

            {/* Quick pick — 3 common values + a "More" pill that opens a modal */}
            <View style={styles.radiusRow}>
              {[0.5, 1, 2].map((r) => (
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
              {/* Show current custom value as its own active pill so user
                  doesn't lose track when they pick something via modal */}
              {![0.5, 1, 2].includes(radiusVal) && (
                <View style={[styles.radiusBtn, styles.radiusBtnActive]}>
                  <Text style={[styles.radiusText, styles.radiusTextActive]}>
                    {radiusVal} km
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.radiusMoreBtn}
                onPress={() => setRadiusModalOpen(true)}
              >
                <Text style={styles.radiusMoreBtnText}>⋯</Text>
              </TouchableOpacity>
            </View>

          {/* Live map preview — circle = search radius (mirrors web StepRadius). */}
          <View style={styles.mapPreviewWrap}>
            {(() => {
              const previewLat =
                locationType === 'custom' && customLat !== null
                  ? customLat
                  : userLat;
              const previewLng =
                locationType === 'custom' && customLng !== null
                  ? customLng
                  : userLng;
              if (previewLat == null || previewLng == null) {
                return (
                  <View style={styles.mapPreviewFallback}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.mapPreviewFallbackText}>
                      Menunggu lokasi…
                    </Text>
                  </View>
                );
              }
              // Fixed zoom — frame the LARGEST radius option with breathing
              // room. Smaller radius = smaller circle in the same view, so
              // the user actually sees the circle grow when they bump radius.
              const MAX_RADIUS_KM = RADIUS_MAX_KM;
              const FIT_PADDING = 1.35; // ~35% breathing room
              const delta =
                (MAX_RADIUS_KM * 2 * FIT_PADDING * 1000) / 111320;
              return (
                <>
                  <MapView
                    style={StyleSheet.absoluteFill}
                    // initialRegion (set once) — NOT region. region re-fits the
                    // map every render, which makes the slider feel janky as
                    // it re-snaps the view on every tick.
                    initialRegion={{
                      latitude: previewLat,
                      longitude: previewLng,
                      latitudeDelta: delta,
                      longitudeDelta: delta,
                    }}
                    pointerEvents="none"
                    showsUserLocation={false}
                    showsCompass={false}
                    toolbarEnabled={false}
                    rotateEnabled={false}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                  >
                    <Circle
                      center={{ latitude: previewLat, longitude: previewLng }}
                      radius={radiusVal * 1000}
                      strokeColor="#D48B3A"
                      strokeWidth={2}
                      fillColor="rgba(251, 191, 36, 0.18)"
                    />
                  </MapView>
                  {/* Current-position pin — Google-Maps "you are here" style.
                      Absolute overlay (not Marker) for pixel-perfect center. */}
                  <View pointerEvents="none" style={styles.mapPreviewPinOverlay}>
                    <View style={styles.mapPreviewPinRing} />
                    <View style={styles.mapPreviewPinDot} />
                  </View>
                </>
              );
            })()}
          </View>
          </ScrollView>

          {/* Radius picker modal — manual input + complete km options */}
          <RadiusPickerModal
            visible={radiusModalOpen}
            initial={radiusVal}
            onClose={() => setRadiusModalOpen(false)}
            onApply={(v) => {
              setRadiusVal(v);
              setRadiusModalOpen(false);
            }}
          />
        </View>

        )}
        {step === 3 && (
        /* Step 4: Amenities — mirrors web FilterPanel sidebar variant */
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Anything specific you need?</Text>
          <Text style={styles.stepSubtitle}>
            Pilih fasilitas atau biarkan kosong — kami tunjukkan semua
          </Text>
          <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            showsVerticalScrollIndicator
            style={{ flex: 1 }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            scrollEnabled
          >
            <View style={styles.filterCard}>
              {/* Price section */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>HARGA</Text>
                <View style={styles.filterChipWrap}>
                  {PRICE_OPTIONS.map((p) => {
                    const active = priceRange === p.key;
                    return (
                      <TouchableOpacity
                        key={p.key}
                        onPress={() => setPriceRange(active ? '' : p.key)}
                        style={[
                          styles.filterChip,
                          active && styles.filterChipActive,
                        ]}
                      >
                        {active && (
                          <View style={styles.filterChipCheck}>
                            <Text style={styles.filterChipCheckText}>✓</Text>
                          </View>
                        )}
                        <Text
                          style={[
                            styles.filterChipLabel,
                            active && styles.filterChipLabelActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Server-driven groups */}
              {filtersQuery.isLoading && filterGroups.length === 0 ? (
                <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : filterGroups.length === 0 ? (
                <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                  <Text style={styles.emptyFilterText}>
                    Filter tidak tersedia.
                  </Text>
                </View>
              ) : (
                filterGroups.map((group) => {
                  const selectedInGroup = group.options.filter((o) =>
                    amenities.includes(o.key),
                  ).length;
                  return (
                    <View
                      key={group.key}
                      style={[styles.filterGroup, styles.filterGroupBordered]}
                    >
                      <View style={styles.filterGroupHeaderRow}>
                        <Text style={styles.filterGroupTitle}>
                          {group.label.toUpperCase()}
                        </Text>
                        {selectedInGroup > 0 && (
                          <View style={styles.filterGroupBadge}>
                            <Text style={styles.filterGroupBadgeText}>
                              {selectedInGroup}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.filterChipWrap}>
                        {group.options.map((opt) => {
                          const active = amenities.includes(opt.key);
                          const icon = FACILITY_ICONS[opt.key];
                          return (
                            <TouchableOpacity
                              key={opt.key}
                              onPress={() => toggleAmenity(opt.key)}
                              style={[
                                styles.filterChip,
                                active && styles.filterChipActive,
                              ]}
                            >
                              {active ? (
                                <View style={styles.filterChipCheck}>
                                  <Text style={styles.filterChipCheckText}>
                                    ✓
                                  </Text>
                                </View>
                              ) : icon ? (
                                <Text style={styles.filterChipIcon}>{icon}</Text>
                              ) : null}
                              <Text
                                style={[
                                  styles.filterChipLabel,
                                  active && styles.filterChipLabelActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                              {typeof opt.count === 'number' && opt.count > 0 && (
                                <Text
                                  style={[
                                    styles.filterChipCount,
                                    active && styles.filterChipCountActive,
                                  ]}
                                >
                                  {opt.count}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
          </View>
        </View>
        )}
      </View>

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
  stepContainer: {
    flex: 1,
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
    paddingBottom: spacing.lg,
  },
  optionCard: {
    // Fixed width so all cards align in a 2-col grid regardless of tagline length.
    width: (width - spacing.lg * 2 - spacing.sm) / 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 110,
  },
  optionCardActive: {
    borderColor: colors.accent,
    backgroundColor: '#FDF6EC',
  },
  optionEmoji: { fontSize: 26, marginBottom: 4 },
  optionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  optionLabelActive: { color: colors.accent },
  optionTagline: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  optionTaglineActive: { color: colors.accent },
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
  // Radius pill row + manual input
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  radiusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  radiusBtnActive: {
    borderColor: colors.accent,
    backgroundColor: '#FDF6EC',
  },
  radiusText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  radiusTextActive: { color: colors.accent },
  radiusMoreBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  radiusMoreBtnText: {
    fontSize: 18, fontWeight: '900',
    color: colors.primary,
    lineHeight: 18,
  },
  // Map preview — replaces the old fake radiusVisual circle.
  mapPreviewWrap: {
    width: '100%',
    height: 280,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    position: 'relative',
  },
  mapPreviewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapPreviewFallbackText: { fontSize: 13, color: colors.textSecondary },
  // Overlay-style center pin — guaranteed pixel-centered in mapPreviewWrap
  // (no Marker anchor / emoji glyph offset problems).
  mapPreviewPinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Current-position pin: solid dot + faint outer pulse ring.
  mapPreviewPinDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 3, borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 2,
  },
  mapPreviewPinRing: {
    position: 'absolute',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(212, 139, 58, 0.22)',
    zIndex: 1,
  },
  loaderRow: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  // Filter card (mirror of web FilterPanel sidebar variant)
  filterCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EDE8',
  },
  filterGroup: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filterGroupBordered: {
    borderTopWidth: 1,
    borderTopColor: '#F0EDE8',
  },
  filterGroupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  filterGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A8880',
    letterSpacing: 1.2,
  },
  filterGroupBadge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  filterGroupBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  filterChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DD',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipCheckText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.accent,
  },
  filterChipIcon: { fontSize: 13 },
  filterChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1A',
  },
  filterChipLabelActive: { color: '#FFFFFF' },
  filterChipCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A8880',
    marginLeft: 2,
  },
  filterChipCountActive: { color: 'rgba(255,255,255,0.85)' },
  emptyFilterText: {
    fontSize: 13,
    color: '#8A8880',
    fontStyle: 'italic',
  },
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

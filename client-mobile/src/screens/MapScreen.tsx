import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Dimensions,
  TextInput,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { usePreferences } from '../context/PreferencesContext';
import { useLocation } from '../context/LocationContext';
import { fetchCafes, fetchPromotedCafes } from '../services/api';
import { MOCK_CAFES } from '../data/mockCafes';
import { Cafe } from '../types';
import { parseSearchQuery, ParsedSearch } from '../utils/searchParser';
import { colors, spacing, radius } from '../theme';

const { width, height } = Dimensions.get('window');
const RADIUS_OPTIONS = [0.5, 1, 2];

export default function MapScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { preferences, setPreferences } = usePreferences();
  const { latitude: userLat, longitude: userLng } = useLocation();
  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const [allCafes, setAllCafes] = useState<Cafe[]>([]);
  const [displayCafes, setDisplayCafes] = useState<Cafe[]>([]);
  const [featuredCafes, setFeaturedCafes] = useState<Cafe[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(preferences?.radius || 2);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [parsedSearch, setParsedSearch] = useState<ParsedSearch | null>(null);

  const center = {
    latitude: preferences?.location?.latitude ?? userLat,
    longitude: preferences?.location?.longitude ?? userLng,
  };

  // Bottom sheet snap points: peek (~12%), mid (50%), full (92%)
  const snapPoints = useMemo(() => ['12%', '50%', '92%'], []);

  const loadCafes = useCallback(async (rad: number) => {
    setLoading(true);
    try {
      const cafes = await fetchCafes(center.latitude, center.longitude, rad);
      setAllCafes(cafes.length > 0 ? cafes : MOCK_CAFES);
    } catch {
      setAllCafes(MOCK_CAFES);
    }
    try {
      const featured = await fetchPromotedCafes('featured_promo');
      setFeaturedCafes(featured.length > 0 ? featured : MOCK_CAFES.filter((c) => c.promotionType === 'B'));
    } catch {
      setFeaturedCafes(MOCK_CAFES.filter((c) => c.promotionType === 'B'));
    }
    setLoading(false);
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    loadCafes(radiusKm);
  }, [radiusKm]);

  // Apply filters
  useEffect(() => {
    let result = [...allCafes];
    if (preferences?.purpose) {
      result = result.filter((c) => c.purposes.includes(preferences.purpose!));
    }
    if (preferences?.amenities && preferences.amenities.length > 0) {
      result = result.filter((c) =>
        preferences.amenities!.some((a) => c.facilities.includes(a)),
      );
    }
    if (parsedSearch && parsedSearch.labels.length > 0) {
      if (parsedSearch.purposes.length > 0) {
        result = result.filter((c) =>
          parsedSearch!.purposes.some((p) => c.purposes.includes(p)),
        );
      }
      if (parsedSearch.facilities.length > 0) {
        result = result.filter((c) =>
          parsedSearch!.facilities.some((f) => c.facilities.includes(f)),
        );
      }
    }
    result = result.filter((c) => c.distance <= radiusKm);
    setDisplayCafes(result);
  }, [allCafes, preferences, parsedSearch, radiusKm]);

  const handleSearch = () => {
    Keyboard.dismiss();
    if (!searchQuery.trim()) { clearSearch(); return; }
    setParsedSearch(parseSearchQuery(searchQuery));
    setSearchActive(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setParsedSearch(null);
    setSearchActive(false);
  };

  const activeFilters: string[] = [];
  if (preferences?.purpose) activeFilters.push(preferences.purpose);
  if (preferences?.amenities) preferences.amenities.forEach((a) => activeFilters.push(a));

  const removeFilter = (filter: string) => {
    if (!preferences) return;
    const updated = { ...preferences };
    if (filter === updated.purpose) updated.purpose = undefined;
    else {
      updated.amenities = updated.amenities?.filter((a) => a !== filter);
      if (!updated.amenities?.length) updated.amenities = undefined;
    }
    if (!updated.purpose && !updated.amenities?.length) setPreferences(null);
    else setPreferences(updated);
  };

  const resetFilters = () => {
    setPreferences(null);
    clearSearch();
    setRadiusKm(2);
    loadCafes(2);
  };

  const hasAnyFilter = activeFilters.length > 0 || searchActive || radiusKm !== 2;

  const onMarkerPress = (cafe: Cafe) => {
    setSelectedCafe(cafe);
    // Snap drawer to mid when a pin is tapped
    sheetRef.current?.snapToIndex(1);
  };

  const renderCafeCard = ({ item }: { item: Cafe }) => {
    const isSelected = selectedCafe?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.cafeCard, isSelected && styles.cafeCardSelected]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CafeDetail', { cafe: item })}
      >
        <Image
          source={{ uri: item.photos?.[0] || '' }}
          style={styles.cafeCardPhoto}
        />
        <View style={styles.cafeCardInfo}>
          <View style={styles.cafeCardTopRow}>
            <Text style={styles.cafeCardName} numberOfLines={1}>{item.name}</Text>
            {item.promotionType === 'A' && (
              <View style={styles.newBadge}><Text style={styles.newBadgeText}>New</Text></View>
            )}
            {item.promotionType === 'B' && (
              <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>Featured</Text></View>
            )}
          </View>
          <Text style={styles.cafeCardDist}>{item.distance} km away</Text>
          <View style={styles.cafeCardTags}>
            {(item.purposes ?? []).slice(0, 2).map((p) => (
              <View key={p} style={styles.tag}>
                <Text style={styles.tagText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.cafeCardRight}>
          <Text style={styles.cafeCardFavCount}>❤️ {item.favoritesCount}</Text>
          <Text style={styles.cafeCardArrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search bar — always above map */}
      <View style={[styles.searchContainer, { top: insets.top + 8 }]}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search cafes, e.g. wifi mushola quiet..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchActive && (
            <TouchableOpacity
              onPress={clearSearch}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearIcon}>×</Text>
            </TouchableOpacity>
          )}
        </View>
        {searchActive && parsedSearch && parsedSearch.labels.length > 0 && (
          <View style={styles.parsedRow}>
            {parsedSearch.labels.map((label) => (
              <View key={label} style={styles.parsedChip}>
                <Text style={styles.parsedChipText}>{label} ✓</Text>
              </View>
            ))}
          </View>
        )}
        {searchActive && displayCafes.length === 0 && !loading && (
          <View style={styles.noResultsBanner}>
            <Text style={styles.noResultsText}>No cafes found for your search</Text>
          </View>
        )}
      </View>

      {/* Map — fills full screen behind drawer */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          ...center,
          latitudeDelta: radiusKm * 0.02,
          longitudeDelta: radiusKm * 0.02,
        }}
        region={{
          ...center,
          latitudeDelta: radiusKm * 0.02,
          longitudeDelta: radiusKm * 0.02,
        }}
        showsUserLocation
      >
        <Circle
          center={center}
          radius={radiusKm * 1000}
          strokeColor="rgba(212, 139, 58, 0.4)"
          fillColor="rgba(212, 139, 58, 0.08)"
          strokeWidth={1.5}
        />
        {displayCafes.map((cafe) => (
          <Marker
            key={cafe.id}
            coordinate={{ latitude: cafe.latitude, longitude: cafe.longitude }}
            onPress={() => onMarkerPress(cafe)}
            pinColor={cafe.promotionType === 'A' ? colors.promoPin : colors.primary}
          />
        ))}
      </MapView>

      {/* Bottom Sheet Drawer */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
        enablePanDownToClose={false}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Highlighted card for selected pin */}
          {selectedCafe && (
            <View style={styles.selectedSection}>
              <TouchableOpacity
                style={styles.selectedCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CafeDetail', { cafe: selectedCafe })}
              >
                <Image
                  source={{ uri: selectedCafe.photos?.[0] || '' }}
                  style={styles.selectedPhoto}
                />
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName} numberOfLines={1}>{selectedCafe.name}</Text>
                  <Text style={styles.selectedDist}>{selectedCafe.distance} km away</Text>
                  <View style={styles.selectedTags}>
                    {(selectedCafe.purposes ?? []).slice(0, 2).map((p) => (
                      <View key={p} style={styles.tagAccent}>
                        <Text style={styles.tagAccentText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={styles.selectedArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedCafe(null)} style={styles.dismissPin}>
                <Text style={styles.dismissPinText}>Clear ×</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Featured Today */}
          {featuredCafes.length > 0 && !searchActive && (
            <View style={styles.featuredSection}>
              <Text style={styles.featuredTitle}>Featured Today ✨</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredScroll}
              >
                {featuredCafes.map((cafe) => (
                  <TouchableOpacity
                    key={cafe.id}
                    activeOpacity={0.85}
                    style={styles.featuredCard}
                    onPress={() => navigation.navigate('CafeDetail', { cafe })}
                  >
                    <Image
                      source={{ uri: cafe.promoPhoto || cafe.photos?.[0] || '' }}
                      style={styles.featuredImage}
                    />
                    <View style={styles.featuredInfo}>
                      {cafe.promoTitle ? (
                        <Text style={styles.featuredPromoTitle} numberOfLines={1}>
                          {cafe.promoTitle}
                        </Text>
                      ) : null}
                      {cafe.promoDescription ? (
                        <Text style={styles.featuredPromoDesc} numberOfLines={2}>
                          {cafe.promoDescription}
                        </Text>
                      ) : null}
                      <Text style={styles.featuredCafeName} numberOfLines={1}>
                        {cafe.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Radius + Filter controls */}
          <View style={styles.controlsSection}>
            {/* Radius pills */}
            <View style={styles.radiusRow}>
              <Text style={styles.controlLabel}>Radius</Text>
              <View style={styles.radiusControl}>
                {RADIUS_OPTIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.radiusSeg, radiusKm === r && styles.radiusSegActive]}
                    onPress={() => setRadiusKm(r)}
                  >
                    <Text style={[styles.radiusSegText, radiusKm === r && styles.radiusSegTextActive]}>
                      {r} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Active filter pills */}
            {hasAnyFilter && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                {activeFilters.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={styles.filterPill}
                    onPress={() => removeFilter(f)}
                  >
                    <Text style={styles.filterPillText}>{f}</Text>
                    <Text style={styles.filterPillX}> ×</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                  <Text style={styles.resetText}>Reset All</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

          {/* Cafe list */}
          <View style={styles.listSection}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                {loading ? 'Loading cafes...' : `${displayCafes.length} cafes nearby`}
              </Text>
              {searchActive && (
                <Text style={styles.listSubtitle}>Filtered by search</Text>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
            ) : displayCafes.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No cafes found in this area</Text>
                <TouchableOpacity onPress={resetFilters} style={styles.emptyReset}>
                  <Text style={styles.emptyResetText}>Reset filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              displayCafes.map((cafe) => (
                <React.Fragment key={cafe.id}>
                  {renderCafeCard({ item: cafe })}
                  <View style={styles.cardSep} />
                </React.Fragment>
              ))
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Search bar
  searchContainer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    paddingVertical: spacing.sm + 4,
  },
  clearBtn: { padding: spacing.xs },
  clearIcon: { fontSize: 22, color: colors.textSecondary },
  parsedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.xs,
  },
  parsedChip: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  parsedChipText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  noResultsBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    alignItems: 'center',
    elevation: 2,
  },
  noResultsText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },

  // Bottom sheet
  sheetBg: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
  },
  sheetHandle: {
    backgroundColor: colors.textSecondary + '40',
    width: 40,
  },
  sheetContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },

  // Selected pin card
  selectedSection: {
    marginBottom: spacing.md,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.accent,
    elevation: 3,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  selectedPhoto: { width: 72, height: 72, borderRadius: radius.sm, resizeMode: 'cover' },
  selectedInfo: { flex: 1, marginLeft: spacing.sm },
  selectedName: { fontSize: 15, fontWeight: '700', color: colors.primary },
  selectedDist: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  selectedTags: { flexDirection: 'row', gap: 4, marginTop: 4 },
  tagAccent: {
    backgroundColor: colors.accent + '20',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagAccentText: { fontSize: 11, fontWeight: '600', color: colors.accent },
  selectedArrow: { fontSize: 22, color: colors.accent, marginLeft: spacing.sm },
  dismissPin: { alignSelf: 'flex-end', marginTop: 6 },
  dismissPinText: { fontSize: 12, color: colors.textSecondary },

  // Featured
  featuredSection: { marginBottom: spacing.md },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  featuredScroll: { gap: spacing.sm },
  featuredCard: {
    width: 200,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuredImage: { width: '100%', height: 90, resizeMode: 'cover' },
  featuredInfo: { padding: spacing.sm },
  featuredPromoTitle: { fontSize: 13, fontWeight: '700', color: colors.accent },
  featuredPromoDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  featuredCafeName: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 4 },

  // Controls
  controlsSection: { marginBottom: spacing.sm },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  controlLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, width: 44 },
  radiusControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    padding: 3,
  },
  radiusSeg: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    minWidth: 60,
    alignItems: 'center',
  },
  radiusSegActive: { backgroundColor: colors.primary },
  radiusSegText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  radiusSegTextActive: { color: colors.white },
  filterScroll: {
    gap: spacing.xs,
    alignItems: 'center',
    paddingVertical: 2,
    paddingBottom: spacing.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  filterPillText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  filterPillX: { fontSize: 13, color: colors.textSecondary },
  resetBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  resetText: { fontSize: 13, fontWeight: '600', color: colors.white },

  // Cafe list
  listSection: { flex: 1 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  listTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  listSubtitle: { fontSize: 12, color: colors.accent },
  loadingBox: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyBox: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 15, color: colors.textSecondary },
  emptyReset: { marginTop: spacing.md },
  emptyResetText: { fontSize: 14, color: colors.accent, fontWeight: '600' },
  cardSep: { height: spacing.sm },

  // Cafe list cards
  cafeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cafeCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  cafeCardPhoto: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    resizeMode: 'cover',
    backgroundColor: colors.surface,
  },
  cafeCardInfo: { flex: 1, marginLeft: spacing.sm },
  cafeCardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cafeCardName: { fontSize: 14, fontWeight: '700', color: colors.primary, flex: 1 },
  newBadge: {
    backgroundColor: colors.promoPin,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  featuredBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  featuredBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  cafeCardDist: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cafeCardTags: { flexDirection: 'row', gap: 4, marginTop: 4 },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  cafeCardRight: { alignItems: 'flex-end', marginLeft: spacing.sm, gap: 4 },
  cafeCardFavCount: { fontSize: 12, color: colors.accent, fontWeight: '700' },
  cafeCardArrow: { fontSize: 20, color: colors.textSecondary },
});

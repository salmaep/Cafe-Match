import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Animated,
  InteractionManager,
} from "react-native";
import CafePhoto from "../components/CafePhoto";
import CafeListItem from "../components/cafe/CafeListItem";
import MobileFilterModal from "../components/cafe/MobileFilterModal";
import { usePurposes } from "../queries/purposes/use-purposes";
import SwipeableCard from "../components/SwipeableCard";
import MapView, { Marker, Circle, Region } from "react-native-maps";
import Supercluster from "supercluster";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useQueryClient } from "@tanstack/react-query";
import { usePreferences } from "../context/PreferencesContext";
import { useLocation } from "../context/LocationContext";
import { useShortlist } from "../context/ShortlistContext";
import { checkOutApi, throwEmojiApi } from "../services/api";
import { useSearchCafes } from "../queries/cafes/use-search-cafes";
import { usePromotedCafes } from "../queries/cafes/use-promoted-cafes";
import { useActiveCheckin, checkinKeys } from "../queries/checkins/use-active-checkin";
import { useFriendsMap } from "../queries/friends/use-friends-map";
import { hitsToCafes } from "../queries/cafes/api";
import { Cafe } from "../types";
import { colors, spacing, radius } from "../theme";
import RadiusPickerModal from "../components/cafe/RadiusPickerModal";
import NativeAdCard from "../components/NativeAdCard";
import { interleaveAds } from "../utils/adInterleave";

const { width, height } = Dimensions.get("window");

const CLUSTER_THRESHOLD = 50;
type CafeMarkerItem = { kind: "cafe"; cafe: Cafe };
type ClusterMarkerItem = {
  kind: "cluster";
  id: number;
  count: number;
  lat: number;
  lng: number;
};
type MarkerItem = CafeMarkerItem | ClusterMarkerItem;

/** Format seconds as HH:MM:SS or MM:SS for short durations */
function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export default function MapScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { preferences } = usePreferences();
  const { latitude: userLat, longitude: userLng } = useLocation();
  const { addToShortlist, isInShortlist } = useShortlist();
  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const [radiusModalOpen, setRadiusModalOpen] = useState(false);

  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [radiusKm, setRadiusKm] = useState(preferences?.radius || 2);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);

  // ─── Local filter state — initialized from wizard preferences, freely editable
  // via the filter modal afterward. Mirrors web HomePage filter UX.
  const purposesQuery = usePurposes();
  const purposeList = purposesQuery.data ?? [];
  const initialPurposeId = preferences?.purpose
    ? purposeList.find(
        (p) =>
          p.name === preferences.purpose ||
          p.slug.replace(/-/g, ' ') === preferences.purpose?.toLowerCase(),
      )?.id ?? null
    : null;
  const [filterPurposeId, setFilterPurposeId] = useState<number | null>(initialPurposeId);
  const [filterFacilityKeys, setFilterFacilityKeys] = useState<string[]>(
    preferences?.amenities ?? [],
  );
  const [filterPriceRange, setFilterPriceRange] = useState<string>(
    preferences?.priceRange ?? '',
  );
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Selecting a purpose auto-preselects its required features. User can still
  // toggle individual feature chips off in the modal afterwards.
  const handlePurposeSelect = useCallback(
    (newId: number | null) => {
      setFilterPurposeId(newId);
      if (newId == null) return;
      const purpose = purposeList.find((p) => p.id === newId);
      const features = (purpose?.requirements ?? [])
        .map((r) => r.feature?.name)
        .filter((n): n is string => !!n);
      if (features.length > 0) setFilterFacilityKeys(features);
    },
    [purposeList],
  );

  // ⭐ marker keys — features that came from the active purpose's requirements.
  const autoSelectedFromPurpose = useMemo(() => {
    if (filterPurposeId == null) return new Set<string>();
    const p = purposeList.find((x) => x.id === filterPurposeId);
    return new Set(
      (p?.requirements ?? [])
        .map((r) => r.feature?.name)
        .filter((n): n is string => !!n),
    );
  }, [filterPurposeId, purposeList]);

  const activeFilterCount =
    filterFacilityKeys.length +
    (filterPriceRange ? 1 : 0) +
    (filterPurposeId != null ? 1 : 0);

  // Active check-in: server-driven via TanStack Query (refetch every 60s).
  // See queries/checkins/use-active-checkin.ts.
  const activeCheckinQuery = useActiveCheckin();
  const activeCheckin = activeCheckinQuery.data ?? null;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkinDurationSec, setCheckinDurationSec] = useState(0);
  const qc = useQueryClient();

  // Friends currently checked in (for map overlay) — same pattern.
  const friendsMapQuery = useFriendsMap();
  const friendsOnMap = friendsMapQuery.data ?? [];
  const [emojiTargetFriend, setEmojiTargetFriend] = useState<any | null>(null);

  // Pin visibility toggles
  const [showCafePins, setShowCafePins] = useState(true);
  const [showFriendPins, setShowFriendPins] = useState(true);

  const [manualCenter, setManualCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [pinsReady, setPinsReady] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setPinsReady(true);
    });
    return () => task.cancel();
  }, []);

  // Group friends by cafe (for count badges)
  const friendsByCafe = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const f of friendsOnMap) {
      if (!f.currentCafe?.id) continue;
      const cafeId = f.currentCafe.id;
      if (!map.has(cafeId)) map.set(cafeId, []);
      map.get(cafeId)!.push(f);
    }
    return map;
  }, [friendsOnMap]);

  // AI search popup state
  const [searchPopupVisible, setSearchPopupVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<Cafe[]>([]);
  const [popupCardIndex, setPopupCardIndex] = useState(0);
  const [popupCardSize, setPopupCardSize] = useState({ w: 0, h: 0 });
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const popupSlide = useRef(new Animated.Value(height)).current;

  const showSearchPopup = (results: Cafe[]) => {
    setSearchResults(results);
    setPopupCardIndex(0);
    setSearchPopupVisible(true);
    Animated.spring(popupSlide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 12,
    }).start();
  };

  const dismissSearchPopup = (applyToMap: boolean) => {
    Animated.timing(popupSlide, {
      toValue: height,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setSearchPopupVisible(false));
    if (!applyToMap) {
      clearSearch();
    }
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Bouncing animation for NEW! pin labels
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Helper: detect new cafe promo — checks activePromotionType OR legacy promotionType flag
  const isNewCafePromo = (cafe: Cafe) =>
    cafe.activePromotionType === "new_cafe" || cafe.promotionType === "A";

  const center = manualCenter ?? {
    latitude: preferences?.location?.latitude ?? userLat,
    longitude: preferences?.location?.longitude ?? userLng,
  };

  // Bottom sheet snap points: peek (~12%), mid (50%), full (92%)
  const snapPoints = useMemo(() => ["12%", "50%", "92%"], []);

  // ─── Cafe data via TanStack Query + Meilisearch ─────────────────────────
  // Two parallel queries:
  //   • mapPinsQuery: broad — only geo + radius (and search text if active),
  //     so the map always shows the full overview of nearby cafes.
  //   • listQuery: narrow — adds purpose + facility filters from the wizard,
  //     so the drawer list reflects the user's preferences.
  // Server (Meilisearch) does ALL filtering, sorting, and distance calc.
  const radiusMeters = Math.min(radiusKm * 1000, 50_000_000);
  // Local filter state takes precedence over wizard preferences.
  const purposeId = filterPurposeId ?? undefined;
  const facilities = filterFacilityKeys;
  const priceRange = filterPriceRange;
  const activeQ = searchActive && searchQuery.trim() ? searchQuery.trim() : undefined;

  const mapPinsQuery = useSearchCafes({
    lat: center.latitude,
    lng: center.longitude,
    radius: radiusMeters,
    q: activeQ,
    limit: 2000,
  });

  const listQuery = useSearchCafes({
    lat: center.latitude,
    lng: center.longitude,
    radius: radiusMeters,
    q: activeQ,
    purposeId,
    // Send facilities only if the user picked at least one — empty array
    // would over-restrict (server treats empty list as no-match in some cases).
    ...(facilities.length > 0 ? { facilities } : {}),
    priceRange: (priceRange as any) || undefined,
    limit: 20,
  });

  const promotedQuery = usePromotedCafes("featured_promo");

  // Derived data — pure useMemo, no useState/useEffect bridging.
  // NOTE: intentionally not depending on `center` — backend already provides
  // `distanceMeters` per cafe, and re-mapping on every tap-to-move would
  // create new Cafe object identities and force all 200 markers to re-render.
  const displayCafes: Cafe[] = useMemo(
    () => mapPinsQuery.data?.pages.flatMap((p) => hitsToCafes(p)) ?? [],
    [mapPinsQuery.data],
  );

  const [region, setRegion] = useState<Region>({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.24,
    longitudeDelta: 0.24,
  });

  const [clusterZoom, setClusterZoom] = useState(11);
  useEffect(() => {
    const lonDelta =
      Number.isFinite(region.longitudeDelta) && region.longitudeDelta > 0
        ? region.longitudeDelta
        : 0.24;
    const z = Math.max(
      0,
      Math.min(20, Math.round(Math.log2(360 / Math.max(lonDelta, 1e-6)))),
    );
    setClusterZoom((prev) => (prev === z ? prev : z));
  }, [region.longitudeDelta]);

  const clusterIndex = useMemo(() => {
    if (displayCafes.length <= CLUSTER_THRESHOLD) return null;
    try {
      const idx = new Supercluster({
        radius: 40,
        maxZoom: 18,
        minPoints: 2,
      });
      idx.load(
        displayCafes
          .filter(
            (c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude),
          )
          .map((c) => ({
            type: "Feature" as const,
            properties: { cafeId: String(c.id), cafe: c } as any,
            geometry: {
              type: "Point" as const,
              coordinates: [c.longitude, c.latitude],
            },
          })),
      );
      return idx;
    } catch {
      return null;
    }
  }, [displayCafes]);

  const markerItems: MarkerItem[] = useMemo(() => {
    if (!clusterIndex) {
      return displayCafes.map((cafe) => ({ kind: "cafe", cafe }));
    }
    try {
      const result = clusterIndex.getClusters([-180, -85, 180, 85], clusterZoom);
      if (result.length === 0) {
        return displayCafes.map((cafe) => ({ kind: "cafe", cafe }));
      }
      return result.map<MarkerItem>((point) => {
        const props: any = point.properties;
        if (props.cluster) {
          const [lng, lat] = point.geometry.coordinates;
          return {
            kind: "cluster",
            id: point.id as number,
            count: props.point_count as number,
            lat,
            lng,
          };
        }
        return { kind: "cafe", cafe: props.cafe as Cafe };
      });
    } catch {
      return displayCafes.map((cafe) => ({ kind: "cafe", cafe }));
    }
  }, [clusterIndex, displayCafes, clusterZoom]);

  const handleClusterPress = useCallback(
    (lat: number, lng: number, clusterId: number) => {
      if (!clusterIndex) return;
      const expansionZoom = Math.min(
        clusterIndex.getClusterExpansionZoom(clusterId),
        18,
      );
      const newDelta = 360 / Math.pow(2, expansionZoom);
      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: newDelta,
          longitudeDelta: newDelta,
        },
        300,
      );
    },
    [clusterIndex],
  );

  const listCafes: Cafe[] = useMemo(
    () => listQuery.data?.pages.flatMap((p) => hitsToCafes(p)) ?? [],
    [listQuery.data],
  );

  const listTotal = listQuery.data?.pages[0]?.meta.total ?? listCafes.length;

  const featuredCafes: Cafe[] = promotedQuery.data ?? [];

  const loading =
    mapPinsQuery.isLoading ||
    listQuery.isLoading ||
    promotedQuery.isLoading;

  // Lazy-load handler — memoized so the ScrollView doesn't reattach the
  // listener every render. Triggers when ~one viewport from the bottom so
  // the next page is queued before the user actually hits the end.
  const handleSheetScroll = useCallback(
    ({ nativeEvent }: { nativeEvent: any }) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      const distanceFromBottom =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);
      if (
        distanceFromBottom < 600 &&
        listQuery.hasNextPage &&
        !listQuery.isFetchingNextPage
      ) {
        listQuery.fetchNextPage();
      }
    },
    [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage],
  );

  // Pre-compute the interleaved list once per data change so the render
  // path doesn't re-build the array (and re-mount ad slots) on every render.
  const sheetListItems = useMemo(
    () => interleaveAds(listCafes, { maxAds: 2 }),
    [listCafes],
  );

  const handleThrowEmoji = async (emoji: string) => {
    if (!emojiTargetFriend) return;
    try {
      await throwEmojiApi(emojiTargetFriend.id, emoji);
    } finally {
      setEmojiTargetFriend(null);
    }
  };

  // Real-time ticker: update elapsed seconds every 1s while checked in.
  // Kept as setInterval — needs precise per-second updates for the live clock.
  useEffect(() => {
    if (!activeCheckin?.checkInAt) {
      setCheckinDurationSec(0);
      return;
    }
    const update = () => {
      const ms = Date.now() - new Date(activeCheckin.checkInAt).getTime();
      setCheckinDurationSec(Math.max(0, Math.floor(ms / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeCheckin?.checkInAt]);

  const handleCheckOut = async () => {
    if (!activeCheckin) return;
    setCheckoutLoading(true);
    try {
      await checkOutApi(activeCheckin.id);
      // Optimistic clear; query will also refetch on next interval.
      qc.setQueryData(checkinKeys.active, null);
      setCheckinDurationSec(0);
    } catch {
      // Silent fail — user can retry
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    if (!searchQuery.trim()) {
      clearSearch();
      return;
    }
    setSearchActive(true);
    // Server returns the matched cafes; show top 8 in the popup once available.
    // The popup is opened immediately; the swiper will render once listQuery resolves.
    showSearchPopup([]);
  };

  // When listQuery has results during an active search, populate popup.
  useEffect(() => {
    if (!searchPopupVisible || !searchActive) return;
    setSearchResults(listCafes.slice(0, 8));
  }, [listCafes, searchPopupVisible, searchActive]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchActive(false);
  };

  // Active filter chips list driven by local filter state (modal-managed).
  const activeFilters: { key: string; label: string; remove: () => void }[] = [];
  if (filterPurposeId != null) {
    const p = purposeList.find((x) => x.id === filterPurposeId);
    activeFilters.push({
      key: `purpose-${filterPurposeId}`,
      label: p ? `${p.icon ?? ''} ${p.name}`.trim() : 'Purpose',
      remove: () => setFilterPurposeId(null),
    });
  }
  filterFacilityKeys.forEach((k) => {
    activeFilters.push({
      key: `fac-${k}`,
      label: k.replace(/_/g, ' '),
      remove: () =>
        setFilterFacilityKeys((prev) => prev.filter((x) => x !== k)),
    });
  });
  if (filterPriceRange) {
    activeFilters.push({
      key: 'price',
      label: filterPriceRange,
      remove: () => setFilterPriceRange(''),
    });
  }

  const resetFilters = () => {
    setFilterPurposeId(null);
    setFilterFacilityKeys([]);
    setFilterPriceRange('');
    clearSearch();
    setRadiusKm(2);
  };

  const hasAnyFilter =
    activeFilters.length > 0 || searchActive || radiusKm !== 2;

  const onMarkerPress = (cafe: Cafe) => {
    setSelectedCafe(cafe);
    // Snap drawer to mid when a pin is tapped
    sheetRef.current?.snapToIndex(1);
  };

  const renderCafeCard = ({ item }: { item: Cafe }) => (
    <View
      style={
        selectedCafe?.id === item.id
          ? { borderRadius: 16, borderWidth: 2, borderColor: colors.accent }
          : undefined
      }
    >
      <CafeListItem cafe={item} />
    </View>
  );

  const renderSearchCard = (cafe: Cafe) => (
    <View style={styles.searchSwipeCard}>
      <CafePhoto
        photos={cafe.photos}
        name={cafe.name}
        style={styles.searchSwipeImage}
      />
      <View style={styles.searchSwipeInfo}>
        <View style={styles.searchSwipeTopRow}>
          <Text style={styles.searchSwipeName} numberOfLines={1}>
            {cafe.name}
          </Text>
          {cafe.promotionType === 'A' && (
            <View style={styles.searchSwipeNewBadge}>
              <Text style={styles.searchSwipeNewBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.searchSwipeDist}>
          {cafe.distance} km · {cafe.address}
        </Text>
        <View style={styles.searchSwipeTags}>
          {cafe.purposes.slice(0, 3).map((p) => (
            <View key={p} style={styles.searchSwipeTag}>
              <Text style={styles.searchSwipeTagText}>{p}</Text>
            </View>
          ))}
        </View>
        <View style={styles.searchSwipeFacilities}>
          {cafe.facilities.slice(0, 4).map((f) => (
            <Text key={f} style={styles.searchSwipeFacility}>
              • {f}
            </Text>
          ))}
        </View>
        <View style={styles.searchSwipeHint}>
          <Text style={styles.searchSwipeHintText}>← Skip | Shortlist →</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search bar + filter button — always above map */}
      <View style={[styles.searchContainer, { top: insets.top + 8 }]}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Cari kafe, alamat, atau fasilitas…"
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
          <TouchableOpacity
            onPress={() => setFilterModalOpen(true)}
            style={[
              styles.filterFab,
              activeFilterCount > 0 && styles.filterFabActive,
            ]}
          >
            <Text
              style={[
                styles.filterFabIcon,
                activeFilterCount > 0 && styles.filterFabIconActive,
              ]}
            >
              ⚙︎
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterFabBadge}>
                <Text style={styles.filterFabBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {searchActive && displayCafes.length === 0 && !loading && (
          <View style={styles.noResultsBanner}>
            <Text style={styles.noResultsText}>
              No cafes found for your search
            </Text>
          </View>
        )}
      </View>

      {/* Map — fills full screen behind drawer.
          `region` is intentionally NOT pinned to radius (was causing the map
          to zoom out instead of letting the circle grow). We seed via
          `initialRegion` once with a delta sized for the LARGEST radius
          option so all radius values fit, then let the user pan/zoom freely. */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          ...center,
          // Sized for max radius (10km × 2 × 1.35 padding ÷ 111.32 km/deg)
          latitudeDelta: 0.24,
          longitudeDelta: 0.24,
        }}
        showsUserLocation
        onRegionChangeComplete={setRegion}
        onPress={(e) => {
          const c = e.nativeEvent.coordinate;
          if (!c) return;
          setManualCenter({ latitude: c.latitude, longitude: c.longitude });
        }}
      >
        <Circle
          center={center}
          radius={radiusKm * 1000}
          strokeColor="#D48B3A"
          strokeWidth={2}
          fillColor="rgba(251, 191, 36, 0.18)"
        />
        {/* Search-center pin — current-position dot (matches wizard step).
            `showsUserLocation` blue dot may not equal the search center if a
            custom destination is picked, so this gives the unmistakable origin. */}
        <Marker
          coordinate={center}
          anchor={{ x: 0.5, y: 0.5 }}
          centerOffset={{ x: 0, y: 0 }}
          tracksViewChanges={false}
        >
          <View style={styles.searchCenterPinRing}>
            <View style={styles.searchCenterPinDot} />
          </View>
        </Marker>
        {/* Cafe pins (togglable). Single round amber chip with white ring +
            ☕ glyph centered. */}
        {pinsReady && showCafePins && markerItems.map((item) => {
          if (item.kind === "cluster") {
            return (
              <ClusterMarker
                key={`cluster-${item.id}-${item.count}`}
                lat={item.lat}
                lng={item.lng}
                count={item.count}
                onPress={() => handleClusterPress(item.lat, item.lng, item.id)}
              />
            );
          }
          const cafe = item.cafe;
          const friendCount = friendsByCafe.get(Number(cafe.id))?.length || 0;
          const isPromoted = isNewCafePromo(cafe);
          return (
            <CafeMarker
              key={cafe.id}
              cafe={cafe}
              friendCount={friendCount}
              isPromoted={isPromoted}
              bounceAnim={bounceAnim}
              onPress={() => onMarkerPress(cafe)}
            />
          );
        })}

        {/* Friend avatar pins on the map (togglable, offset slightly so they don't overlap cafe pin) */}
        {showFriendPins && friendsOnMap.map((f) =>
          f.currentCafe ? (
            <Marker
              key={`friend-${f.id}`}
              coordinate={{
                latitude: f.currentCafe.latitude + 0.00015, // slight offset to avoid pin overlap
                longitude: f.currentCafe.longitude + 0.00015,
              }}
              onPress={() => setEmojiTargetFriend(f)}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={10}
            >
              <View style={styles.friendPinContainer}>
                <View style={styles.friendPinAvatar}>
                  <Text style={styles.friendPinAvatarText}>
                    {(f.name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.friendPinTail} />
              </View>
            </Marker>
          ) : null,
        )}
      </MapView>

      {mapPinsQuery.isFetching && (
        <View style={styles.mapLoadingOverlay}>
          <View style={styles.mapLoadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.mapLoadingBoxText}>Memuat…</Text>
          </View>
        </View>
      )}

      {/* Pin layer toggles — match web MapContainer (top-right, two
          separate round buttons stacked vertically, amber when active /
          white when inactive). Always visible (web doesn't auto-hide). */}
      <View
        style={[
          styles.pinToggles,
          { top: insets.top + 80 + (activeCheckin ? 60 : 0), right: spacing.md },
        ]}
      >
        <TouchableOpacity
          style={[styles.pinToggleBtn, showCafePins && styles.pinToggleBtnActive]}
          onPress={() => setShowCafePins((v) => !v)}
        >
          <Text style={[styles.pinToggleEmoji, showCafePins && styles.pinToggleEmojiActive]}>
            ☕
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pinToggleBtn, showFriendPins && styles.pinToggleBtnActive]}
          onPress={() => setShowFriendPins((v) => !v)}
        >
          <Text style={[styles.pinToggleEmoji, showFriendPins && styles.pinToggleEmojiActive]}>
            👥
          </Text>
        </TouchableOpacity>
      </View>

      {/* Toast */}
      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* AI Search Popup */}
      {searchPopupVisible && (
        <Animated.View
          style={[
            styles.searchPopup,
            { transform: [{ translateY: popupSlide }] },
          ]}
        >
          {/* Absolute-positioned close X — always on top, never blocked by swiper */}
          <TouchableOpacity
            style={styles.searchPopupCloseX}
            onPress={() => dismissSearchPopup(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.searchPopupCloseXText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.searchPopupHeader}>
            <View style={{ flex: 1, paddingRight: 44 }}>
              <Text style={styles.searchPopupTitle}>AI Search Results</Text>
              <Text style={styles.searchPopupSub}>
                {searchResults.length} cafes match
              </Text>
            </View>
          </View>

          {/* Swipeable cards — same flow as Discover (CardSwipeScreen):
              gesture-handler + reanimated, NOPE / SHORTLIST overlays. */}
          <View style={styles.searchSwiperContainer}
            onLayout={(e) => setPopupCardSize({
              w: e.nativeEvent.layout.width,
              h: e.nativeEvent.layout.height,
            })}
          >
            {searchResults.length > 0 && popupCardSize.w > 0 ? (
              <>
                {searchResults[popupCardIndex + 1] && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: popupCardSize.w,
                      height: popupCardSize.h,
                    }}
                    pointerEvents="none"
                  >
                    {renderSearchCard(searchResults[popupCardIndex + 1])}
                  </View>
                )}
                {searchResults[popupCardIndex] && (
                  <SwipeableCard
                    key={`search-${popupCardIndex}`}
                    top={0}
                    left={0}
                    width={popupCardSize.w}
                    height={popupCardSize.h}
                    leftLabel="SKIP"
                    rightLabel="SHORTLIST ★"
                    onTap={() =>
                      navigation.navigate('CafeDetail', {
                        cafe: searchResults[popupCardIndex],
                      })
                    }
                    onSwipeComplete={(dir: 'left' | 'right') => {
                      const cafe = searchResults[popupCardIndex];
                      if (dir === 'right' && cafe && !isInShortlist(cafe.id)) {
                        addToShortlist(cafe);
                        triggerToast(`${cafe.name} added to shortlist ✓`);
                      }
                      if (popupCardIndex + 1 >= searchResults.length) {
                        dismissSearchPopup(true);
                      } else {
                        setPopupCardIndex(popupCardIndex + 1);
                      }
                    }}
                  >
                    {renderSearchCard(searchResults[popupCardIndex])}
                  </SwipeableCard>
                )}
              </>
            ) : (
              <View style={styles.searchPopupEmpty}>
                <Text style={styles.searchPopupEmptyText}>
                  No cafes match your search
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Emoji picker modal (shown when user taps a friend's pin) */}
      {emojiTargetFriend && (
        <TouchableOpacity
          style={styles.emojiBackdrop}
          activeOpacity={1}
          onPress={() => setEmojiTargetFriend(null)}
        >
          <View style={styles.emojiPicker}>
            <Text style={styles.emojiPickerTitle}>
              {emojiTargetFriend.name}
            </Text>
            <Text style={styles.emojiPickerSub}>
              📍 {emojiTargetFriend.currentCafe?.name}
            </Text>
            {emojiTargetFriend.checkInAt && (
              <Text style={styles.emojiPickerDuration}>
                ⏱️ Checked in {formatDuration(
                  Math.max(0, Math.floor((Date.now() - new Date(emojiTargetFriend.checkInAt).getTime()) / 1000))
                )} ago
              </Text>
            )}
            <View style={styles.emojiRow}>
              {['👋', '☕', '🔥', '💥', '😂', '❤️', '🎉', '😎'].map((e) => (
                <TouchableOpacity
                  key={e}
                  style={styles.emojiBtn}
                  onPress={() => handleThrowEmoji(e)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.emojiBtnText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.emojiCancelBtn}
              onPress={() => setEmojiTargetFriend(null)}
            >
              <Text style={styles.emojiCancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Active Check-in Card (floating overlay) */}
      {activeCheckin && (
        <View style={[styles.checkinCard, { top: insets.top + 80 }]}>
          <View style={styles.checkinCardLeft}>
            <View style={styles.checkinDot} />
          </View>
          <View style={styles.checkinCardBody}>
            <View style={styles.checkinCardLabelRow}>
              <Text style={styles.checkinCardLabel}>CHECKED IN</Text>
              <Text style={styles.checkinCardDuration}>
                {formatDuration(checkinDurationSec)}
              </Text>
            </View>
            <Text style={styles.checkinCardName} numberOfLines={1}>
              {activeCheckin.cafe?.name || activeCheckin.cafeName || 'Active cafe'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={handleCheckOut}
            disabled={checkoutLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.checkoutBtnText}>
              {checkoutLoading ? '...' : 'Check Out'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
          onScroll={handleSheetScroll}
        >
          {/* Highlighted card for selected pin */}
          {selectedCafe && (
            <View style={styles.selectedSection}>
              <TouchableOpacity
                style={styles.selectedCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate("CafeDetail", { cafe: selectedCafe })
                }
              >
                <CafePhoto
                  photos={selectedCafe.photos}
                  name={selectedCafe.name}
                  style={styles.selectedPhoto}
                />
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {selectedCafe.name}
                  </Text>
                  <Text style={styles.selectedDist}>
                    {selectedCafe.distance} km away
                  </Text>
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
              <TouchableOpacity
                onPress={() => setSelectedCafe(null)}
                style={styles.dismissPin}
              >
                <Text style={styles.dismissPinText}>Clear ×</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Featured Today */}
          {featuredCafes.length > 0 && !searchActive && (
            <View style={styles.featuredSection}>
              <Text style={styles.featuredTitle}>Featured Today ✨</Text>
              <GHScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                directionalLockEnabled
                decelerationRate="fast"
                contentContainerStyle={styles.featuredScroll}
              >
                {featuredCafes.map((cafe) => {
                  const isNewCafe = isNewCafePromo(cafe);
                  const promoImage =
                    cafe.promotionContent?.promoPhoto ||
                    cafe.newCafeContent?.promoPhoto ||
                    cafe.promoPhoto ||
                    cafe.photos?.[0] ||
                    "";
                  const promoTitle =
                    cafe.promotionContent?.title ||
                    (isNewCafe
                      ? cafe.newCafeContent?.promoOffer
                      : cafe.promoTitle) ||
                    null;
                  const description =
                    cafe.promotionContent?.description ||
                    cafe.newCafeContent?.highlightText ||
                    cafe.promoDescription ||
                    "";

                  return (
                    <TouchableOpacity
                      key={cafe.id}
                      activeOpacity={0.85}
                      style={styles.featuredCard}
                      onPress={() =>
                        navigation.navigate("CafeDetail", { cafe })
                      }
                    >
                      <View style={styles.featuredImageWrap}>
                        <Image
                          source={{ uri: promoImage }}
                          style={styles.featuredImage}
                        />
                        {isNewCafe && (
                          <View style={styles.featuredNewBadgeAbs}>
                            <Text style={styles.featuredNewBadgeText}>
                              NEW CAFE
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.featuredInfo}>
                        <Text style={styles.featuredCafeName} numberOfLines={1}>
                          {cafe.name}
                        </Text>
                        {!!promoTitle && (
                          <Text
                            style={styles.featuredPromoTitle}
                            numberOfLines={1}
                          >
                            {promoTitle}
                          </Text>
                        )}
                        {!!description && (
                          <Text
                            style={styles.featuredPromoDesc}
                            numberOfLines={2}
                          >
                            {description}
                          </Text>
                        )}
                        {!!cafe.address && (
                          <Text
                            style={styles.featuredAddress}
                            numberOfLines={1}
                          >
                            📍 {cafe.address}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </GHScrollView>
            </View>
          )}

          {/* Radius + Filter controls */}
          <View style={styles.controlsSection}>
            {/* Radius — 3 quick pills + ⋯ More button → modal (matches wizard) */}
            <View style={styles.radiusRow}>
              <Text style={styles.controlLabel}>Radius</Text>
              <View style={styles.radiusPillsWrap}>
                {[0.5, 1, 2].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.radiusPill,
                      radiusKm === r && styles.radiusPillActive,
                    ]}
                    onPress={() => setRadiusKm(r)}
                  >
                    <Text
                      style={[
                        styles.radiusPillText,
                        radiusKm === r && styles.radiusPillTextActive,
                      ]}
                    >
                      {r} km
                    </Text>
                  </TouchableOpacity>
                ))}
                {![0.5, 1, 2].includes(radiusKm) && (
                  <View style={[styles.radiusPill, styles.radiusPillActive]}>
                    <Text style={[styles.radiusPillText, styles.radiusPillTextActive]}>
                      {radiusKm} km
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
                    key={f.key}
                    style={styles.filterPill}
                    onPress={f.remove}
                  >
                    <Text style={styles.filterPillText}>{f.label}</Text>
                    <Text style={styles.filterPillX}> ×</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={resetFilters}
                >
                  <Text style={styles.resetText}>Reset All</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

          {/* Cafe list — radius-filtered, respects wizard + search */}
          <View style={styles.listSection}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                {loading
                  ? "Loading cafes..."
                  : listTotal === 0
                    ? "No cafes within this radius"
                    : `${listTotal} cafes within ${radiusKm} km`}
              </Text>
              {searchActive && (
                <Text style={styles.listSubtitle}>Filtered by search</Text>
              )}
              {!searchActive && preferences?.purpose && (
                <Text style={styles.listSubtitle}>{preferences.purpose}</Text>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
            ) : listCafes.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No cafes found within {radiusKm} km
                </Text>
                <TouchableOpacity
                  onPress={resetFilters}
                  style={styles.emptyReset}
                >
                  <Text style={styles.emptyResetText}>Reset filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {sheetListItems.map((entry) =>
                  entry.kind === 'ad' ? (
                    <React.Fragment key={entry.key}>
                      <NativeAdCard />
                      <View style={styles.cardSep} />
                    </React.Fragment>
                  ) : (
                    <React.Fragment key={entry.data.id}>
                      {renderCafeCard({ item: entry.data })}
                      <View style={styles.cardSep} />
                    </React.Fragment>
                  ),
                )}
                {listQuery.isFetchingNextPage && (
                  <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                )}
                {!listQuery.hasNextPage && listCafes.length > 0 && (
                  <Text style={styles.listEndHint}>
                    Itu semua dalam {radiusKm} km ✓
                  </Text>
                )}
              </>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      <MobileFilterModal
        visible={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        purposes={purposeList}
        activePurposeId={filterPurposeId}
        onPurposeSelect={handlePurposeSelect}
        facilities={filterFacilityKeys}
        onFacilitiesChange={setFilterFacilityKeys}
        priceRange={filterPriceRange}
        onPriceRangeChange={setFilterPriceRange}
        autoSelectedKeys={autoSelectedFromPurpose}
      />

      <RadiusPickerModal
        visible={radiusModalOpen}
        initial={radiusKm}
        onClose={() => setRadiusModalOpen(false)}
        onApply={(v) => {
          setRadiusKm(v);
          setRadiusModalOpen(false);
        }}
      />
    </View>
  );
}

const ClusterMarker = React.memo(function ClusterMarker({
  lat,
  lng,
  count,
  onPress,
}: {
  lat: number;
  lng: number;
  count: number;
  onPress: () => void;
}) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracking(false), 600);
    return () => clearTimeout(t);
  }, []);
  const size = count < 10 ? 36 : count < 50 ? 44 : count < 200 ? 52 : 60;
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracking}
      onPress={onPress}
    >
      <View
        style={[
          styles.clusterPin,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={styles.clusterPinText}>
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </Text>
      </View>
    </Marker>
  );
});

// Marker wrapper that flips `tracksViewChanges` true → false after first
// layout. Without this, custom-View markers on Android are sometimes captured
// to bitmap BEFORE their child Views finish layout, leaving the pin blank.
// Keeping `tracksViewChanges={true}` permanently kills perf with 200+ pins;
// flipping to false after one tick gives correct pixels + cheap rendering.
const CafeMarker = React.memo(function CafeMarker({
  cafe,
  friendCount,
  isPromoted,
  bounceAnim,
  onPress,
}: {
  cafe: Cafe;
  friendCount: number;
  isPromoted: boolean;
  bounceAnim: Animated.Value;
  onPress: () => void;
}) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracking(false), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <Marker
      coordinate={{ latitude: cafe.latitude, longitude: cafe.longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
      tracksViewChanges={tracking}
      zIndex={isPromoted ? 1000 : undefined}
    >
      <View style={styles.cafeDotContainer}>
        {isPromoted && (
          <Animated.View
            style={[
              styles.cafePinNewBadge,
              { transform: [{ translateY: bounceAnim }] },
            ]}
          >
            <Text style={styles.cafePinNewBadgeText}>NEW!</Text>
          </Animated.View>
        )}
        {friendCount > 0 && (
          <View style={styles.cafePinFriendBadge}>
            <Text style={styles.cafePinFriendBadgeText}>
              {friendCount}👤
            </Text>
          </View>
        )}
        <View
          style={[
            styles.cafeDot,
            isPromoted ? styles.cafeDotPromoted : styles.cafeDotRegular,
          ]}
        >
          <Text style={isPromoted ? styles.cafeDotIconPromoted : styles.cafeDotIcon}>
            ☕
          </Text>
        </View>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Search bar
  searchContainer: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  filterFab: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center", justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    position: "relative",
  },
  filterFabActive: { backgroundColor: colors.accent },
  filterFabIcon: { fontSize: 18, color: colors.primary, fontWeight: "700" },
  filterFabIconActive: { color: colors.white },
  filterFabBadge: {
    position: "absolute",
    top: -3, right: -3,
    minWidth: 18, height: 18, borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  filterFabBadgeText: {
    color: colors.accent, fontSize: 10, fontWeight: "900",
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: spacing.xs,
  },
  parsedChip: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  parsedChipText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  noResultsBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    alignItems: "center",
    elevation: 2,
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  // Bottom sheet
  sheetBg: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
  },
  sheetHandle: {
    backgroundColor: colors.textSecondary + "40",
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
    flexDirection: "row",
    alignItems: "center",
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
  selectedPhoto: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    resizeMode: "cover",
  },
  selectedInfo: { flex: 1, marginLeft: spacing.sm },
  selectedName: { fontSize: 15, fontWeight: "700", color: colors.primary },
  selectedDist: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  selectedTags: { flexDirection: "row", gap: 4, marginTop: 4 },
  tagAccent: {
    backgroundColor: colors.accent + "20",
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagAccentText: { fontSize: 11, fontWeight: "600", color: colors.accent },
  selectedArrow: { fontSize: 22, color: colors.accent, marginLeft: spacing.sm },
  dismissPin: { alignSelf: "flex-end", marginTop: 6 },
  dismissPinText: { fontSize: 12, color: colors.textSecondary },

  // Featured — mirrors web FeaturedCafeCard (w-64 card, h-32 image, p-3 content).
  featuredSection: { marginBottom: spacing.sm },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  featuredScroll: {
    paddingRight: spacing.md,
    gap: 12,
  },
  featuredCard: {
    width: 256,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FDE3B8',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  featuredImageWrap: { position: 'relative' },
  featuredImage: {
    width: '100%',
    height: 128,
    resizeMode: 'cover',
    backgroundColor: '#F0EDE8',
  },
  featuredNewBadgeAbs: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.newCafePin,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  featuredNewBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.4,
  },
  featuredInfo: {
    padding: 12,
    gap: 2,
  },
  featuredCafeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  featuredPromoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  featuredPromoDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  featuredAddress: {
    fontSize: 11,
    color: '#A8A59C',
    marginTop: 4,
  },

  // Controls
  controlsSection: { marginTop: 0, marginBottom: spacing.sm },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    width: 44,
  },
  radiusPillsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  radiusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  radiusPillActive: {
    borderColor: colors.accent,
    backgroundColor: '#FDF6EC',
  },
  radiusPillText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  radiusPillTextActive: { color: colors.accent },
  radiusMoreBtn: {
    width: 34,
    height: 30,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusMoreBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
    lineHeight: 16,
  },
  filterScroll: {
    gap: spacing.xs,
    alignItems: "center",
    paddingVertical: 2,
    paddingBottom: spacing.xs,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  filterPillText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  filterPillX: { fontSize: 13, color: colors.textSecondary },
  resetBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  resetText: { fontSize: 13, fontWeight: "600", color: colors.white },

  // Cafe list
  listSection: { flex: 1 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  listTitle: { fontSize: 14, fontWeight: "700", color: colors.primary },
  listSubtitle: { fontSize: 12, color: colors.accent },
  loadingBox: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyBox: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyText: { fontSize: 15, color: colors.textSecondary },
  emptyReset: { marginTop: spacing.md },
  emptyResetText: { fontSize: 14, color: colors.accent, fontWeight: "600" },
  cardSep: { height: spacing.sm },
  listEndHint: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    paddingVertical: spacing.lg,
    fontStyle: 'italic',
  },

  // Cafe list cards
  cafeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
    elevation: 2,
    shadowColor: "#000",
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
    resizeMode: "cover",
    backgroundColor: colors.surface,
  },
  cafeCardInfo: { flex: 1, marginLeft: spacing.sm },
  cafeCardTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cafeCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    flex: 1,
  },
  newBadge: {
    backgroundColor: colors.promoPin,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newBadgeText: { fontSize: 10, fontWeight: "700", color: colors.white },
  featuredBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  featuredBadgeText: { fontSize: 10, fontWeight: "700", color: colors.white },
  cafeCardDist: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cafeCardTags: { flexDirection: "row", gap: 4, marginTop: 4 },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },
  cafeCardRight: { alignItems: "flex-end", marginLeft: spacing.sm, gap: 4 },
  cafeCardFavCount: { fontSize: 12, color: colors.accent, fontWeight: "700" },
  cafeCardArrow: { fontSize: 20, color: colors.textSecondary },

  // Toast
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    zIndex: 100,
    elevation: 20,
  },
  toastText: { color: colors.white, fontSize: 13, fontWeight: "600" },

  // AI Search Popup
  searchPopup: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.85,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    zIndex: 50,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchPopupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  searchPopupTitle: { fontSize: 18, fontWeight: "800", color: colors.primary },
  searchPopupSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  popupTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.sm,
  },
  popupTag: {
    backgroundColor: colors.accent + "20",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  popupTagText: { fontSize: 12, fontWeight: "600", color: colors.accent },
  searchSwiperContainer: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  swiperContainer: {
    flex: 1,
    left: -17,
    backgroundColor: "transparent",
  },
  swiperCard: {},
  searchSwipeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    height: height * 0.54,
  },
  searchSwipeImage: {
    width: "100%",
    height: "42%",
    resizeMode: "cover",
  },
  searchSwipeInfo: {
    flex: 1,
    padding: spacing.md,
  },
  searchSwipeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  searchSwipeName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
    flex: 1,
  },
  searchSwipeNewBadge: {
    backgroundColor: colors.newCafePin,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  searchSwipeNewBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white,
  },
  searchSwipeDist: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  searchSwipeTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.sm,
  },
  searchSwipeTag: {
    backgroundColor: colors.accent + "18",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  searchSwipeTagText: { fontSize: 12, fontWeight: "600", color: colors.accent },
  searchSwipeFacilities: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.sm,
  },
  searchSwipeFacility: { fontSize: 12, color: colors.textSecondary },
  searchSwipeHint: {
    position: "absolute",
    bottom: spacing.md,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  searchSwipeHintText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  searchPopupEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchPopupEmptyText: { fontSize: 16, color: colors.textSecondary },
  searchPopupCloseX: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 10,
  },
  searchPopupCloseXText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },

  // Active Check-in Card overlay
  checkinCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 4,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    zIndex: 999,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  checkinCardLeft: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },
  checkinCardBody: {
    flex: 1,
  },
  checkinCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkinCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.6,
  },
  checkinCardDuration: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  checkinCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  checkoutBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Friend pin on map
  friendPinContainer: {
    alignItems: 'center',
  },
  friendPinAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: colors.white,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  friendPinAvatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  friendPinTail: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.white,
  },

  // Emoji picker modal (triggered by tapping a friend pin)
  emojiBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  emojiPicker: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    minWidth: 280,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  emojiPickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  emojiPickerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  emojiPickerDuration: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    marginTop: 4,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  emojiBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBtnText: {
    fontSize: 28,
  },
  emojiCancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emojiCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Pin toggle buttons (map overlay top-right).
  // zIndex/elevation kept low so the bottom sheet (cafe list) sits ON TOP
  // when expanded — toggles are a map-only affordance and shouldn't bleed
  // through the main content modal.
  // Web parity: two separate round buttons (44×44), amber when active,
  // white when inactive, stacked vertically. NO explicit zIndex — JSX order
  // alone is what makes BottomSheet (rendered LAST) cover them when the
  // sheet expands over the toggle area.
  pinToggles: {
    position: 'absolute',
    flexDirection: 'column',
    gap: 8,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  mapLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  mapLoadingBoxText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  pinToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  pinToggleBtnActive: {
    backgroundColor: '#D48B3A',
    borderColor: '#D48B3A',
  },
  pinToggleEmojiActive: {
    color: colors.white,
  },

  // Search-center pin (current-position dot + outer pulse ring).
  searchCenterPinRing: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(212, 139, 58, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCenterPinDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 3, borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  pinToggleActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  pinToggleEmoji: {
    fontSize: 18,
  },

  // Friend count badge (appears on cafe pins when friends are checked in there)
  friendCountBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    alignSelf: 'center',
  },
  friendCountText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  cafePinWithFriends: {
    alignItems: 'center',
  },
  cafePinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.white,
    marginTop: 2,
  },
  searchPopupMapBtnLarge: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
    elevation: 3,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  searchPopupMapBtnLargeText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.3,
  },

  // Cafe map pin — SVG teardrop matching web MapContainer.CafePin exactly:
  // outer amber/red teardrop path + inner white circle (cx=14, cy=13, r=7).
  // The ☕ glyph is layered as a plain RN Text over the SVG because
  // react-native-svg's <Text> doesn't render emoji reliably.
  cafeDotContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  cafeDot: {
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cafeDotRegular: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#D97706",
  },
  cafeDotPromoted: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#DC2626",
  },
  cafeDotIcon: {
    fontSize: 11,
    lineHeight: 13,
    textAlign: "center",
  },
  cafeDotIconPromoted: {
    fontSize: 13,
    lineHeight: 15,
    textAlign: "center",
  },
  clusterPin: {
    backgroundColor: "#D97706",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  clusterPinText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  cafePinNewBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  cafePinNewBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  cafePinFriendBadge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  cafePinFriendBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
});

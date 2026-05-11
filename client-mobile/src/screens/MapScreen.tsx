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
} from "react-native";
import CafePhoto from "../components/CafePhoto";
import CafeListItem from "../components/cafe/CafeListItem";
import MobileFilterModal from "../components/cafe/MobileFilterModal";
import { usePurposes } from "../queries/purposes/use-purposes";
import Swiper from "react-native-deck-swiper";
import MapView, { Marker, Circle } from "react-native-maps";
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient, Stop } from "react-native-svg";
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
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const popupSlide = useRef(new Animated.Value(height)).current;
  const popupSwiperRef = useRef<any>(null);

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

  const center = {
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
    limit: 1000,
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
  const displayCafes: Cafe[] = useMemo(
    () =>
      mapPinsQuery.data?.pages.flatMap((p) =>
        hitsToCafes(p, center.latitude, center.longitude),
      ) ?? [],
    [mapPinsQuery.data, center.latitude, center.longitude],
  );

  const listCafes: Cafe[] = useMemo(
    () =>
      listQuery.data?.pages.flatMap((p) =>
        hitsToCafes(p, center.latitude, center.longitude),
      ) ?? [],
    [listQuery.data, center.latitude, center.longitude],
  );

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
        {showCafePins && displayCafes.map((cafe) => {
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

          {/* Swipeable cards */}
          <View style={styles.searchSwiperContainer}>
            {searchResults.length > 0 ? (
              <Swiper
                ref={popupSwiperRef}
                cards={searchResults}
                cardIndex={popupCardIndex}
                onSwipedRight={(i) => {
                  const cafe = searchResults[i];
                  if (!isInShortlist(cafe.id)) {
                    addToShortlist(cafe);
                    triggerToast(`${cafe.name} added to shortlist ✓`);
                  }
                }}
                onSwipedLeft={() => {}}
                onSwipedAll={() => dismissSearchPopup(true)}
                containerStyle={styles.swiperContainer}
                cardStyle={styles.swiperCard}
                backgroundColor="transparent"
                stackSize={3}
                stackSeparation={8}
                overlayLabels={{
                  left: {
                    title: "SKIP",
                    style: {
                      label: {
                        backgroundColor: colors.textSecondary,
                        color: colors.white,
                        fontSize: 20,
                        borderRadius: 8,
                      },
                      wrapper: {
                        flexDirection: "column",
                        alignItems: "flex-end",
                        justifyContent: "flex-start",
                        marginTop: 20,
                        marginLeft: -20,
                      },
                    },
                  },
                  right: {
                    title: "SHORTLIST",
                    style: {
                      label: {
                        backgroundColor: colors.success,
                        color: colors.white,
                        fontSize: 18,
                        borderRadius: 8,
                      },
                      wrapper: {
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "flex-start",
                        marginTop: 20,
                        marginLeft: 20,
                      },
                    },
                  },
                }}
                renderCard={(cafe: Cafe) => (
                  <TouchableOpacity
                    activeOpacity={0.92}
                    style={styles.searchSwipeCard}
                    onPress={() => navigation.navigate("CafeDetail", { cafe })}
                  >
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
                        {cafe.promotionType === "A" && (
                          <View style={styles.searchSwipeNewBadge}>
                            <Text style={styles.searchSwipeNewBadgeText}>
                              NEW
                            </Text>
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
                        <Text style={styles.searchSwipeHintText}>
                          ← Skip | Shortlist →
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
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
          // 16ms ≈ 60fps — without this RN throttles to ~250ms which makes
          // pagination feel laggy and the loading spinner appear too late.
          scrollEventThrottle={16}
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
                  : listCafes.length === 0
                    ? "No cafes within this radius"
                    : `${listCafes.length} cafes within ${radiusKm} km`}
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
        onPurposeSelect={setFilterPurposeId}
        facilities={filterFacilityKeys}
        onFacilitiesChange={setFilterFacilityKeys}
        priceRange={filterPriceRange}
        onPriceRangeChange={setFilterPriceRange}
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
      // Anchor at bottom-center because the SVG teardrop's point is at y=38.
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracking}
      zIndex={isPromoted ? 1000 : undefined}
    >
      <View
        style={[
          styles.cafePinContainer,
          // Slight transparency on regular pins thins out dense clusters.
          // Promoted stay full opacity so the NEW! variant pops.
          !isPromoted && styles.cafePinRegularOpacity,
        ]}
      >
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
          style={
            isPromoted ? styles.cafePinSvgWrapPromoted : styles.cafePinSvgWrap
          }
        >
          <CafePinSvg promoted={isPromoted} />
          {/* ☕ overlay — react-native-svg's <Text> doesn't render emoji
              glyphs reliably across platforms, so we layer a plain RN Text
              positioned over the white circle inside the SVG. */}
          <Text
            style={[
              isPromoted
                ? styles.cafePinIconOverlayPromoted
                : styles.cafePinIconOverlay,
              { color: isPromoted ? '#DC2626' : '#D97706' },
            ]}
          >
            ☕
          </Text>
        </View>
      </View>
    </Marker>
  );
});

// Compact teardrop pin (~64% of original) so dense areas don't read as
// trypophobia clusters. Promoted variant stays slightly larger + brighter to
// remain visually distinct. ViewBox is preserved so path coords stay valid —
// only the rendered width/height shrinks.
const PIN_W = 18;
const PIN_H = 24;
const PROMOTED_PIN_W = 22;
const PROMOTED_PIN_H = 30;

function CafePinSvg({ promoted }: { promoted: boolean }) {
  if (promoted) {
    return (
      <Svg width={PROMOTED_PIN_W} height={PROMOTED_PIN_H} viewBox="0 0 28 38">
        <Defs>
          <LinearGradient id="cmNewGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F87171" />
            <Stop offset="1" stopColor="#DC2626" />
          </LinearGradient>
        </Defs>
        <Path
          d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z"
          fill="url(#cmNewGrad)"
        />
        <SvgCircle cx={14} cy={13} r={7} fill="#FFFFFF" />
      </Svg>
    );
  }
  return (
    <Svg width={PIN_W} height={PIN_H} viewBox="0 0 28 38">
      <Path
        d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z"
        fill="#D97706"
      />
      <SvgCircle cx={14} cy={13} r={7} fill="#FFFFFF" />
    </Svg>
  );
}

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
  cafePinContainer: {
    alignItems: "center",
  },
  // Regular pin (smaller) — soft opacity so dense areas don't read as a
  // visual cluster of dots.
  cafePinRegularOpacity: {
    opacity: 0.92,
  },
  cafePinSvgWrap: {
    width: 18,
    height: 24,
    position: "relative",
  },
  cafePinSvgWrapPromoted: {
    width: 22,
    height: 30,
    position: "relative",
  },
  // Coffee glyph overlay positioned over the white inner circle of the SVG.
  // SVG viewBox is 28×38 with circle at (14, 13, r=7). When the SVG is
  // rendered at 18×24 (scale ≈ 0.643), the circle is at (~9, ~8.4).
  // For a 9pt glyph (line-height 11), top ≈ 4 - 5 = ~3, left ≈ 9 - 4.5 = ~4.5.
  cafePinIconOverlay: {
    position: "absolute",
    top: 2,
    left: 4,
    width: 10,
    height: 10,
    fontSize: 8,
    lineHeight: 10,
    textAlign: "center",
  },
  // Promoted pin renders at 22×30 (scale ≈ 0.786). Circle center ≈ (11, 10.2).
  cafePinIconOverlayPromoted: {
    position: "absolute",
    top: 3,
    left: 5,
    width: 12,
    height: 12,
    fontSize: 10,
    lineHeight: 12,
    textAlign: "center",
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

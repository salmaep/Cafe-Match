import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
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
import Swiper from "react-native-deck-swiper";
import MapView, { Marker, Circle } from "react-native-maps";
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
import { RADIUS_OPTIONS } from "../constant/ui/radius-options";
import { PURPOSE_ID_MAP, FACILITY_KEY_BY_LABEL } from "../constant/purpose";

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
  const { preferences, setPreferences } = usePreferences();
  const { latitude: userLat, longitude: userLng } = useLocation();
  const { addToShortlist, isInShortlist } = useShortlist();
  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [radiusKm, setRadiusKm] = useState(preferences?.radius || 2);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);

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
  const purposeId = preferences?.purpose
    ? PURPOSE_ID_MAP[preferences.purpose]
    : undefined;
  const facilities = useMemo(
    () =>
      (preferences?.amenities ?? [])
        .map((a) => FACILITY_KEY_BY_LABEL[a])
        .filter(Boolean),
    [preferences?.amenities],
  );
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
    limit: 200,
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

  const activeFilters: string[] = [];
  if (preferences?.purpose) activeFilters.push(preferences.purpose);
  if (preferences?.amenities)
    preferences.amenities.forEach((a) => activeFilters.push(a));

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
    // Both queries auto-refetch when their params (preferences/radius) change.
  };

  const hasAnyFilter =
    activeFilters.length > 0 || searchActive || radiusKm !== 2;

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
        onPress={() => navigation.navigate("CafeDetail", { cafe: item })}
      >
        <Image
          source={{ uri: item.photos?.[0] || "" }}
          style={styles.cafeCardPhoto}
        />
        <View style={styles.cafeCardInfo}>
          <View style={styles.cafeCardTopRow}>
            <Text style={styles.cafeCardName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.promotionType === "A" && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            )}
            {item.promotionType === "B" && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
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
        {searchActive && displayCafes.length === 0 && !loading && (
          <View style={styles.noResultsBanner}>
            <Text style={styles.noResultsText}>
              No cafes found for your search
            </Text>
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
        {/* Cafe pins (togglable) */}
        {showCafePins && displayCafes.map((cafe) => {
          const friendCount = friendsByCafe.get(Number(cafe.id))?.length || 0;
          return isNewCafePromo(cafe) ? (
            <Marker
              key={cafe.id}
              coordinate={{ latitude: cafe.latitude, longitude: cafe.longitude }}
              onPress={() => onMarkerPress(cafe)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.newPinContainer}>
                <Animated.View
                  style={[styles.newPinLabel, { transform: [{ translateY: bounceAnim }] }]}
                >
                  <Text style={styles.newPinLabelText}>NEW!</Text>
                </Animated.View>
                <View style={styles.newPinDot} />
                {friendCount > 0 && (
                  <View style={styles.friendCountBadge}>
                    <Text style={styles.friendCountText}>{friendCount}👤</Text>
                  </View>
                )}
              </View>
            </Marker>
          ) : (
            <Marker
              key={cafe.id}
              coordinate={{ latitude: cafe.latitude, longitude: cafe.longitude }}
              onPress={() => onMarkerPress(cafe)}
              anchor={friendCount > 0 ? { x: 0.5, y: 1 } : undefined}
              pinColor={friendCount > 0 ? colors.accent : colors.primary}
            >
              {friendCount > 0 && (
                <View style={styles.cafePinWithFriends}>
                  <View style={styles.friendCountBadge}>
                    <Text style={styles.friendCountText}>{friendCount}👤</Text>
                  </View>
                  <View style={styles.cafePinDot} />
                </View>
              )}
            </Marker>
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

      {/* Pin toggle buttons (top right of map) */}
      <View style={[styles.pinToggles, { top: insets.top + 80 + (activeCheckin ? 60 : 0), right: spacing.md }]}>
        <TouchableOpacity
          style={[styles.pinToggle, showCafePins && styles.pinToggleActive]}
          onPress={() => setShowCafePins((v) => !v)}
        >
          <Text style={styles.pinToggleEmoji}>☕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pinToggle, showFriendPins && styles.pinToggleActive]}
          onPress={() => setShowFriendPins((v) => !v)}
        >
          <Text style={styles.pinToggleEmoji}>👥</Text>
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
                    <Image
                      source={{ uri: cafe.photos?.[0] || "" }}
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
            <Text style={styles.checkinCardLabel}>
              CHECKED IN · {formatDuration(checkinDurationSec)}
            </Text>
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
                <Image
                  source={{ uri: selectedCafe.photos?.[0] || "" }}
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
              <View style={styles.featuredListWrap}>
                <GHScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  directionalLockEnabled
                  decelerationRate="fast"
                  contentContainerStyle={styles.featuredScroll}
                  style={styles.featuredScrollInner}
                >
                  {featuredCafes.map((cafe) => {
                    const isNewCafe = isNewCafePromo(cafe);
                    const promoImage =
                      cafe.promotionContent?.promoPhoto ||
                      cafe.newCafeContent?.promoPhoto ||
                      cafe.promoPhoto ||
                      cafe.photos?.[0] ||
                      "";
                    const title =
                      cafe.promotionContent?.title ||
                      (isNewCafe
                        ? cafe.newCafeContent?.promoOffer ||
                          `${cafe.name} is now open!`
                        : cafe.promoTitle || cafe.name);
                    const description =
                      cafe.promotionContent?.description ||
                      cafe.newCafeContent?.highlightText ||
                      cafe.promoDescription ||
                      "";
                    const validHours = cafe.promotionContent?.validHours;
                    const validDays = cafe.promotionContent?.validDays;

                    return (
                      <TouchableOpacity
                        key={cafe.id}
                        activeOpacity={0.85}
                        style={styles.featuredCard}
                        onPress={() =>
                          navigation.navigate("CafeDetail", { cafe })
                        }
                      >
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
                        <View style={styles.featuredInfo}>
                          <Text
                            style={styles.featuredPromoTitle}
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          {description ? (
                            <Text
                              style={styles.featuredPromoDesc}
                              numberOfLines={2}
                            >
                              {description}
                            </Text>
                          ) : null}
                          {validHours ? (
                            <View style={styles.validHoursChip}>
                              <Text style={styles.validHoursIcon}>🕗</Text>
                              <Text style={styles.validHoursText}>
                                {validHours}
                                {validDays ? ` · ${validDays}` : ""}
                              </Text>
                            </View>
                          ) : null}
                          <Text
                            style={styles.featuredCafeName}
                            numberOfLines={1}
                          >
                            📍 {cafe.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </GHScrollView>
              </View>
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
                    style={[
                      styles.radiusSeg,
                      radiusKm === r && styles.radiusSegActive,
                    ]}
                    onPress={() => setRadiusKm(r)}
                  >
                    <Text
                      style={[
                        styles.radiusSegText,
                        radiusKm === r && styles.radiusSegTextActive,
                      ]}
                    >
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
              listCafes.map((cafe) => (
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
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
  },
  searchBar: {
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

  // Featured
  featuredSection: { marginBottom: 8 },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  featuredListWrap: {
    // Explicit height matching 200px card so nested scroll has fixed bounds
    height: 200,
  },
  featuredScrollInner: {
    flexGrow: 0,
  },
  featuredScroll: {
    paddingRight: spacing.md,
  },
  featuredCard: {
    width: 240,
    height: 200,
    marginRight: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuredImage: { width: '100%', height: 110, resizeMode: 'cover' },
  featuredNewBadgeAbs: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: colors.newCafePin,
    borderRadius: radius.sm,
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
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 0,
    height: 90,
  },
  featuredPromoTitle: { fontSize: 14, fontWeight: '800', color: colors.accent },
  featuredPromoDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  validHoursChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 3,
  },
  validHoursIcon: { fontSize: 10 },
  validHoursText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  featuredCafeName: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
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
  radiusControl: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    padding: 3,
  },
  radiusSeg: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    minWidth: 60,
    alignItems: "center",
  },
  radiusSegActive: { backgroundColor: colors.primary },
  radiusSegText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  radiusSegTextActive: { color: colors.white },
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    zIndex: 30,
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
  checkinCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.6,
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

  // Pin toggle buttons (map overlay top-right)
  pinToggles: {
    position: 'absolute',
    zIndex: 25,
    gap: 8,
  },
  pinToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    opacity: 0.5,
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

  // Animated NEW! map pin
  newPinContainer: {
    alignItems: "center",
  },
  newPinLabel: {
    backgroundColor: colors.newCafePin,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 3,
    elevation: 4,
    shadowColor: colors.newCafePin,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  newPinLabelText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  newPinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.newCafePin,
    borderWidth: 2,
    borderColor: colors.white,
  },
});

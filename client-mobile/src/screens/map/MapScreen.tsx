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
  Animated,
  Dimensions,
  Keyboard,
  ActivityIndicator,
  InteractionManager,
  Alert,
} from "react-native";
import MapView from "react-native-map-clustering";
import { Circle } from "react-native-maps";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { mapText } from "@shared/i18n/keys";

import { usePreferences } from "../../context/PreferencesContext";
import { useLocation } from "../../context/LocationContext";
import { useShortlist } from "../../context/ShortlistContext";
import { usePurposes } from "../../queries/purposes/use-purposes";
import { useSearchCafes } from "../../queries/cafes/use-search-cafes";
import { useAutocomplete } from "../../queries/cafes/use-autocomplete";
import { usePromotedCafes } from "../../queries/cafes/use-promoted-cafes";
import { useSearchHistory } from "../../lib/use-search-history";
import type { AutocompleteHit } from "../../queries/cafes/types";
import {
  useActiveCheckin,
  checkinKeys,
} from "../../queries/checkins/use-active-checkin";
import { useFriendsMap } from "../../queries/friends/use-friends-map";
import {
  hitsToCafes,
  fetchAutocomplete,
  fetchCafeDetail,
} from "../../queries/cafes/api";
import { checkOutApi, throwEmojiApi } from "../../services/api";
import MobileFilterModal from "../../components/cafe/MobileFilterModal";
import RadiusPickerModal from "../../components/cafe/RadiusPickerModal";
import StatusBarScrim from "../../components/StatusBarScrim";
import { Cafe } from "../../types";
import { colors, spacing, radius } from "../../theme";
import { interleaveAds } from "../../utils/adInterleave";
import { isNewCafePromo } from "./utils";

import ClusterMarker from "./components/ClusterMarker";
import CafeMarker from "./components/CafeMarker";
import FriendMarker from "./components/FriendMarker";
import SearchCenterMarker from "./components/SearchCenterMarker";
import MapSearchBar from "./components/MapSearchBar";
import ActiveCheckinCard from "./components/ActiveCheckinCard";
import PinTogglesOverlay from "./components/PinTogglesOverlay";
import SearchPopup from "./components/SearchPopup";
import EmojiPickerModal from "./components/EmojiPickerModal";
import SelectedCafeCard from "./components/SelectedCafeCard";
import FeaturedSection from "./components/FeaturedSection";
import RadiusControls, { ActiveFilter } from "./components/RadiusControls";
import CafeList from "./components/CafeList";

const { height } = Dimensions.get("window");

export default function MapScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreference } = usePreferences();
  const { latitude: userLat, longitude: userLng, isLoading: locationLoading } = useLocation();
  const { addToShortlist, isInShortlist } = useShortlist();
  const mapRef = useRef<any>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const qc = useQueryClient();

  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [radiusKm, setRadiusKm] = useState(preferences?.radius || 2);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [radiusModalOpen, setRadiusModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [showCafePins, setShowCafePins] = useState(true);
  const [showFriendPins, setShowFriendPins] = useState(true);
  const [manualCenter, setManualCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [pinsReady, setPinsReady] = useState(false);
  const [emojiTargetFriend, setEmojiTargetFriend] = useState<any | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkinDurationSec, setCheckinDurationSec] = useState(0);
  const [searchPopupVisible, setSearchPopupVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<Cafe[]>([]);
  const [popupCardIndex, setPopupCardIndex] = useState(0);
  const [popupCardSize, setPopupCardSize] = useState({ w: 0, h: 0 });
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  // Suggested correction shown in the popup when a submitted search returns 0.
  const [didYouMean, setDidYouMean] = useState<string | null>(null);

  const purposesQuery = usePurposes();
  const purposeList = purposesQuery.data ?? [];
  const initialPurposeId = preferences?.purpose
    ? (purposeList.find(
        (p) =>
          p.name === preferences.purpose ||
          p.slug.replace(/-/g, " ") === preferences.purpose?.toLowerCase(),
      )?.id ?? null)
    : null;
  const [filterPurposeId, setFilterPurposeId] = useState<number | null>(
    initialPurposeId,
  );
  const [filterFacilityKeys, setFilterFacilityKeys] = useState<string[]>(
    preferences?.amenities ?? [],
  );
  const [filterPriceRange, setFilterPriceRange] = useState<string>(
    preferences?.priceRange ?? "",
  );

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

  const activeCheckinQuery = useActiveCheckin();
  const activeCheckin = activeCheckinQuery.data ?? null;

  const friendsMapQuery = useFriendsMap();
  const friendsOnMap = friendsMapQuery.data ?? [];

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setPinsReady(true);
    });
    return () => task.cancel();
  }, []);

  const didCenterOnGps = useRef(false);
  useEffect(() => {
    if (locationLoading || didCenterOnGps.current || manualCenter) return;
    if (preferences?.location?.type === 'custom') {
      didCenterOnGps.current = true;
      return;
    }
    if (!mapRef.current) return;
    didCenterOnGps.current = true;
    const delta = Math.max(0.02, (radiusKm * 2.4) / 111);
    mapRef.current.animateToRegion(
      {
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      500,
    );
  }, [locationLoading, userLat, userLng, manualCenter, preferences, radiusKm]);

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

  const popupSlide = useRef(new Animated.Value(height)).current;
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
  }, [bounceAnim]);

  const useLiveGps = preferences?.location?.type !== 'custom';
  const center = manualCenter ?? {
    latitude: useLiveGps ? userLat : (preferences?.location?.latitude ?? userLat),
    longitude: useLiveGps ? userLng : (preferences?.location?.longitude ?? userLng),
  };

  const snapPoints = useMemo(() => ["12%", "50%", "92%"], []);
  const radiusMeters = Math.min(radiusKm * 1000, 50_000_000);
  const purposeId = filterPurposeId ?? undefined;
  const facilities = filterFacilityKeys;
  const activeQ =
    searchActive && searchQuery.trim() ? searchQuery.trim() : undefined;

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
    ...(facilities.length > 0 ? { facilities } : {}),
    priceRange: (filterPriceRange as any) || undefined,
    limit: 20,
  });

  const promotedQuery = usePromotedCafes("featured_promo");

  // Live cafe-name typeahead + persisted recent searches for the search popup.
  const autocomplete = useAutocomplete(searchQuery, {
    lat: center.latitude,
    lng: center.longitude,
  });
  const {
    history,
    push: pushHistory,
    remove: removeHistory,
    clear: clearHistory,
  } = useSearchHistory();

  const displayCafes: Cafe[] = useMemo(
    () => mapPinsQuery.data?.pages.flatMap((p) => hitsToCafes(p)) ?? [],
    [mapPinsQuery.data],
  );

  const listCafes: Cafe[] = useMemo(
    () => listQuery.data?.pages.flatMap((p) => hitsToCafes(p)) ?? [],
    [listQuery.data],
  );

  const listTotal = listQuery.data?.pages[0]?.meta.total ?? listCafes.length;
  const featuredCafes: Cafe[] = promotedQuery.data ?? [];
  const loading =
    mapPinsQuery.isLoading || listQuery.isLoading || promotedQuery.isLoading;

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
    [
      listQuery.hasNextPage,
      listQuery.isFetchingNextPage,
      listQuery.fetchNextPage,
    ],
  );

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
      qc.setQueryData(checkinKeys.active, null);
      setCheckinDurationSec(0);
    } catch {
      // noop
    } finally {
      setCheckoutLoading(false);
    }
  };

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

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchActive(false);
    setDidYouMean(null);
  }, []);

  const dismissSearchPopup = (applyToMap: boolean) => {
    Animated.timing(popupSlide, {
      toValue: height,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setSearchPopupVisible(false));
    if (!applyToMap) clearSearch();
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Submit (keyboard "search" / recent / did-you-mean) → commit the query,
  // record history, and show the Meili results carousel.
  const runSearch = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) {
        clearSearch();
        return;
      }
      Keyboard.dismiss();
      setSearchQuery(q);
      setSearchActive(true);
      setDidYouMean(null);
      pushHistory(q);
      showSearchPopup([]);
    },
    // showSearchPopup/clearSearch are stable enough for this screen's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pushHistory],
  );

  const handleSearch = () => runSearch(searchQuery);

  // Editing the query (typing or focusing) drops out of results mode so the
  // popup shows live suggestions / recents again.
  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    if (searchActive) setSearchActive(false);
    if (didYouMean) setDidYouMean(null);
  };

  const handleSearchFocus = () => {
    setSearchActive(false);
    if (!searchPopupVisible) showSearchPopup([]);
  };

  // CafeDetail expects a full Cafe object (reads cafe.id with no fallback), but
  // an autocomplete hit is a thin projection — fetch the detail first, then nav.
  const openCafe = useCallback(
    async (hit: AutocompleteHit) => {
      dismissSearchPopup(false);
      try {
        const cafe = await fetchCafeDetail(String(hit.id));
        if (cafe) navigation.navigate("CafeDetail", { cafe });
      } catch {
        // ignore — user can tap again to retry
      }
    },
    // dismissSearchPopup/navigation stable for the screen lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigation],
  );

  // Tapping a suggestion outside the active radius offers to widen it first.
  const handlePickSuggestion = (hit: AutocompleteHit) => {
    const dist = hit.distanceMeters;
    if (dist != null && dist > radiusMeters) {
      const newRadiusKm = Math.min(50, Math.ceil((dist + 500) / 1000));
      Alert.alert(
        t(mapText.outOfRadiusTitle),
        t(mapText.outOfRadiusBody, { radius: newRadiusKm }),
        [
          { text: t(mapText.outOfRadiusKeep), onPress: () => openCafe(hit) },
          {
            text: t(mapText.outOfRadiusExpand),
            onPress: () => {
              setRadiusKm(newRadiusKm);
              updatePreference({ radius: newRadiusKm });
              openCafe(hit);
            },
          },
        ],
      );
      return;
    }
    openCafe(hit);
  };

  // Feed the results carousel from the Meili list query while a search is active.
  useEffect(() => {
    if (!searchPopupVisible || !searchActive) return;
    setSearchResults(listCafes.slice(0, 8));
  }, [listCafes, searchPopupVisible, searchActive]);

  // Did-you-mean: when a committed search yields 0 results, fetch the closest
  // cafe name as a suggestion (synonym/typo tolerance lives server-side).
  useEffect(() => {
    if (!searchActive) {
      setDidYouMean(null);
      return;
    }
    const q = searchQuery.trim();
    if (!q || listQuery.isFetching || listCafes.length > 0) {
      if (listCafes.length > 0) setDidYouMean(null);
      return;
    }
    let cancelled = false;
    fetchAutocomplete({ q, limit: 1, lat: center.latitude, lng: center.longitude })
      .then((res) => {
        if (cancelled) return;
        const hit = res.data[0];
        setDidYouMean(
          hit && hit.name.toLowerCase() !== q.toLowerCase() ? hit.name : null,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // center.lat/lng intentionally omitted — only re-run on query/result change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchActive, searchQuery, listCafes, listQuery.isFetching]);

  const activeFilters: ActiveFilter[] = [];
  if (filterPurposeId != null) {
    const p = purposeList.find((x) => x.id === filterPurposeId);
    activeFilters.push({
      key: `purpose-${filterPurposeId}`,
      label: p ? `${p.icon ?? ""} ${p.name}`.trim() : "Tujuan",
      remove: () => setFilterPurposeId(null),
    });
  }
  filterFacilityKeys.forEach((k) => {
    activeFilters.push({
      key: `fac-${k}`,
      label: k.replace(/_/g, " "),
      remove: () =>
        setFilterFacilityKeys((prev) => prev.filter((x) => x !== k)),
    });
  });
  if (filterPriceRange) {
    activeFilters.push({
      key: "price",
      label: filterPriceRange,
      remove: () => setFilterPriceRange(""),
    });
  }

  const resetFilters = () => {
    setFilterPurposeId(null);
    setFilterFacilityKeys([]);
    setFilterPriceRange("");
    clearSearch();
    setRadiusKm(2);
  };

  const hasAnyFilter =
    activeFilters.length > 0 || searchActive || radiusKm !== 2;

  const onMarkerPress = useCallback((cafe: Cafe) => {
    setSelectedCafe(cafe);
    sheetRef.current?.snapToIndex(1);
  }, []);

  const handleSearchSwipe = (dir: "left" | "right") => {
    const cafe = searchResults[popupCardIndex];
    if (dir === "right" && cafe && !isInShortlist(cafe.id)) {
      addToShortlist(cafe);
      triggerToast(`${cafe.name} ditambahin ke shortlist ✓`);
    }
    if (popupCardIndex + 1 >= searchResults.length) {
      dismissSearchPopup(true);
    } else {
      setPopupCardIndex(popupCardIndex + 1);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBarScrim />
      <MapSearchBar
        topInset={insets.top}
        searchQuery={searchQuery}
        searchActive={searchActive}
        onSearchQueryChange={handleQueryChange}
        onSubmit={handleSearch}
        onClear={clearSearch}
        onFocus={handleSearchFocus}
        onOpenFilters={() => setFilterModalOpen(true)}
        activeFilterCount={activeFilterCount}
        showNoResultsBanner={
          searchActive && displayCafes.length === 0 && !loading
        }
      />

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          ...center,
          latitudeDelta: Math.max(0.02, (radiusKm * 2.4) / 111),
          longitudeDelta: Math.max(0.02, (radiusKm * 2.4) / 111),
        }}
        showsUserLocation
        radius={40}
        maxZoom={15}
        minPoints={2}
        nodeSize={128}
        animationEnabled={false}
        renderCluster={(cluster: any) => {
          const { id, geometry, onPress, properties } = cluster;
          const [lng, lat] = geometry.coordinates;
          return (
            <ClusterMarker
              key={`cluster-${id}`}
              lat={lat}
              lng={lng}
              count={properties.point_count}
              onPress={onPress}
            />
          );
        }}
        onPress={(e: any) => {
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
        <SearchCenterMarker
          latitude={center.latitude}
          longitude={center.longitude}
        />
        {pinsReady &&
          showCafePins &&
          displayCafes.map((cafe) => {
            const friendCount = friendsByCafe.get(Number(cafe.id))?.length || 0;
            return (
              <CafeMarker
                key={cafe.id}
                coordinate={{
                  latitude: cafe.latitude,
                  longitude: cafe.longitude,
                }}
                cafe={cafe}
                friendCount={friendCount}
                isPromoted={isNewCafePromo(cafe)}
                bounceAnim={bounceAnim}
                onPress={onMarkerPress}
              />
            );
          })}
        {showFriendPins &&
          friendsOnMap.map((f) => (
            <FriendMarker
              key={`friend-${f.id}`}
              friend={f}
              onPress={() => setEmojiTargetFriend(f)}
            />
          ))}
      </MapView>

      {mapPinsQuery.isFetching && (
        <View style={styles.mapLoadingOverlay}>
          <View style={styles.mapLoadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.mapLoadingBoxText}>{t(mapText.loadingMap)}</Text>
          </View>
        </View>
      )}

      {/* Hidden — pin toggles removed to mirror web b5acbe27. Pins always visible. */}
      {false && (
        <PinTogglesOverlay
          topOffset={insets.top + 80 + (activeCheckin ? 60 : 0)}
          showCafePins={showCafePins}
          showFriendPins={showFriendPins}
          onToggleCafePins={() => setShowCafePins((v) => !v)}
          onToggleFriendPins={() => setShowFriendPins((v) => !v)}
        />
      )}

      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      <SearchPopup
        visible={searchPopupVisible}
        slideAnim={popupSlide}
        results={searchResults}
        isFetching={listQuery.isFetching}
        cardIndex={popupCardIndex}
        cardSize={popupCardSize}
        onCardSizeChange={setPopupCardSize}
        onDismiss={dismissSearchPopup}
        onSwipeComplete={handleSearchSwipe}
        onTapCard={(cafe) => navigation.navigate("CafeDetail", { cafe })}
        query={searchQuery}
        searchActive={searchActive}
        suggestions={autocomplete.suggestions}
        suggestionsLoading={autocomplete.loading}
        history={history}
        didYouMean={didYouMean}
        onPickSuggestion={handlePickSuggestion}
        onPickRecent={runSearch}
        onRemoveRecent={removeHistory}
        onClearRecent={clearHistory}
        onPickDidYouMean={runSearch}
      />

      <EmojiPickerModal
        friend={emojiTargetFriend}
        onDismiss={() => setEmojiTargetFriend(null)}
        onPickEmoji={handleThrowEmoji}
      />

      {/* Hidden — check-in feature disabled. Mirrors web b5acbe27. */}
      {false && activeCheckin && (
        <ActiveCheckinCard
          topInset={insets.top}
          cafeName={
            activeCheckin.cafe?.name ||
            activeCheckin.cafeName ||
            "Cafe aktif"
          }
          durationSec={checkinDurationSec}
          checkoutLoading={checkoutLoading}
          onCheckOut={handleCheckOut}
        />
      )}

      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        // Stop the expanded sheet just below the floating search bar so the
        // list never rises over (and hides) the search input. The search bar
        // sits at insets.top + 8 with ~44px height; reserve a little extra.
        topInset={insets.top + 64}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
        enablePanDownToClose={false}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={handleSheetScroll}
        >
          {selectedCafe && (
            <SelectedCafeCard
              cafe={selectedCafe}
              onPress={() =>
                navigation.navigate("CafeDetail", { cafe: selectedCafe })
              }
              onDismiss={() => setSelectedCafe(null)}
            />
          )}

          {!searchActive && (
            <FeaturedSection
              cafes={featuredCafes}
              onCafePress={(cafe) => navigation.navigate("CafeDetail", { cafe })}
            />
          )}

          <RadiusControls
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            onOpenRadiusModal={() => setRadiusModalOpen(true)}
            activeFilters={activeFilters}
            hasAnyFilter={hasAnyFilter}
            onResetFilters={resetFilters}
          />

          <CafeList
            loading={loading}
            listTotal={listTotal}
            radiusKm={radiusKm}
            searchActive={searchActive}
            preferencePurpose={
              !searchActive && preferences?.purpose ? preferences.purpose : null
            }
            cafes={listCafes}
            items={sheetListItems}
            selectedCafeId={selectedCafe?.id ?? null}
            isFetchingNextPage={listQuery.isFetchingNextPage}
            hasNextPage={!!listQuery.hasNextPage}
            onResetFilters={resetFilters}
          />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  mapLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  mapLoadingBoxText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});

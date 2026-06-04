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
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import MapView from "react-native-map-clustering";
import { Circle } from "react-native-maps";
import BottomSheet from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { mapText } from "@shared/i18n/keys";

import { usePreferences } from "../../context/PreferencesContext";
import { useLocation } from "../../context/LocationContext";
import { usePurposes } from "../../queries/purposes/use-purposes";
import { useSearchCafes } from "../../queries/cafes/use-search-cafes";
import { usePromotedCafes } from "../../queries/cafes/use-promoted-cafes";
import { useFriendsMap } from "../../queries/friends/use-friends-map";
import { hitsToCafesCached } from "../../queries/cafes/api";
import { throwEmojiApi } from "../../services/api";
import MobileFilterModal from "../../components/cafe/MobileFilterModal";
import RadiusPickerModal from "../../components/cafe/RadiusPickerModal";
import { Cafe } from "../../types";
import { colors, spacing, radius } from "../../theme";
import { interleaveAds } from "../../utils/adInterleave";
import { isNewCafePromo } from "./utils";

import ClusterMarker from "./components/ClusterMarker";
import CafeMarker from "./components/CafeMarker";
import FriendMarker from "./components/FriendMarker";
import SearchCenterMarker from "./components/SearchCenterMarker";
import MapSearchBar from "./components/MapSearchBar";
import EmojiPickerModal from "./components/EmojiPickerModal";
import { ActiveFilter } from "./components/RadiusControls";
import MapSheetHeader from "./components/MapSheetHeader";
import CafeList from "./components/CafeList";

export default function MapScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreference } = usePreferences();
  const { latitude: userLat, longitude: userLng, isLoading: locationLoading } =
    useLocation();
  const mapRef = useRef<any>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [radiusKm, setRadiusKm] = useState(preferences?.radius || 2);
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

  const useLiveGps = preferences?.location?.type !== 'custom';
  const prefLat = preferences?.location?.latitude;
  const prefLng = preferences?.location?.longitude;
  // Memoized so `center` keeps a stable identity across re-renders that don't
  // touch location — otherwise the Circle, map region, search queries and
  // distance calcs all see a "new" center every render and redo work.
  const center = useMemo(
    () =>
      manualCenter ?? {
        latitude: useLiveGps ? userLat : (prefLat ?? userLat),
        longitude: useLiveGps ? userLng : (prefLng ?? userLng),
      },
    [manualCenter, useLiveGps, userLat, userLng, prefLat, prefLng],
  );

  const snapPoints = useMemo(() => ["12%", "50%", "92%"], []);
  const radiusMeters = Math.min(radiusKm * 1000, 50_000_000);
  const purposeId = filterPurposeId ?? undefined;
  const facilities = filterFacilityKeys;

  // Text search lives in the dedicated Search flow now — the map browses by
  // location + filters only (no `q`).
  const mapPinsQuery = useSearchCafes({
    lat: center.latitude,
    lng: center.longitude,
    radius: radiusMeters,
    limit: 2000,
  });

  const listQuery = useSearchCafes({
    lat: center.latitude,
    lng: center.longitude,
    radius: radiusMeters,
    purposeId,
    ...(facilities.length > 0 ? { facilities } : {}),
    priceRange: (filterPriceRange as any) || undefined,
    limit: 20,
  });

  const promotedQuery = usePromotedCafes("featured_promo");

  const displayCafes: Cafe[] = useMemo(
    () => mapPinsQuery.data?.pages.flatMap((p) => hitsToCafesCached(p)) ?? [],
    [mapPinsQuery.data],
  );

  const listCafes: Cafe[] = useMemo(
    () => listQuery.data?.pages.flatMap((p) => hitsToCafesCached(p)) ?? [],
    [listQuery.data],
  );

  const listTotal = listQuery.data?.pages[0]?.meta.total ?? listCafes.length;
  const featuredCafes: Cafe[] = promotedQuery.data ?? [];
  const loading =
    mapPinsQuery.isLoading || listQuery.isLoading || promotedQuery.isLoading;

  const sheetListItems = useMemo(
    () => interleaveAds(listCafes, { maxAds: 2 }),
    [listCafes],
  );

  const handleSelectedCafePress = useCallback(
    (cafe: Cafe) => navigation.navigate("CafeDetail", { cafe }),
    [navigation],
  );
  const handleSelectedCafeDismiss = useCallback(
    () => setSelectedCafe(null),
    [],
  );
  const handleFeaturedCafePress = useCallback(
    (cafe: Cafe) => navigation.navigate("CafeDetail", { cafe }),
    [navigation],
  );
  const handleOpenRadiusModal = useCallback(
    () => setRadiusModalOpen(true),
    [],
  );
  const handleListEndReached = useCallback(() => {
    if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
      listQuery.fetchNextPage();
    }
  }, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

  const handleThrowEmoji = async (emoji: string) => {
    if (!emojiTargetFriend) return;
    try {
      await throwEmojiApi(emojiTargetFriend.id, emoji);
    } finally {
      setEmojiTargetFriend(null);
    }
  };

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const arr: ActiveFilter[] = [];
    if (filterPurposeId != null) {
      const p = purposeList.find((x) => x.id === filterPurposeId);
      arr.push({
        key: `purpose-${filterPurposeId}`,
        label: p ? `${p.icon ?? ""} ${p.name}`.trim() : "Tujuan",
        remove: () => setFilterPurposeId(null),
      });
    }
    filterFacilityKeys.forEach((k) => {
      arr.push({
        key: `fac-${k}`,
        label: k.replace(/_/g, " "),
        remove: () =>
          setFilterFacilityKeys((prev) => prev.filter((x) => x !== k)),
      });
    });
    if (filterPriceRange) {
      arr.push({
        key: "price",
        label: filterPriceRange,
        remove: () => setFilterPriceRange(""),
      });
    }
    return arr;
  }, [filterPurposeId, filterFacilityKeys, filterPriceRange, purposeList]);

  const resetFilters = useCallback(() => {
    setFilterPurposeId(null);
    setFilterFacilityKeys([]);
    setFilterPriceRange("");
    setRadiusKm(2);
    updatePreference({
      purpose: undefined,
      amenities: [],
      priceRange: "",
      radius: 2,
    });
  }, [updatePreference]);

  const hasAnyFilter = activeFilters.length > 0 || radiusKm !== 2;

  const onMarkerPress = useCallback((cafe: Cafe) => {
    setSelectedCafe(cafe);
    sheetRef.current?.snapToIndex(1);
  }, []);

  // Memoize the marker element arrays so unrelated re-renders (filter modal,
  // sheet scroll, selected-cafe changes, the friends 30s refetch, …) don't
  // recreate up to ~2000 <CafeMarker> elements and force the clustering engine
  // to re-index every render. Rebuilt only when the underlying data actually
  // changes. The `coordinate` object is created here too, so CafeMarker's
  // React.memo isn't busted by a fresh literal each parent render.
  const cafeMarkers = useMemo(() => {
    if (!pinsReady || !showCafePins) return null;
    return displayCafes.map((cafe) => {
      const friendCount = friendsByCafe.get(Number(cafe.id))?.length || 0;
      return (
        <CafeMarker
          key={cafe.id}
          coordinate={{ latitude: cafe.latitude, longitude: cafe.longitude }}
          cafe={cafe}
          friendCount={friendCount}
          isPromoted={isNewCafePromo(cafe)}
          onPress={onMarkerPress}
        />
      );
    });
  }, [pinsReady, showCafePins, displayCafes, friendsByCafe, onMarkerPress]);

  const friendMarkers = useMemo(() => {
    if (!showFriendPins) return null;
    return friendsOnMap.map((f) => (
      <FriendMarker
        key={`friend-${f.id}`}
        friend={f}
        onPress={() => setEmojiTargetFriend(f)}
      />
    ));
  }, [showFriendPins, friendsOnMap]);

  return (
    <View style={styles.container}>
      <MapSearchBar
        topInset={insets.top}
        onPress={() => navigation.navigate("Search")}
        onOpenFilters={() => setFilterModalOpen(true)}
        activeFilterCount={activeFilterCount}
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
        showsMyLocationButton={false}
        zoomControlEnabled={false}
        toolbarEnabled={false}
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
        {cafeMarkers}
        {friendMarkers}
      </MapView>

      {mapPinsQuery.isFetching && (
        <View style={styles.mapLoadingOverlay}>
          <View style={styles.mapLoadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.mapLoadingBoxText}>{t(mapText.loadingMap)}</Text>
          </View>
        </View>
      )}

      <EmojiPickerModal
        friend={emojiTargetFriend}
        onDismiss={() => setEmojiTargetFriend(null)}
        onPickEmoji={handleThrowEmoji}
      />

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
        <CafeList
          loading={loading}
          listTotal={listTotal}
          radiusKm={radiusKm}
          searchActive={false}
          preferencePurpose={preferences?.purpose ?? null}
          cafes={listCafes}
          items={sheetListItems}
          selectedCafeId={selectedCafe?.id ?? null}
          isFetchingNextPage={listQuery.isFetchingNextPage}
          hasNextPage={!!listQuery.hasNextPage}
          onResetFilters={resetFilters}
          onEndReached={handleListEndReached}
          contentContainerStyle={styles.sheetContent}
          header={
            <MapSheetHeader
              selectedCafe={selectedCafe}
              onSelectedCafePress={handleSelectedCafePress}
              onSelectedCafeDismiss={handleSelectedCafeDismiss}
              featuredCafes={featuredCafes}
              onFeaturedCafePress={handleFeaturedCafePress}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              onOpenRadiusModal={handleOpenRadiusModal}
              activeFilters={activeFilters}
              hasAnyFilter={hasAnyFilter}
              onResetFilters={resetFilters}
              onOpenFilters={() => setFilterModalOpen(true)}
            />
          }
        />
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

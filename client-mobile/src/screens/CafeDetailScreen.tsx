import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Linking,
  ActivityIndicator,
  Modal,
  StatusBar,
  Alert,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useShortlist } from "../context/ShortlistContext";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../context/LocationContext";
import {
  toggleBookmark,
  toggleFavorite,
  trackAnalytics,
  fetchCafeDetail,
  haversineKm,
  fetchReviewSummary,
  fetchLeaderboard,
  checkInApi,
} from "../services/api";
import { Cafe } from "../types";
import { colors, spacing, radius } from "../theme";

const { width, height } = Dimensions.get("window");

const FACILITY_ICONS: Record<string, string> = {
  WiFi: "📶",
  "Power Outlet": "🔌",
  Mushola: "🕌",
  Parking: "🅿️",
  "Kid-Friendly": "👶",
  "Quiet Atmosphere": "🤫",
  "Large Tables": "🪑",
  "Outdoor Area": "🌿",
  "Cozy Seating": "🛋️",
  "Ambient Lighting": "💡",
  "Intimate Seating": "💕",
  "Family Friendly": "👨‍👩‍👧",
  Spacious: "🏛️",
  Whiteboard: "📋",
  "Bookable Space": "📅",
  "Smoking Area": "🚬",
};

const getFacilityIcon = (label: string): string => {
  if (FACILITY_ICONS[label]) return FACILITY_ICONS[label];
  // Heuristic fallbacks for unknown labels based on common words
  const lower = label.toLowerCase();
  if (lower.includes("wifi") || lower.includes("internet")) return "📶";
  if (
    lower.includes("power") ||
    lower.includes("outlet") ||
    lower.includes("charge")
  )
    return "🔌";
  if (lower.includes("park")) return "🅿️";
  if (lower.includes("quiet") || lower.includes("calm")) return "🤫";
  if (lower.includes("outdoor") || lower.includes("garden")) return "🌿";
  if (lower.includes("kid") || lower.includes("family")) return "👶";
  if (lower.includes("table")) return "🪑";
  if (lower.includes("light")) return "💡";
  if (lower.includes("seat") || lower.includes("cozy")) return "🛋️";
  if (lower.includes("smoke") || lower.includes("smoking")) return "🚬";
  if (lower.includes("pray") || lower.includes("mushola")) return "🕌";
  if (lower.includes("book")) return "📅";
  return "✓";
};

// Map review category keys (mood_*, facility_*) → human labels with emoji
const REVIEW_CATEGORY_LABELS: Record<string, string> = {
  overall: "⭐ Rating",
  ambiance: "🎨 Suasana",
  wfc: "💻 WFC",
  food_quality: "🍽️ Makanan",
  service: "🛎️ Pelayanan",
  value_for_money: "💰 Harga",
  kid_friendly: "👶 Ramah Anak",
  mood_me_time: "🧘 Me Time",
  "mood_me-time": "🧘 Me Time",
  mood_date: "💑 Date",
  mood_family: "👨‍👩‍👧 Family",
  mood_family_time: "👨‍👩‍👧 Family",
  mood_group_study: "📚 Group Study",
  "mood_group-work": "📚 Group Study",
  mood_wfc: "💻 WFC",
  facility_wifi: "📶 WiFi",
  facility_power_outlet: "🔌 Power",
  facility_mushola: "🕌 Mushola",
  facility_parking: "🅿️ Parking",
  facility_kid_friendly: "👶 Kid-Friendly",
  facility_quiet_atmosphere: "🤫 Quiet",
  facility_large_tables: "🪑 Large Tables",
  facility_outdoor_area: "🌿 Outdoor",
};
const prettyReviewCategory = (k: string) => {
  if (REVIEW_CATEGORY_LABELS[k]) return REVIEW_CATEGORY_LABELS[k];
  const stripped = k.replace(/^(mood_|facility_)/, "").replace(/[_-]/g, " ");
  return stripped.replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Category classifier for review signals */
const isMoodCategory = (k: string) => k.startsWith("mood_");
const isFacilityCategory = (k: string) => k.startsWith("facility_");
const isStarCategory = (k: string) =>
  !isMoodCategory(k) && !isFacilityCategory(k);

type RouteParams = { CafeDetail: { cafe: Cafe } };

export default function CafeDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, "CafeDetail">>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  // Defensive: route.params or route.params.cafe may be undefined after nav
  // merges (e.g. when returning from WriteReviewScreen with only a timestamp).
  const initialCafe: Cafe =
    ((route.params as any)?.cafe as Cafe) ?? ({ id: '', name: '' } as any);
  const { addToShortlist, removeFromShortlist, isInShortlist } = useShortlist();
  const { user } = useAuth();
  const { latitude: userLat, longitude: userLng } = useLocation();

  // Fix 7: Start with nav param data, then enrich with full backend detail.
  // Defensively fill in any missing arrays so subsequent .map() calls never
  // crash — even if the param object is partial.
  const [cafe, setCafe] = useState<Cafe>(() => ({
    ...(initialCafe || ({} as Cafe)),
    photos: initialCafe?.photos ?? [],
    purposes: initialCafe?.purposes ?? [],
    facilities: initialCafe?.facilities ?? [],
    menu: initialCafe?.menu ?? [],
  } as Cafe));
  const [detailLoading, setDetailLoading] = useState(
    !initialCafe?.menu?.length || !initialCafe?.facilities?.length,
  );
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const inShortlist = isInShortlist(cafe.id);

  // Reviews + Leaderboard
  const [reviewSummary, setReviewSummary] = useState<
    { category: string; avgScore: number; count: number }[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);

  // Merge mood signals from THREE sources into ONE unified list:
  //  - cafe.purposes (scraped name array, e.g. "Family Time") → each counts as +1
  //  - cafe.purposeScores (scraped analysis, slug → 0-100, threshold ≥40) → +1
  //  - reviewSummary mood_* (user review votes) → add real vote count
  // All dedupe by normalized slug. Final count = scraped_signals + user_votes.
  const moodChips = React.useMemo(() => {
    const slugToLabel: Record<string, string> = {
      'me-time': '🧘 Me Time',
      'date': '💑 Date',
      'family': '👨‍👩‍👧 Family',
      'group-work': '📚 Group Study',
      'wfc': '💻 WFC',
    };
    // Map English purpose name → slug (for cafe.purposes array)
    const nameToSlug: Record<string, string> = {
      'Me Time': 'me-time',
      'Date': 'date',
      'Family Time': 'family',
      'Family': 'family',
      'Group Study': 'group-work',
      'Group Work / Study': 'group-work',
      'WFC': 'wfc',
      'Work from Cafe': 'wfc',
    };
    const combined = new Map<string, { label: string; count: number }>();

    const bump = (slug: string, delta: number) => {
      const label = slugToLabel[slug];
      if (!label) return;
      const existing = combined.get(slug);
      if (existing) existing.count += delta;
      else combined.set(slug, { label, count: delta });
    };

    // 1. Scraped purposes (cafe.purposes string array) — each +1
    for (const p of cafe?.purposes ?? []) {
      const slug = nameToSlug[p];
      if (slug) bump(slug, 1);
    }

    // 2. Scraped purposeScores (threshold 40+) — each +1
    const ps = (cafe as any)?.purposeScores || {};
    for (const [slug, score] of Object.entries(ps)) {
      const n = Number(score);
      if (n >= 40) bump(slug, 1);
    }

    // 3. Review votes (mood_*) — add actual vote count
    for (const s of reviewSummary.filter((x) => isMoodCategory(x.category))) {
      const raw = s.category.replace(/^mood_/, '');
      const normSlug =
        raw === 'me_time' ? 'me-time' :
        raw === 'group_study' ? 'group-work' :
        raw === 'family_time' ? 'family' :
        raw;
      bump(normSlug, s.count);
    }

    return Array.from(combined.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((v) => ({ label: v.label, count: v.count }));
  }, [reviewSummary, cafe]);

  // Merge facility signals from multiple sources, dedup by key.
  // Scraped entries count as +1 so count always >= 1 for display.
  const reviewFacilityChips = React.useMemo(() => {
    const facLabel: Record<string, string> = {
      wifi: '📶 WiFi',
      power_outlet: '🔌 Power Outlet',
      mushola: '🕌 Mushola',
      parking: '🅿️ Parking',
      kid_friendly: '👶 Kid-Friendly',
      quiet_atmosphere: '🤫 Quiet',
      large_tables: '🪑 Large Tables',
      outdoor_area: '🌿 Outdoor',
    };
    const combined = new Map<string, { key: string; label: string; count: number }>();
    const bump = (key: string, delta: number) => {
      const label = facLabel[key];
      if (!label) return;
      const existing = combined.get(key);
      if (existing) existing.count += delta;
      else combined.set(key, { key, label, count: delta });
    };

    // 1. Scraped detected facilities — each +1
    const detected: string[] = (cafe as any)?.detectedFacilities || [];
    for (const k of detected) bump(k, 1);

    // 2. Review votes (facility_*)
    for (const s of reviewSummary.filter((x) => isFacilityCategory(x.category))) {
      const key = s.category.replace(/^facility_/, '');
      bump(key, s.count);
    }

    return Array.from(combined.values())
      .sort((a, b) => b.count - a.count)
      .map((v) => ({
        key: v.key,
        label: v.label,
        count: v.count,
        scraped: false,
      }));
  }, [reviewSummary, cafe]);

  // Star-only review summary (excludes mood_/facility_)
  const starSummary = React.useMemo(
    () => reviewSummary.filter((s) => isStarCategory(s.category)),
    [reviewSummary],
  );

  // Fullscreen photo zoom modal
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoomListRef = useRef<FlatList<string>>(null);

  const openZoom = (index: number) => {
    setZoomIndex(index);
    setZoomVisible(true);
  };

  const closeZoom = () => setZoomVisible(false);

  useEffect(() => {
    if (!initialCafe?.id) {
      setDetailLoading(false);
      return;
    }
    // Always fetch full detail to get complete menu, facilities, photos
    fetchCafeDetail(initialCafe.id)
      .then((full) => {
        if (full) {
          // Merge with safe defaults so subsequent .map() calls can't crash
          setCafe({
            ...full,
            photos: full.photos ?? [],
            purposes: full.purposes ?? [],
            facilities: full.facilities ?? [],
            menu: full.menu ?? [],
          } as Cafe);
        }
      })
      .finally(() => setDetailLoading(false));
    trackAnalytics(initialCafe.id, "view");
    // Load reviews summary + leaderboard
    fetchReviewSummary(initialCafe.id)
      .then(setReviewSummary)
      .catch(() => {});
    fetchLeaderboard(initialCafe.id)
      .then((lb) => setLeaderboard(lb.slice(0, 3)))
      .catch(() => {});
  }, [initialCafe?.id]);

  // When WriteReviewScreen navigates back with a new review, refresh the summary
  // optimistically — no full page re-render, no auto-refresh flash.
  useEffect(() => {
    const signal =
      (route.params as any)?.newReviewTimestamp ||
      (route.params as any)?.newReview;
    if (!signal || !initialCafe?.id) return;
    fetchReviewSummary(initialCafe.id)
      .then(setReviewSummary)
      .catch(() => {});
    // Clear the param so it doesn't re-trigger on re-focus
    navigation.setParams({
      newReviewTimestamp: undefined,
      newReview: undefined,
    } as any);
  }, [
    (route.params as any)?.newReviewTimestamp,
    (route.params as any)?.newReview,
  ]);

  const realDistance = haversineKm(
    userLat,
    userLng,
    cafe.latitude,
    cafe.longitude,
  );

  const openMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${cafe.latitude},${cafe.longitude}`;
    Linking.openURL(url);
  };

  const handleFavorite = async () => {
    if (!user) {
      navigation.navigate("AuthModal");
      return;
    }
    try {
      const result = await toggleFavorite(cafe.id);
      setIsFavorited(result);
    } catch {
      setIsFavorited(!isFavorited);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      navigation.navigate("AuthModal");
      return;
    }
    try {
      const result = await toggleBookmark(cafe.id);
      setIsBookmarked(result);
    } catch {
      setIsBookmarked(!isBookmarked);
    }
  };

  const handleShortlist = () => {
    if (inShortlist) {
      removeFromShortlist(cafe.id);
    } else {
      addToShortlist(cafe);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const loc = await (
        await import("expo-location")
      ).getCurrentPositionAsync({ accuracy: 6 }); // BestForNavigation

      // Client-side 300m guard so the user gets immediate feedback
      // (the server enforces the same limit as the source of truth).
      const distMeters =
        haversineKm(loc.coords.latitude, loc.coords.longitude, cafe.latitude, cafe.longitude) * 1000;
      if (distMeters > 300) {
        Alert.alert(
          "Terlalu jauh untuk check-in",
          `Kamu berjarak ${Math.round(distMeters)}m dari ${cafe.name}. Maksimal 300m.`,
        );
        setCheckingIn(false);
        return;
      }

      const result: any = await checkInApi(
        Number(cafe.id),
        loc.coords.latitude,
        loc.coords.longitude,
      );
      const togetherWith: { id: number; name: string }[] =
        result?.togetherWith || [];
      if (togetherWith.length > 0) {
        const names = togetherWith.map((f) => f.name).join(", ");
        Alert.alert(
          "💥 BARENGAN!",
          `Kamu lagi di ${cafe.name} bareng ${names}! Seru nih!`,
          [{ text: "Siap!", style: "default" }],
        );
      } else {
        Alert.alert(
          "Check-in berhasil! ☕",
          `Kamu sekarang ada di ${cafe.name}`,
        );
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Gagal check-in";
      Alert.alert("Oops", typeof msg === "string" ? msg : msg[0]);
    }
    setCheckingIn(false);
  };

  const formatPrice = (price: number) => "Rp " + price.toLocaleString("id-ID");

  return (
    <View style={styles.container}>
      {detailLoading && (
        <View style={styles.detailLoadingBar}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            data={cafe.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentPhoto(idx);
            }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => openZoom(index)}
              >
                <Image source={{ uri: item }} style={styles.photo} />
              </TouchableOpacity>
            )}
          />
          <View style={styles.photoDots}>
            {(cafe.photos ?? []).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.photoDot,
                  i === currentPhoto && styles.photoDotActive,
                ]}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {currentPhoto + 1} / {(cafe.photos ?? []).length}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.cafeName}>{cafe.name}</Text>
          <Text style={styles.distance}>
            {realDistance} km from your location
          </Text>

          {cafe.description ? (
            <Text style={styles.description}>{cafe.description}</Text>
          ) : null}

          <TouchableOpacity style={styles.addressRow} onPress={openMaps}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={styles.addressText}>{cafe.address}</Text>
            <Text style={styles.openMaps}>Open in Maps →</Text>
          </TouchableOpacity>

          {/* Mood chips from review aggregation — shown under address */}
          {moodChips.length > 0 && (
            <View style={styles.moodRow}>
              <Text style={styles.moodRowLabel}>
                Atmosphere according to visitors
              </Text>
              <View style={styles.tagsRow}>
                {moodChips.map((m) => (
                  <View key={m.label} style={styles.moodChip}>
                    <Text style={styles.moodChipText}>{m.label}</Text>
                    {m.count > 0 && (
                      <Text style={styles.moodChipCount}>· {m.count}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
          {/* Legacy cafe.purposes row removed — now merged into moodChips above */}

          <Text style={styles.sectionTitle}>Facilities</Text>
          <View style={styles.facilitiesRow}>
            {(cafe.facilities ?? []).map((f) => (
              <View key={`cafe-${f}`} style={styles.facilityChip}>
                <Text style={styles.facilityIcon}>{getFacilityIcon(f)}</Text>
                <Text style={styles.facilityLabel}>{f}</Text>
              </View>
            ))}
            {cafe.wifiAvailable && cafe.wifiSpeedMbps ? (
              <View style={styles.facilityChip}>
                <Text style={styles.facilityIcon}>⚡</Text>
                <Text style={styles.facilityLabel}>
                  {cafe.wifiSpeedMbps} Mbps
                </Text>
              </View>
            ) : null}
            {/* Review-contributed facilities (not already shown in cafe.facilities) */}
            {reviewFacilityChips
              .filter((fc) => {
                const existing = (cafe.facilities ?? []).map((f: any) =>
                  typeof f === "string"
                    ? f.toLowerCase().replace(/\s/g, "_")
                    : "",
                );
                return !existing.some(
                  (e) => e.includes(fc.key) || fc.key.includes(e),
                );
              })
              .map((fc) => (
                <View
                  key={`rev-${fc.key}`}
                  style={[styles.facilityChip, styles.facilityChipFromReview]}
                >
                  <Text style={styles.facilityIcon}>
                    {getFacilityIcon(fc.label)}
                  </Text>
                  <Text style={styles.facilityLabel}>
                    {fc.label.replace(/^[^\s]+\s/, "")}
                  </Text>
                  {fc.count > 0 && (
                    <Text style={styles.facilityBadge}>· {fc.count}</Text>
                  )}
                </View>
              ))}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{cafe.favoritesCount}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{cafe.bookmarksCount}</Text>
              <Text style={styles.statLabel}>Bookmarks</Text>
            </View>
            {cafe.matchScore ? (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={[styles.statNumber, { color: colors.accent }]}>
                    {cafe.matchScore}%
                  </Text>
                  <Text style={styles.statLabel}>Match</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Reviews Summary */}
          {starSummary.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Reviews</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("Reviews", {
                      cafeId: cafe.id,
                      cafeName: cafe.name,
                    })
                  }
                >
                  <Text style={styles.seeAll}>Lihat semua →</Text>
                </TouchableOpacity>
              </View>
              {starSummary.slice(0, 4).map((s) => (
                <View key={s.category} style={styles.reviewBarRow}>
                  <Text style={styles.reviewBarLabel} numberOfLines={1}>
                    {prettyReviewCategory(s.category)}
                  </Text>
                  <View style={styles.reviewBarBg}>
                    <View
                      style={[
                        styles.reviewBarFill,
                        { width: `${(s.avgScore / 5) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.reviewBarScore}>
                    {s.avgScore.toFixed(1)}
                  </Text>
                </View>
              ))}
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={() =>
                  navigation.navigate("WriteReview", {
                    cafeId: cafe.id,
                    cafeName: cafe.name,
                  })
                }
              >
                <Text style={styles.writeReviewText}>+ Tulis Review</Text>
              </TouchableOpacity>
            </>
          )}
          {starSummary.length === 0 && (
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() =>
                navigation.navigate("WriteReview", {
                  cafeId: cafe.id,
                  cafeName: cafe.name,
                })
              }
            >
              <Text style={styles.writeReviewText}>
                Jadi yang pertama review!
              </Text>
            </TouchableOpacity>
          )}

          {/* Leaderboard Top 3 */}
          {leaderboard.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Leaderboard</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("Leaderboard", {
                      cafeId: cafe.id,
                      cafeName: cafe.name,
                    })
                  }
                >
                  <Text style={styles.seeAll}>Selengkapnya →</Text>
                </TouchableOpacity>
              </View>
              {leaderboard.map((e) => (
                <View key={e.userId} style={styles.lbRow}>
                  <Text style={styles.lbRank}>
                    {e.rank === 1 ? "👑" : e.rank === 2 ? "🥈" : "🥉"}
                  </Text>
                  <Text style={styles.lbName} numberOfLines={1}>
                    {e.name}
                  </Text>
                  {e.badge && <Text style={styles.lbBadge}>{e.badge}</Text>}
                  <Text style={styles.lbCount}>{e.checkinCount}x</Text>
                </View>
              ))}
            </>
          )}

          {(cafe.menu?.length ?? 0) > 0 && (
            <>
              <Text style={styles.sectionTitle}>Menu</Text>
              {(cafe.menu ?? []).map((category) => (
                <View key={category.category} style={styles.menuCategory}>
                  <Text style={styles.menuCategoryTitle}>
                    {category.category}
                  </Text>
                  {(category.items ?? []).map((item) => (
                    <View key={item.name} style={styles.menuItem}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.menuItemPrice}>
                        {formatPrice(item.price)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Fullscreen photo zoom modal */}
      <Modal
        visible={zoomVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closeZoom}
        statusBarTranslucent
      >
        <StatusBar hidden />
        <View style={styles.zoomContainer}>
          <FlatList
            ref={zoomListRef}
            data={cafe.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => "zoom-" + i}
            initialScrollIndex={zoomIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setZoomIndex(idx);
            }}
            renderItem={({ item }) => (
              <ScrollView
                style={{ width, height }}
                contentContainerStyle={styles.zoomScrollContent}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                pinchGestureEnabled
                centerContent
              >
                <Image
                  source={{ uri: item }}
                  style={styles.zoomImage}
                  resizeMode="contain"
                />
              </ScrollView>
            )}
          />
          <TouchableOpacity
            style={styles.zoomCloseBtn}
            onPress={closeZoom}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.zoomCloseText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.zoomCounter}>
            <Text style={styles.zoomCounterText}>
              {zoomIndex + 1} / {cafe.photos.length}
            </Text>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleFavorite}>
          <Text style={styles.actionIcon}>{isFavorited ? "❤️" : "🤍"}</Text>
          <Text style={styles.actionLabel}>Favorite</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark}>
          <Text style={styles.actionIcon}>{isBookmarked ? "🔖" : "📑"}</Text>
          <Text style={styles.actionLabel}>Bookmark</Text>
        </TouchableOpacity>
        {user && (
          <TouchableOpacity
            style={styles.checkinBtn}
            onPress={handleCheckIn}
            disabled={checkingIn}
          >
            <Text style={styles.checkinBtnText}>{checkingIn ? "..." : "📍"}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.shortlistBtn,
            inShortlist && styles.shortlistBtnActive,
          ]}
          onPress={handleShortlist}
        >
          <Text style={styles.shortlistBtnText}>
            {inShortlist ? "Added ✓" : "Add to Shortlist"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  detailLoadingBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    backgroundColor: colors.background,
    paddingVertical: 6,
    alignItems: "center",
  },
  carouselContainer: { position: "relative" },
  photo: { width, height: 280, resizeMode: "cover" },
  photoDots: {
    position: "absolute",
    bottom: spacing.md,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  photoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  photoDotActive: { backgroundColor: colors.white, width: 20 },
  backBtn: {
    position: "absolute",
    top: 48,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: { fontSize: 20, color: colors.white },
  photoCounter: {
    position: "absolute",
    top: 48,
    right: spacing.md,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
  },
  photoCounterText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },

  // Zoom modal
  zoomContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  zoomScrollContent: {
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomImage: {
    width,
    height: height * 0.85,
  },
  zoomCloseBtn: {
    position: "absolute",
    top: 48,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  zoomCloseText: { color: colors.white, fontSize: 22, fontWeight: "700" },
  zoomCounter: {
    position: "absolute",
    top: 52,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  zoomCounterText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  content: { padding: spacing.lg },
  cafeName: { fontSize: 24, fontWeight: "700", color: colors.primary },
  distance: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexWrap: "wrap",
  },
  addressIcon: { fontSize: 16, marginRight: spacing.xs },
  addressText: { fontSize: 14, color: colors.primary, flex: 1 },
  openMaps: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "600",
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  purposeTag: {
    backgroundColor: "#FDF6EC",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  purposeTagText: { fontSize: 13, fontWeight: "600", color: colors.accent },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  facilitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  facilityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  facilityChipFromReview: {
    backgroundColor: colors.accent + "15",
    borderWidth: 1,
    borderColor: colors.accent + "40",
  },
  facilityBadge: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: "700",
    marginLeft: 4,
  },
  facilityIcon: { fontSize: 14, marginRight: spacing.xs },
  facilityLabel: { fontSize: 13, color: colors.primary, fontWeight: "500" },

  // Mood chips from review aggregation (under address)
  moodRow: {
    marginTop: spacing.md,
  },
  moodRowLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF6EC",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  moodChipText: { fontSize: 13, fontWeight: "700", color: colors.accent },
  moodChipCount: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: "600",
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  stat: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "700", color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.textSecondary + "30",
  },
  menuCategory: { marginBottom: spacing.md },
  menuCategoryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  menuItemName: { fontSize: 15, color: colors.primary },
  menuItemPrice: { fontSize: 15, color: colors.accent, fontWeight: "600" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface,
    gap: spacing.sm,
  },
  actionBtn: { alignItems: "center", paddingHorizontal: spacing.sm },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  shortlistBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
  },
  shortlistBtnActive: { backgroundColor: colors.accent },
  shortlistBtnText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  checkinBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  checkinBtnText: { fontSize: 20 },

  // Reviews + Leaderboard sections
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  seeAll: { fontSize: 13, color: colors.accent, fontWeight: "600" },
  reviewBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs + 2,
  },
  reviewBarLabel: {
    width: 120,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  reviewBarBg: {
    flex: 1,
    height: 7,
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: "hidden",
  },
  reviewBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  reviewBarScore: {
    width: 28,
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "right",
  },
  writeReviewBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  writeReviewText: { color: colors.accent, fontWeight: "700", fontSize: 14 },

  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  lbRank: { fontSize: 18, marginRight: spacing.sm },
  lbName: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.primary },
  lbBadge: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: "700",
    marginRight: spacing.sm,
  },
  lbCount: { fontSize: 14, fontWeight: "800", color: colors.primary },
});

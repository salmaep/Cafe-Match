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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShortlist } from "../context/ShortlistContext";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../context/LocationContext";
import {
  toggleBookmark,
  toggleFavorite,
  trackAnalytics,
  haversineKm,
  checkInApi,
} from "../services/api";
import { logEvent } from "../utils/analytics";
import { useCafeDetail } from "../queries/cafes/use-cafe-detail";
import VoteSection from "../components/cafe/VoteSection";
import { useReviewSummary } from "../queries/reviews/use-review-summary";
import { useLeaderboard } from "../queries/checkins/use-leaderboard";
import { useQueryClient } from "@tanstack/react-query";
import { reviewKeys } from "../queries/reviews/keys";
import { Cafe } from "../types";
import { colors, spacing, radius } from "../theme";
import { buildFacilityChips } from "../utils/facilities";
import { formatRating } from "../utils/rating";
import { formatHoursTable } from "../utils/openingHours";
import {
  prettyReviewCategory,
  isMoodCategory,
  isFacilityCategory,
  isStarCategory,
} from "../constant/ui/review-categories";

const { width, height } = Dimensions.get("window");

// Hero carousel sizing — leave a sliver of the next photo peeking on the
// right so the user knows it's swipeable. Card = screen minus left padding
// minus next-photo peek; gap is just a hair so cards don't touch.
const HERO_SIDE_PAD = 0;
const HERO_PEEK = 24;
const HERO_GAP = 6;
const HERO_CARD_W = width - HERO_SIDE_PAD - HERO_PEEK;

// ─── Hero photo mosaic (Airbnb-style, mirrors web HeroMosaic) ──────────────
// Layout:
//   1 photo  → single full-bleed
//   2 photos → side-by-side
//   3 photos → 1 large left + 2 stacked right
//   4 photos → 1 large left + 3 stacked right
//   5+ photos → 1 large left + 2x2 grid right
// "Show all N photos" button overlays bottom-right when count > 1.
function PhotoHeroMosaic({
  photos,
  cafeName,
  onOpen,
}: {
  photos: string[];
  cafeName: string;
  onOpen: (i: number) => void;
}) {
  const HEIGHT = 280;
  const GAP = 4;

  const Tile = ({ uri, index, style }: { uri: string; index: number; style?: any }) => (
    <TouchableOpacity
      style={[heroStyles.tile, style]}
      activeOpacity={0.9}
      onPress={() => onOpen(index)}
    >
      <Image
        source={{ uri }}
        style={heroStyles.tileImg}
        accessibilityLabel={cafeName}
      />
    </TouchableOpacity>
  );

  const ShowAllBtn = () =>
    photos.length > 1 ? (
      <TouchableOpacity
        style={heroStyles.showAllBtn}
        activeOpacity={0.85}
        onPress={() => onOpen(0)}
      >
        <Text style={heroStyles.showAllBtnText}>
          ▦  Show all {photos.length} photos
        </Text>
      </TouchableOpacity>
    ) : null;

  if (photos.length === 0) {
    return (
      <View style={[heroStyles.wrap, { height: HEIGHT, backgroundColor: '#F0EDE8' }]} />
    );
  }

  if (photos.length === 1) {
    return (
      <View style={[heroStyles.wrap, { height: HEIGHT }]}>
        <Tile uri={photos[0]} index={0} style={{ flex: 1 }} />
      </View>
    );
  }

  if (photos.length === 2) {
    return (
      <View style={[heroStyles.wrap, heroStyles.row, { height: HEIGHT, gap: GAP }]}>
        <Tile uri={photos[0]} index={0} style={{ flex: 1 }} />
        <Tile uri={photos[1]} index={1} style={{ flex: 1 }} />
        <ShowAllBtn />
      </View>
    );
  }

  if (photos.length === 3) {
    return (
      <View style={[heroStyles.wrap, heroStyles.row, { height: HEIGHT, gap: GAP }]}>
        <Tile uri={photos[0]} index={0} style={{ flex: 1 }} />
        <View style={{ flex: 1, gap: GAP }}>
          <Tile uri={photos[1]} index={1} style={{ flex: 1 }} />
          <Tile uri={photos[2]} index={2} style={{ flex: 1 }} />
        </View>
        <ShowAllBtn />
      </View>
    );
  }

  if (photos.length === 4) {
    return (
      <View style={[heroStyles.wrap, heroStyles.row, { height: HEIGHT, gap: GAP }]}>
        <Tile uri={photos[0]} index={0} style={{ flex: 1 }} />
        <View style={{ flex: 1, gap: GAP }}>
          <Tile uri={photos[1]} index={1} style={{ flex: 1 }} />
          <Tile uri={photos[2]} index={2} style={{ flex: 1 }} />
          <Tile uri={photos[3]} index={3} style={{ flex: 1 }} />
        </View>
        <ShowAllBtn />
      </View>
    );
  }

  // 5+ → Airbnb 1 large + 2×2
  return (
    <View style={[heroStyles.wrap, heroStyles.row, { height: HEIGHT, gap: GAP }]}>
      <Tile uri={photos[0]} index={0} style={{ flex: 1 }} />
      <View style={{ flex: 1, gap: GAP }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
          <Tile uri={photos[1]} index={1} style={{ flex: 1 }} />
          <Tile uri={photos[2]} index={2} style={{ flex: 1 }} />
        </View>
        <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
          <Tile uri={photos[3]} index={3} style={{ flex: 1 }} />
          <Tile uri={photos[4]} index={4} style={{ flex: 1 }} />
        </View>
      </View>
      <ShowAllBtn />
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
  },
  tile: {
    backgroundColor: '#F0EDE8',
    overflow: 'hidden',
  },
  tileImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  showAllBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  showAllBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1C1A',
  },
});

type RouteParams = { CafeDetail: { cafe: Cafe } };

export default function CafeDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, "CafeDetail">>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
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
  const cafeDetailQuery = useCafeDetail(initialCafe?.id);
  const reviewSummaryQuery = useReviewSummary(initialCafe?.id);
  const leaderboardQuery = useLeaderboard(initialCafe?.id);
  const qc = useQueryClient();

  // Cafe = full detail from server when available, otherwise fall back to nav param.
  // Always normalize arrays so downstream .map() never crashes.
  const cafe: Cafe = React.useMemo(() => {
    const base = cafeDetailQuery.data ?? initialCafe ?? ({} as Cafe);
    return {
      ...(base as Cafe),
      photos: base?.photos ?? [],
      purposes: base?.purposes ?? [],
      facilities: base?.facilities ?? [],
      menu: base?.menu ?? [],
    } as Cafe;
  }, [cafeDetailQuery.data, initialCafe]);

  const detailLoading =
    cafeDetailQuery.isLoading &&
    (!initialCafe?.menu?.length || !initialCafe?.facilities?.length);

  const reviewSummary = reviewSummaryQuery.data ?? [];
  const leaderboard = (leaderboardQuery.data ?? []).slice(0, 5);
  const leaderboardLoading = leaderboardQuery.isLoading;

  const [isFavorited, setIsFavorited] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const inShortlist = isInShortlist(cafe.id);

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

  // Single facility chip list — same logic as web (buildFacilityChips reads
  // cafe.facilitiesRich + bool columns + dedupes). Mirrors the cafe list cards.
  const facilityChips = React.useMemo(() => buildFacilityChips(cafe), [cafe]);

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

  // Track view event once per cafe id
  useEffect(() => {
    if (!initialCafe?.id) return;
    trackAnalytics(initialCafe.id, "view");
    logEvent("cafe_view", { cafe_id: initialCafe.id, cafe_name: initialCafe.name });
  }, [initialCafe?.id, initialCafe?.name]);

  // When WriteReviewScreen navigates back with a new review, invalidate the
  // summary cache so it refetches with the latest count.
  useEffect(() => {
    const signal =
      (route.params as any)?.newReviewTimestamp ||
      (route.params as any)?.newReview;
    if (!signal || !initialCafe?.id) return;
    qc.invalidateQueries({ queryKey: reviewKeys.summary(initialCafe.id) });
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
    const query = encodeURIComponent(
      `${cafe.name} ${cafe.address ?? ""}`.trim(),
    );
    let url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    if (cafe.googlePlaceId) {
      url += `&query_place_id=${encodeURIComponent(cafe.googlePlaceId)}`;
    }
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
        {/* Hero photo carousel — single photo at a time, with the next
            photo peeking from the right edge so user knows to swipe. */}
        <View style={styles.carouselContainer}>
          <FlatList
            data={cafe.photos}
            horizontal
            // snapToInterval lets each card "snap" while still leaving a
            // peek of the next photo on the right (pagingEnabled snaps to
            // full screen width with no peek).
            snapToInterval={HERO_CARD_W + HERO_GAP}
            decelerationRate="fast"
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={{ paddingHorizontal: HERO_SIDE_PAD }}
            ItemSeparatorComponent={() => <View style={{ width: HERO_GAP }} />}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(
                e.nativeEvent.contentOffset.x / (HERO_CARD_W + HERO_GAP),
              );
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
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={[styles.photoCounter, { top: insets.top + 18 }]}>
            <Text style={styles.photoCounterText}>
              {currentPhoto + 1} / {(cafe.photos ?? []).length}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.cafeName}>{cafe.name}</Text>

          {/* Rating + price + distance row (mirrors web detail header) */}
          <View style={styles.ratingRow}>
            {formatRating(cafe.googleRating) && (
              <>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingNum}>
                  {formatRating(cafe.googleRating)}
                </Text>
                {cafe.totalGoogleReviews != null && (
                  <Text style={styles.ratingMeta}>
                    ({cafe.totalGoogleReviews.toLocaleString()})
                  </Text>
                )}
                <Text style={styles.ratingDot}>·</Text>
              </>
            )}
            {!!cafe.priceRange && (
              <>
                <Text style={styles.ratingMeta}>{cafe.priceRange}</Text>
                <Text style={styles.ratingDot}>·</Text>
              </>
            )}
            <Text style={styles.ratingMeta}>
              {realDistance} km from your location
            </Text>
          </View>

          {cafe.description ? (
            <Text style={styles.description}>{cafe.description}</Text>
          ) : null}

          <TouchableOpacity style={styles.addressRow} onPress={openMaps}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={styles.addressText}>{cafe.address}</Text>
            <Text style={styles.openMaps}>Open in Maps →</Text>
          </TouchableOpacity>

          {/* Phone — clickable tel: link */}
          {!!cafe.phone && (
            <TouchableOpacity
              style={styles.phoneRow}
              onPress={() => Linking.openURL(`tel:${cafe.phone}`)}
            >
              <Text style={styles.phoneIcon}>📞</Text>
              <Text style={styles.phoneText}>{cafe.phone}</Text>
              <Text style={styles.phoneCta}>Telepon →</Text>
            </TouchableOpacity>
          )}

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

          {/* Jam Buka — opening hours table, today highlighted */}
          {cafe.openingHours && Object.keys(cafe.openingHours).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Jam Buka</Text>
              <View style={styles.hoursCard}>
                {(() => {
                  const todayIdx = new Date().getDay();
                  const todayKey = (
                    ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
                  )[todayIdx];
                  const labels: Record<string, string> = {
                    Sen: 'mon', Sel: 'tue', Rab: 'wed', Kam: 'thu',
                    Jum: 'fri', Sab: 'sat', Min: 'sun',
                  };
                  return formatHoursTable(cafe.openingHours, 'id').map((row, i) => {
                    const isToday = labels[row.day] === todayKey;
                    const closed = row.hours === 'Tutup';
                    return (
                      <View
                        key={row.day}
                        style={[
                          styles.hoursRow,
                          i > 0 && styles.hoursRowDivider,
                          isToday && styles.hoursRowToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.hoursDay,
                            isToday && styles.hoursDayToday,
                          ]}
                        >
                          {row.day}
                          {isToday ? '  (Hari ini)' : ''}
                        </Text>
                        <Text
                          style={[
                            styles.hoursValue,
                            closed && styles.hoursValueClosed,
                          ]}
                        >
                          {row.hours}
                        </Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Facilities</Text>
          {facilityChips.length > 0 ? (
            <View style={styles.facilitiesRow}>
              {facilityChips.map((f) => (
                <View key={f.key} style={styles.facilityChip}>
                  <Text style={styles.facilityIcon}>{f.icon}</Text>
                  <Text style={styles.facilityLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noFacilities}>No facilities listed</Text>
          )}

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

          {/* Vote section (cafe is best for…) */}
          <VoteSection cafeId={Number(cafe.id)} />

          {/* Top check-in leaderboard — mirrors web CafeLeaderboard:
              loading skeleton, empty CTA, top 5 with rank emoji badge,
              checkin count + total time, score in pts. */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Top check-in</Text>
            {leaderboard.length > 0 && (
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
            )}
          </View>

          {leaderboardLoading ? (
            <View>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.lbSkeleton} />
              ))}
            </View>
          ) : leaderboard.length === 0 ? (
            <View style={styles.lbEmpty}>
              <Text style={styles.lbEmptyEmoji}>🏆</Text>
              <Text style={styles.lbEmptyTitle}>Belum ada yang check-in</Text>
              <Text style={styles.lbEmptyHint}>
                Jadi yang pertama, tunjukkan namamu di leaderboard!
              </Text>
            </View>
          ) : (
            <View style={styles.lbCard}>
              {leaderboard.map((e, idx) => {
                const rankBgStyle =
                  e.rank === 1
                    ? styles.lbRankGold
                    : e.rank === 2
                      ? styles.lbRankSilver
                      : e.rank === 3
                        ? styles.lbRankBronze
                        : styles.lbRankPlain;
                const rankLabel =
                  e.rank === 1
                    ? "👑"
                    : e.rank === 2
                      ? "🥈"
                      : e.rank === 3
                        ? "🥉"
                        : String(e.rank);
                const totalMin =
                  typeof e.totalDuration === "number" && e.totalDuration > 0
                    ? e.totalDuration
                    : null;
                const durationText =
                  totalMin != null
                    ? totalMin >= 60
                      ? `${Math.floor(totalMin / 60)}j ${totalMin % 60}m`
                      : `${totalMin}m`
                    : null;
                return (
                  <View
                    key={`${e.userId}-${e.rank}`}
                    style={[
                      styles.lbItem,
                      idx > 0 && styles.lbItemDivider,
                      e.rank <= 3 && styles.lbItemTop3,
                    ]}
                  >
                    <View style={[styles.lbRankBadge, rankBgStyle]}>
                      <Text
                        style={
                          e.rank <= 3 ? styles.lbRankBadgeEmoji : styles.lbRankBadgeNum
                        }
                      >
                        {rankLabel}
                      </Text>
                    </View>

                    <View style={styles.lbInfo}>
                      <View style={styles.lbNameRow}>
                        <Text style={styles.lbItemName} numberOfLines={1}>
                          {e.name}
                        </Text>
                        {!!e.badge && (
                          <View style={styles.lbItemBadge}>
                            <Text style={styles.lbItemBadgeText} numberOfLines={1}>
                              {e.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.lbMetaRow}>
                        <Text style={styles.lbMeta}>
                          {e.checkinCount}× check-in
                        </Text>
                        {durationText && (
                          <>
                            <Text style={styles.lbMetaDot}>·</Text>
                            <Text style={styles.lbMeta}>{durationText}</Text>
                          </>
                        )}
                      </View>
                    </View>

                    <View style={styles.lbScore}>
                      <Text style={styles.lbScoreNum}>{e.score}</Text>
                      <Text style={styles.lbScoreLabel}>PTS</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Photos — clean 3-column grid (square tiles, rounded, subtle
              shadow). Cap visible at 9 with a "+N more" overlay; tap any
              tile to open the fullscreen zoom modal at that index. */}
          {(cafe.photos?.length ?? 0) > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Photos</Text>
                {(cafe.photos?.length ?? 0) > 9 && (
                  <TouchableOpacity onPress={() => openZoom(0)}>
                    <Text style={styles.seeAll}>
                      Lihat semua ({cafe.photos!.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.photoGrid}>
                {(cafe.photos ?? []).slice(0, 9).map((photoUri, i) => {
                  const isLastVisible = i === 8;
                  const overflow = (cafe.photos?.length ?? 0) - 9;
                  return (
                    <TouchableOpacity
                      key={`${photoUri}-${i}`}
                      style={styles.photoGridItem}
                      activeOpacity={0.85}
                      onPress={() => openZoom(i)}
                    >
                      <Image
                        source={{ uri: photoUri }}
                        style={styles.photoGridImage}
                      />
                      {isLastVisible && overflow > 0 && (
                        <View style={styles.photoGridOverflow}>
                          <Text style={styles.photoGridOverflowText}>
                            +{overflow}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {(cafe.menu?.length ?? 0) > 0 && (
            <>
              <Text style={styles.sectionTitle}>Menu</Text>
              <View style={styles.menuCard}>
                {(cafe.menu ?? []).map((category, ci) => (
                  <View
                    key={category.category}
                    style={[
                      styles.menuCategory,
                      ci > 0 && styles.menuCategorySpaced,
                    ]}
                  >
                    <Text style={styles.menuCategoryTitle}>
                      {category.category}
                    </Text>
                    {(category.items ?? []).map((item, ii) => (
                      <View
                        key={`${category.category}-${item.name}-${ii}`}
                        style={[
                          styles.menuItem,
                          ii === (category.items ?? []).length - 1 &&
                            styles.menuItemLast,
                        ]}
                      >
                        <View style={styles.menuItemBody}>
                          <Text style={styles.menuItemName}>{item.name}</Text>
                          {!!item.description && (
                            <Text
                              style={styles.menuItemDesc}
                              numberOfLines={2}
                            >
                              {item.description}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.menuItemPrice}>
                          {formatPrice(item.price)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
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
                maximumZoomScale={4}
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

          {/* Subtle gradient strip at top so the back button + counter always
              have contrast no matter what the photo behind them looks like. */}
          <View pointerEvents="none" style={styles.zoomTopScrim} />

          <TouchableOpacity
            style={[styles.zoomCloseBtn, { top: insets.top + 12 }]}
            onPress={closeZoom}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
          >
            <Text style={styles.zoomCloseText}>‹</Text>
          </TouchableOpacity>

          <View style={[styles.zoomCounter, { top: insets.top + 18 }]}>
            <Text style={styles.zoomCounterText}>
              {zoomIndex + 1}{' '}
              <Text style={styles.zoomCounterTotal}>
                / {cafe.photos.length}
              </Text>
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
        <TouchableOpacity
          style={styles.checkinBtn}
          onPress={handleCheckIn}
          disabled={checkingIn}
        >
          <Text style={styles.checkinBtnText}>{checkingIn ? "..." : "📍"}</Text>
        </TouchableOpacity>
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
  // Hero photo card — width = screen minus peek so the next photo's left
  // edge stays visible on the right of the current one.
  photo: {
    width: HERO_CARD_W,
    height: 280,
    borderRadius: 16,
    resizeMode: "cover",
    backgroundColor: "#F0EDE8",
  },
  photoDots: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  photoDotActive: { backgroundColor: "#FFFFFF", width: 18 },
  photoCounter: {
    position: "absolute",
    right: spacing.md,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    zIndex: 10,
  },
  photoCounterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  // Back button — solid translucent dark + white outline so it's legible on
  // ANY photo (the previous rgba(0,0,0,0.3) was invisible on bright photos).
  backBtn: {
    position: "absolute",
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  backIcon: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "600",
    lineHeight: 30,
    marginTop: -2,
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
  // Image fills the entire viewport — resizeMode "contain" keeps aspect
  // ratio so portrait photos don't get cut off. No more 85% box leaving
  // an awkward black band at the bottom.
  zoomImage: {
    width,
    height,
  },
  // Top-strip gradient via solid color overlay (cheap, no expo-linear here):
  // 88px of dark wash so the back button + counter are always legible.
  zoomTopScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  // Back button — solid translucent dark with white outline + chevron, big
  // hit area, properly offset by safe-area inset (set inline in JSX).
  zoomCloseBtn: {
    position: "absolute",
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  zoomCloseText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 30,
    marginTop: -2,
  },
  zoomCounter: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 10,
  },
  zoomCounterText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  zoomCounterTotal: { color: "rgba(255,255,255,0.65)", fontWeight: "600" },
  content: { padding: spacing.lg },
  cafeName: { fontSize: 24, fontWeight: "700", color: colors.primary },
  distance: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  // Rating row under title — ★ {rating} ({n}) · {price} · {distance}
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 4,
  },
  ratingStar: { fontSize: 14, color: "#F59E0B" },
  ratingNum: { fontSize: 14, fontWeight: "800", color: colors.primary },
  ratingMeta: { fontSize: 13, color: colors.textSecondary },
  ratingDot: { fontSize: 13, color: "#D9D6CE", marginHorizontal: 4 },

  // Phone row (clickable tel:)
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 8,
  },
  phoneIcon: { fontSize: 16 },
  phoneText: { flex: 1, fontSize: 14, color: colors.primary, fontWeight: "600" },
  phoneCta: { fontSize: 13, color: colors.accent, fontWeight: "700" },

  // Jam Buka (opening hours) table
  hoursCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  hoursRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F0EDE8",
  },
  hoursRowToday: { backgroundColor: "#FDF6EC" },
  hoursDay: { fontSize: 13, fontWeight: "700", color: "#5C5A52" },
  hoursDayToday: { color: colors.accent },
  hoursValue: {
    fontSize: 13,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  hoursValueClosed: { color: "#EF4444" },

  // Photos grid — exact 3-col using window width math (avoids the percent
  // rounding that left tiny gaps on some phones).
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.sm,
  },
  photoGridItem: (() => {
    const PADDING = spacing.lg * 2; // content paddingLeft + paddingRight
    const GAP = 8;
    const COLS = 3;
    const cellW = Math.floor((width - PADDING - GAP * (COLS - 1)) / COLS);
    return {
      width: cellW,
      height: cellW,
      borderRadius: 14,
      overflow: "hidden" as const,
      backgroundColor: "#F0EDE8",
      // Subtle lift so tiles feel separated from the page bg.
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    };
  })(),
  photoGridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoGridOverflow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  photoGridOverflowText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
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
  facilityIcon: { fontSize: 14, marginRight: spacing.xs },
  facilityLabel: { fontSize: 13, color: colors.primary, fontWeight: "500" },
  noFacilities: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
  },

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
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    padding: spacing.md,
  },
  menuCategory: {},
  menuCategorySpaced: {
    marginTop: spacing.lg,
  },
  menuCategoryTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EDE8",
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemBody: { flex: 1, minWidth: 0 },
  menuItemName: { fontSize: 15, color: colors.primary },
  menuItemDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  menuItemPrice: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: "700",
  },
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

  // ─── Top check-in leaderboard ─────────────────────────────────────────
  // Loading skeleton — three pulsing pills mimicking row height.
  lbSkeleton: {
    height: 56,
    backgroundColor: "#F0EDE8",
    borderRadius: 12,
    marginBottom: spacing.xs,
    opacity: 0.7,
  },
  // Empty CTA — encourages first check-in instead of hiding the section.
  lbEmpty: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E0DCD3",
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  lbEmptyEmoji: { fontSize: 28, marginBottom: 4 },
  lbEmptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5C5A52",
  },
  lbEmptyHint: {
    fontSize: 11,
    color: "#8A8880",
    marginTop: 2,
    textAlign: "center",
  },
  // List card — single rounded container with internal dividers (matches web).
  lbCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    borderRadius: 16,
    overflow: "hidden",
  },
  lbItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  lbItemDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F0EDE8",
  },
  // Subtle warm tint behind ranks 1-3 to reinforce the "top" nature.
  lbItemTop3: { backgroundColor: "#FFFBF3" },

  // Rank badge — gradient-mimicking solid colors (RN doesn't do CSS gradients
  // out of the box; use a single color from each web gradient stop).
  lbRankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  lbRankGold: { backgroundColor: "#F59E0B" },
  lbRankSilver: { backgroundColor: "#9CA3AF" },
  lbRankBronze: { backgroundColor: "#B45309" },
  lbRankPlain: { backgroundColor: "#F0EDE8" },
  lbRankBadgeEmoji: { fontSize: 16 },
  lbRankBadgeNum: { fontSize: 13, fontWeight: "800", color: "#8A8880" },

  // Middle info column — name + badge on one line, meta on next.
  lbInfo: { flex: 1, minWidth: 0 },
  lbNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  lbItemName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1C1C1A",
    flexShrink: 1,
  },
  lbItemBadge: {
    backgroundColor: "#FFF1E0",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  lbItemBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
  },
  lbMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 6,
  },
  lbMeta: { fontSize: 11, color: "#8A8880", fontWeight: "600" },
  lbMetaDot: { fontSize: 11, color: "#D9D6CE" },

  // Right column — score in big orange numerals + "PTS" label.
  lbScore: { alignItems: "flex-end", minWidth: 40 },
  lbScoreNum: {
    fontSize: 16,
    fontWeight: "900",
    color: "#EA580C",
    lineHeight: 18,
  },
  lbScoreLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#8A8880",
    letterSpacing: 0.6,
    marginTop: 1,
  },
});

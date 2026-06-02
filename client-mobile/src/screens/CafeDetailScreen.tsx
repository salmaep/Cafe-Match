import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Linking,
  ActivityIndicator,
  Modal,
  StatusBar,
  // Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { cafeText } from "@shared/i18n/keys";
import { useShortlist } from "../context/ShortlistContext";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../context/LocationContext";
import {
  toggleBookmark,
  toggleFavorite,
  trackAnalytics,
  haversineKm,
  // checkInApi,
} from "../services/api";
import { logEvent } from "../utils/analytics";
import { placeholderImage } from "../utils/cafeImage";
import { useCafeDetail } from "../queries/cafes/use-cafe-detail";
import { useReviewSummary } from "../queries/reviews/use-review-summary";
import { useReviews } from "../queries/reviews/use-reviews";
import { useMyReviews } from "../queries/reviews/use-my-reviews";
import { useGoogleReviews } from "../queries/cafes/google-reviews";
import { useLeaderboard } from "../queries/checkins/use-leaderboard";
import GoogleReviewCard from "../components/cafe/GoogleReviewCard";
import GoogleGIcon from "../components/cafe/GoogleGIcon";
import { useQueryClient } from "@tanstack/react-query";
import { reviewKeys } from "../queries/reviews/keys";
import { cafeKeys } from "../queries/cafes/keys";
import { Cafe } from "../types";
import { colors, spacing, radius } from "../theme";
import { buildFacilityChips } from "../utils/facilities";
import { cleanAddress } from "../utils/address";
import { formatRating } from "../utils/rating";
import { formatHoursTable } from "../utils/openingHours";
import {
  prettyReviewCategory,
  reviewCategoryIcon,
  isMoodCategory,
  isFacilityCategory,
  isStarCategory,
} from "../constant/ui/review-categories";
import { LucideIcon } from "../utils/lucideIcon";
import StatusBarScrim from "../components/StatusBarScrim";
import { Star, MapPin, Heart, Bookmark, BookmarkCheck, ChevronLeft, Phone, PencilLine, User, Users, BookOpen, Laptop } from "lucide-react-native";
import type { LucideIcon as LucideIconType } from "lucide-react-native";

const MOOD_SLUG_TO_ICON: Record<string, LucideIconType> = {
  'me-time': User,
  'date': Heart,
  'family': Users,
  'group-work': BookOpen,
  'wfc': Laptop,
};

const { width, height } = Dimensions.get("window");

// Hero carousel sizing — leave a sliver of the next photo peeking on the
// right so the user knows it's swipeable. Card = screen minus left padding
// minus next-photo peek; gap is just a hair so cards don't touch.
const HERO_SIDE_PAD = 0;
const HERO_PEEK = 24;
const HERO_GAP = 6;
const HERO_CARD_W = width - HERO_SIDE_PAD - HERO_PEEK;

function HeroPhoto({
  uri,
  style,
  onFail,
}: {
  uri: string;
  style: any;
  onFail?: () => void;
}) {
  const [src, setSrc] = useState<string | null>(uri && uri.length > 0 ? uri : null);
  if (src == null) return null;
  return (
    <Image
      source={{ uri: src }}
      style={style}
      cachePolicy="memory-disk"
      transition={200}
      onError={() => {
        setSrc(null);
        onFail?.();
      }}
    />
  );
}

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
        cachePolicy="memory-disk"
        transition={200}
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
  const { t } = useTranslation();
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
  // Latest reviews preview (first page is enough — we only show 3–4).
  // Server returns them ordered by created_at DESC, matching the mobile spec:
  // sort by newest when no helpful-votes feature exists yet.
  const reviewsListQuery = useReviews(initialCafe?.id);
  const previewReviews = (reviewsListQuery.data?.reviews ?? []).slice(0, 4);
  const myReviewsQuery = useMyReviews();
  const hasMyReview = React.useMemo(() => {
    if (!initialCafe?.id) return false;
    const cid = Number(initialCafe.id);
    return (myReviewsQuery.data ?? []).some((r) => r.cafeId === cid);
  }, [myReviewsQuery.data, initialCafe?.id]);
  const googleReviewsQuery = useGoogleReviews(initialCafe?.id, 5);
  const googleReviews = googleReviewsQuery.data?.data ?? [];
  const googleReviewTotal = googleReviewsQuery.data?.meta?.total ?? 0;
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
  const [gridReady, setGridReady] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(new Set());
  const markPhotoFailed = useCallback((index: number) => {
    setFailedPhotos((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);
  const allPhotosFailed =
    (cafe?.photos?.length ?? 0) > 0 &&
    failedPhotos.size >= (cafe?.photos?.length ?? 0);
  const inShortlist = isInShortlist(cafe.id);

  useEffect(() => {
    const id = setTimeout(() => setGridReady(true), 0);
    return () => clearTimeout(id);
  }, []);

  // const [checkingIn, setCheckingIn] = useState(false);

  // Merge mood signals from THREE sources into ONE unified list:
  //  - cafe.purposes (scraped name array, e.g. "Family Time") → each counts as +1
  //  - cafe.purposeScores (scraped analysis, slug → 0-100, threshold ≥40) → +1
  //  - reviewSummary mood_* (user review votes) → add real vote count
  // All dedupe by normalized slug. Final count = scraped_signals + user_votes.
  const moodChips = React.useMemo(() => {
    const slugToLabel: Record<string, string> = {
      'me-time': 'Me Time',
      'date': 'Date',
      'family': 'Family',
      'group-work': 'Group Study',
      'wfc': 'WFC',
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
    const combined = new Map<string, { slug: string; label: string; count: number }>();

    const bump = (slug: string, delta: number) => {
      const label = slugToLabel[slug];
      if (!label) return;
      const existing = combined.get(slug);
      if (existing) existing.count += delta;
      else combined.set(slug, { slug, label, count: delta });
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
      .map((v) => ({ slug: v.slug, label: v.label, count: v.count }));
  }, [reviewSummary, cafe]);

  // Single facility chip list — same logic as web (buildFacilityChips reads
  // cafe.facilitiesRich + bool columns + dedupes). Mirrors the cafe list cards.
  const facilityChips = React.useMemo(
    () => cafe.chips ?? buildFacilityChips(cafe),
    [cafe],
  );

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
    qc.invalidateQueries({ queryKey: reviewKeys.ofCafe(initialCafe.id) });
    qc.invalidateQueries({ queryKey: cafeKeys.detail(initialCafe.id) });
    qc.invalidateQueries({ queryKey: ['reviews', 'me'] });
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

  const handleWriteReview = () => {
    if (!user) {
      navigation.navigate("AuthModal");
      return;
    }
    navigation.navigate("WriteReview", {
      cafeId: cafe.id,
      cafeName: cafe.name,
    });
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

  // const handleCheckIn = async () => {
  //   setCheckingIn(true);
  //   try {
  //     const loc = await (
  //       await import("expo-location")
  //     ).getCurrentPositionAsync({ accuracy: 6 });
  //     const result: any = await checkInApi(
  //       Number(cafe.id),
  //       loc.coords.latitude,
  //       loc.coords.longitude,
  //     );
  //     const togetherWith: { id: number; name: string }[] =
  //       result?.togetherWith || [];
  //     if (togetherWith.length > 0) {
  //       const names = togetherWith.map((f) => f.name).join(", ");
  //       Alert.alert(
  //         "💥 BARENGAN!",
  //         `Kamu lagi di ${cafe.name} bareng ${names}! Seru nih!`,
  //         [{ text: "Siap!", style: "default" }],
  //       );
  //     } else {
  //       Alert.alert(
  //         "Check-in berhasil! ☕",
  //         `Kamu sekarang ada di ${cafe.name}`,
  //       );
  //     }
  //   } catch (err: any) {
  //     const msg =
  //       err?.response?.data?.message || err?.message || "Gagal check-in";
  //     Alert.alert("Oops", typeof msg === "string" ? msg : msg[0]);
  //   }
  //   setCheckingIn(false);
  // };

  const formatPrice = (price: number) => "Rp " + price.toLocaleString("id-ID");

  return (
    <View style={styles.container}>
      <StatusBarScrim />
      {detailLoading && (
        <View style={styles.detailLoadingBar}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero photo carousel — when all photos fail (or none exist),
            render a single placeholder photo instead of hiding. */}
        <View style={styles.carouselContainer}>
          {allPhotosFailed || (cafe.photos?.length ?? 0) === 0 ? (
            <Image
              source={{ uri: placeholderImage(cafe.id) }}
              style={styles.photo}
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <>
              <FlatList
                data={cafe.photos}
                horizontal
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
                    <HeroPhoto
                      uri={item}
                      style={styles.photo}
                      onFail={() => markPhotoFailed(index)}
                    />
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
              <View style={[styles.photoCounter, { top: insets.top + 18 }]}>
                <Text style={styles.photoCounterText}>
                  {currentPhoto + 1} / {(cafe.photos ?? []).length}
                </Text>
              </View>
            </>
          )}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
          >
            <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.cafeName}>{cafe.name}</Text>

          {/* Rating + price + distance row (mirrors web detail header) */}
          <View style={styles.ratingRow}>
            {formatRating(cafe.googleRating) && (
              <>
                <Star size={14} color="#F59E0B" fill="#F59E0B" strokeWidth={0} style={styles.ratingStarIcon} />
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
              {t(cafeText.kmFromYou, { km: realDistance })}
            </Text>
          </View>

          {cafe.description ? (
            <Text style={styles.description}>{cafe.description}</Text>
          ) : null}

          <TouchableOpacity style={styles.addressCard} onPress={openMaps} activeOpacity={0.85}>
            <View style={styles.addressTop}>
              <MapPin
                size={16}
                color={colors.textSecondary}
                strokeWidth={2}
                style={styles.addressIconLead}
              />
              <Text style={styles.addressText}>{cleanAddress(cafe.address)}</Text>
            </View>
            <View style={styles.addressFooter}>
              <Text style={styles.openMaps}>{t(cafeText.openInMaps)}</Text>
            </View>
          </TouchableOpacity>

          {/* Phone — clickable tel: link */}
          {!!cafe.phone && (
            <TouchableOpacity
              style={styles.phoneRow}
              onPress={() => Linking.openURL(`tel:${cafe.phone}`)}
            >
              <Phone size={14} color={colors.textSecondary} strokeWidth={2} style={styles.phoneIconLead} />
              <Text style={styles.phoneText}>{cafe.phone}</Text>
              <Text style={styles.phoneCta}>{t(cafeText.call)}</Text>
            </TouchableOpacity>
          )}

          {/* Jam Buka — opening hours table, today highlighted */}
          {cafe.openingHours && Object.keys(cafe.openingHours).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t(cafeText.openingHours)}</Text>
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
                          {isToday ? `  (${t(cafeText.today)})` : ''}
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

          <Text style={styles.sectionTitle}>{t(cafeText.facilities)}</Text>
          {facilityChips.length > 0 ? (
            <View style={styles.facilitiesRow}>
              {facilityChips.map((f) => (
                <View key={f.key} style={styles.facilityChip}>
                  {f.lucideName && (
                    <LucideIcon
                      name={f.lucideName}
                      size={12}
                      color={colors.primary}
                      strokeWidth={2}
                    />
                  )}
                  <Text style={styles.facilityLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noFacilities}>{t(cafeText.noFacilitiesListed)}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{cafe.favoritesCount}</Text>
              <Text style={styles.statLabel}>{t(cafeText.favorites)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{cafe.bookmarksCount}</Text>
              <Text style={styles.statLabel}>{t(cafeText.bookmarks)}</Text>
            </View>
            {cafe.matchScore ? (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={[styles.statNumber, { color: colors.accent }]}>
                    {cafe.matchScore}%
                  </Text>
                  <Text style={styles.statLabel}>{t(cafeText.match)}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Reviews — header always present (parity with web). Rating bars
              + preview cards when data exists; empty-state card otherwise. */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t(cafeText.reviews)}</Text>
            {previewReviews.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Reviews", {
                    cafeId: cafe.id,
                    cafeName: cafe.name,
                  })
                }
              >
                <Text style={styles.seeAll}>{t(cafeText.seeAllArrow)}</Text>
              </TouchableOpacity>
            )}
          </View>
          {starSummary.length > 0 && (
            <>
              {starSummary.slice(0, 4).map((s) => (
                <View key={s.category} style={styles.reviewBarRow}>
                  <View style={styles.reviewBarLabelWrap}>
                    <LucideIcon
                      name={reviewCategoryIcon(s.category)}
                      size={13}
                      color={colors.textSecondary}
                      strokeWidth={2}
                    />
                    <Text style={styles.reviewBarLabel} numberOfLines={1}>
                      {prettyReviewCategory(s.category)}
                    </Text>
                  </View>
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

              {/* Review preview cards — newest 3-4. Tapping any card (or the
                  "Lihat semua" link above) routes to the full list screen. */}
              {previewReviews.length > 0 && (
                <View style={styles.reviewPreviewList}>
                  {previewReviews.slice(0, 4).map((r: any) => {
                    const overall = r.ratings?.find(
                      (rt: { category: string; score: number }) =>
                        rt.category === 'overall',
                    );
                    const stars = overall ? Math.round(overall.score) : 0;
                    const firstPhoto = r.media?.find(
                      (m: { mediaType: 'photo' | 'video' }) =>
                        m.mediaType === 'photo',
                    );
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={styles.reviewPreviewCard}
                        activeOpacity={0.8}
                        onPress={() =>
                          navigation.navigate('Reviews', {
                            cafeId: cafe.id,
                            cafeName: cafe.name,
                          })
                        }
                      >
                        <View style={styles.reviewPreviewHeader}>
                          <View style={styles.reviewPreviewAvatar}>
                            <Text style={styles.reviewPreviewAvatarText}>
                              {r.userName?.[0]?.toUpperCase() || '?'}
                            </Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={styles.reviewPreviewName}
                              numberOfLines={1}
                            >
                              {r.userName}
                            </Text>
                            <Text style={styles.reviewPreviewDate}>
                              {new Date(r.createdAt).toLocaleDateString(
                                'id-ID',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                },
                              )}
                            </Text>
                          </View>
                          {stars > 0 && (
                            <View style={styles.reviewPreviewStarsRow}>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={11}
                                  color="#F59E0B"
                                  fill={i < stars ? "#F59E0B" : "transparent"}
                                  strokeWidth={i < stars ? 0 : 1.5}
                                />
                              ))}
                            </View>
                          )}
                        </View>
                        {!!r.text && (
                          <Text
                            style={styles.reviewPreviewText}
                            numberOfLines={3}
                          >
                            {r.text}
                          </Text>
                        )}
                        {firstPhoto && (
                          <Image
                            source={{ uri: firstPhoto.url }}
                            style={styles.reviewPreviewPhoto}
                            cachePolicy="memory-disk"
                            transition={200}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

            </>
          )}
          {previewReviews.length === 0 && (
            <View style={styles.reviewsEmpty}>
              <PencilLine
                size={28}
                color={colors.accent}
                strokeWidth={2}
                style={styles.reviewsEmptyIcon}
              />
              <Text style={styles.reviewsEmptyTitle}>
                {t(cafeText.noReviewYet)}
              </Text>
              <Text style={styles.reviewsEmptyHint}>
                {t(cafeText.beTheFirstReview)}
              </Text>
            </View>
          )}
          {hasMyReview ? (
            <View style={styles.alreadyReviewedNote}>
              <Text style={styles.alreadyReviewedText}>
                Kamu sudah menulis ulasan untuk cafe ini.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={handleWriteReview}
            >
              <Text style={styles.writeReviewText}>
                {previewReviews.length === 0
                  ? t(cafeText.beTheFirstReview)
                  : t(cafeText.writeReviewCTA)}
              </Text>
            </TouchableOpacity>
          )}

          {/* Google Maps Reviews — scraped, read-only. Mirrors web parity. */}
          {googleReviews.length > 0 && (
            <View style={styles.googleSection}>
              <View style={styles.googleHeaderBadge}>
                <GoogleGIcon size={14} />
                <Text style={styles.googleHeaderLabel}>
                  {t(cafeText.googleReviews)}
                </Text>
                <Text style={styles.googleHeaderCount}>
                  ({googleReviewTotal})
                </Text>
              </View>
              <View style={styles.googleList}>
                {googleReviews.map((gr) => (
                  <GoogleReviewCard key={gr.id} review={gr} />
                ))}
              </View>
              {googleReviewTotal > googleReviews.length && (
                <TouchableOpacity
                  style={styles.googleSeeAllBtn}
                  onPress={() =>
                    navigation.navigate("Reviews", {
                      cafeId: cafe.id,
                      cafeName: cafe.name,
                    })
                  }
                >
                  <Text style={styles.googleSeeAllText}>
                    {t(cafeText.seeAllArrow)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Hidden — check-in feature disabled. Mirrors web b5acbe27. */}
          {false && (<>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t(cafeText.topCheckin)}</Text>
            {leaderboard.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Leaderboard", {
                    cafeId: cafe.id,
                    cafeName: cafe.name,
                  })
                }
              >
                <Text style={styles.seeAll}>{t(cafeText.moreArrow)}</Text>
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
              <Text style={styles.lbEmptyTitle}>{t(cafeText.noCheckinYet)}</Text>
              <Text style={styles.lbEmptyHint}>
                {t(cafeText.noCheckinHint)}
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
                          {t(cafeText.checkinCountSuffix, { count: e.checkinCount })}
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
                      <Text style={styles.lbScoreLabel}>{t(cafeText.ptsLabel)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          </>)}

          {/* Photos — clean 3-column grid (square tiles, rounded, subtle
              shadow). Cap visible at 9 with a "+N more" overlay; tap any
              tile to open the fullscreen zoom modal at that index.
              Hidden entirely when all photos fail to load. */}
          {(cafe.photos?.length ?? 0) > 0 && !allPhotosFailed && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>{t(cafeText.photos)}</Text>
                {(cafe.photos?.length ?? 0) > 9 && (
                  <TouchableOpacity onPress={() => openZoom(0)}>
                    <Text style={styles.seeAll}>
                      {t(cafeText.viewAllPhotos, { count: cafe.photos!.length })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.photoGrid}>
                {(cafe.photos ?? []).slice(0, 9).map((photoUri, i) => {
                  const isLastVisible = i === 8;
                  const overflow = (cafe.photos?.length ?? 0) - 9;
                  const showImage = i < 3 || gridReady;
                  return (
                    <TouchableOpacity
                      key={`${photoUri}-${i}`}
                      style={styles.photoGridItem}
                      activeOpacity={0.85}
                      onPress={() => openZoom(i)}
                    >
                      {showImage ? (
                        <Image
                          source={{ uri: photoUri }}
                          style={styles.photoGridImage}
                          cachePolicy="memory-disk"
                          transition={200}
                          onError={() => markPhotoFailed(i)}
                        />
                      ) : (
                        <View style={[styles.photoGridImage, styles.photoGridPlaceholder]} />
                      )}
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
              <Text style={styles.sectionTitle}>{t(cafeText.menu)}</Text>
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

          {moodChips.length > 0 && (
            <View style={styles.moodRow}>
              <Text style={styles.moodRowLabel}>
                {t(cafeText.moodHeader)}
              </Text>
              <View style={styles.tagsRow}>
                {moodChips.map((m) => {
                  const Icon = MOOD_SLUG_TO_ICON[m.slug];
                  return (
                    <View key={m.slug} style={styles.moodChip}>
                      {Icon && (
                        <Icon size={12} color={colors.accent} strokeWidth={2.2} />
                      )}
                      <Text style={styles.moodChipText}>{m.label}</Text>
                      {m.count > 0 && (
                        <Text style={styles.moodChipCount}>· {m.count}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
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
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={200}
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
            <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
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
          <Heart
            size={22}
            color={isFavorited ? "#E94B4B" : colors.textSecondary}
            fill={isFavorited ? "#E94B4B" : "transparent"}
            strokeWidth={2}
          />
          <Text style={styles.actionLabel}>{t(cafeText.favorites)}</Text>
        </TouchableOpacity>
        {/* Bookmark action hidden — mirrors web removing bookmark from cafe detail. */}
        {false && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark}>
            {isBookmarked ? (
              <BookmarkCheck size={22} color={colors.accent} strokeWidth={2} />
            ) : (
              <Bookmark size={22} color={colors.textSecondary} strokeWidth={2} />
            )}
            <Text style={styles.actionLabel}>{t(cafeText.bookmarks)}</Text>
          </TouchableOpacity>
        )}
        {/* <TouchableOpacity
          style={styles.checkinBtn}
          onPress={handleCheckIn}
          disabled={checkingIn}
        >
          <Text style={styles.checkinBtnText}>{checkingIn ? "..." : "📍"}</Text>
        </TouchableOpacity> */}
        <TouchableOpacity
          style={[
            styles.shortlistBtn,
            inShortlist && styles.shortlistBtnActive,
          ]}
          onPress={handleShortlist}
        >
          <Text style={styles.shortlistBtnText}>
            {inShortlist ? t(cafeText.shortlistAdded) : t(cafeText.shortlistAdd)}
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
  ratingStarIcon: { marginRight: 3 },
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
  phoneIconLead: { marginRight: 4 },
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
  photoGridPlaceholder: {
    backgroundColor: "#F0EDE8",
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
  addressCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  addressTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  addressIconLead: { marginTop: 2 },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    lineHeight: 20,
  },
  addressFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  openMaps: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "700",
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
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
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
    gap: 5,
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
  // checkinBtn: {
  //   width: 48,
  //   height: 48,
  //   borderRadius: 24,
  //   backgroundColor: colors.success,
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
  // checkinBtnText: { fontSize: 20 },

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
  reviewBarLabelWrap: {
    width: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewBarLabel: {
    flex: 1,
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

  // ─── Empty state for reviews section (no in-app reviews yet) ────────
  reviewsEmpty: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  reviewsEmptyIcon: { marginBottom: spacing.xs },
  reviewsEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  reviewsEmptyHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  alreadyReviewedNote: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#F8F6F1',
    borderWidth: 1,
    borderColor: '#F0EDE8',
    alignItems: 'center',
  },
  alreadyReviewedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // ─── Google Maps reviews section ────────────────────────────────────
  googleSection: { marginTop: spacing.lg },
  googleHeaderBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F9FF',
    borderWidth: 1,
    borderColor: '#E8E4F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  googleHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C5A52',
  },
  googleHeaderCount: { fontSize: 12, color: '#8A8880' },
  googleList: { gap: spacing.sm },
  googleSeeAllBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  googleSeeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },

  // ─── Review preview cards (shown above "Tulis Review" CTA) ────────────
  reviewPreviewList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  reviewPreviewCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    padding: spacing.md,
  },
  reviewPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 6,
  },
  reviewPreviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewPreviewAvatarText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 13,
  },
  reviewPreviewName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  reviewPreviewDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  reviewPreviewStarsRow: {
    flexDirection: "row",
    gap: 1,
  },
  reviewPreviewText: {
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
  reviewPreviewPhoto: {
    width: "100%",
    height: 140,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    backgroundColor: "#F0EDE8",
  },

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

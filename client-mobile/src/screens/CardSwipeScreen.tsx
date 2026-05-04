import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useShortlist } from '../context/ShortlistContext';
import { usePreferences } from '../context/PreferencesContext';
import { useLocation } from '../context/LocationContext';
import { useSearchCafes } from '../queries/cafes/use-search-cafes';
import { usePromotedCafes } from '../queries/cafes/use-promoted-cafes';
import { hitsToCafes } from '../queries/cafes/api';
import { PURPOSE_SLUG_MAP } from '../constant/purpose';
import { MOCK_CAFES } from '../data/mockCafes';

// Fallback promo cards used when backend has no active promos
const FALLBACK_PROMO_A: Cafe = {
  id: 'promo-a-fallback',
  name: 'Kopi Baru Kemang',
  photos: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'],
  distance: 1.2,
  address: 'Jl. Kemang Raya No. 88, Jakarta Selatan',
  latitude: -6.2615,
  longitude: 106.8106,
  purposes: ['Me Time', 'WFC'],
  facilities: ['WiFi', 'Power Outlet'],
  menu: [],
  favoritesCount: 12,
  bookmarksCount: 5,
  promotionType: 'A',
  hasActivePromotion: true,
  activePromotionType: 'new_cafe',
  newCafeContent: {
    openingSince: 'March 2026',
    highlightText: 'Freshly opened with a full specialty menu.',
    keunggulan: ['Rooftop', 'Specialty Coffee', 'Free WiFi'],
    promoOffer: 'Grand Opening: Buy 1 Get 1 all beverages this month!',
    promoPhoto: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
  },
};

const FALLBACK_PROMO_B: Cafe = {
  id: 'promo-b-fallback',
  name: 'Rumah Kopi Senopati',
  photos: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800'],
  distance: 0.8,
  address: 'Jl. Senopati No. 23, Jakarta Selatan',
  latitude: -6.2400,
  longitude: 106.8050,
  purposes: ['Date', 'Me Time'],
  facilities: ['WiFi', 'Quiet Atmosphere', 'Outdoor Area'],
  menu: [],
  favoritesCount: 87,
  bookmarksCount: 34,
  promotionType: 'B',
  promoTitle: 'Buy 1 Get 1 Latte',
  promoDescription: 'Valid every Monday – Wednesday, all day long',
  hasActivePromotion: true,
  activePromotionType: 'featured_promo',
  promotionContent: {
    title: 'Buy 1 Get 1 Latte',
    description: 'Every day 8PM–10PM, dine in only. Valid for all latte orders.',
    validHours: '8PM – 10PM',
    validDays: 'Monday – Wednesday',
    promoPhoto: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
  },
};
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';
import Toast from '../components/Toast';

const { width, height } = Dimensions.get('window');
const CARD_W = width * 0.85;

// DEV TOGGLE: fetch all cafes regardless of wizard radius setting.
// Revert to `false` for production.
const DEV_DISABLE_RADIUS = true;

export default function CardSwipeScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { addToShortlist, isInShortlist } = useShortlist();
  const { preferences } = usePreferences();
  const { latitude, longitude } = useLocation();
  const swiperRef = useRef<any>(null);

  const [allSwiped, setAllSwiped] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [cafes, setCafes] = useState<Cafe[]>([]);

  // Fix 1: Calculate available height for card centering
  const HEADER_H = insets.top + 72; // status bar + header row
  const BOTTOM_H = insets.bottom + 72; // FAB + bottom safe area
  const availableH = height - HEADER_H - BOTTOM_H;
  const CARD_H = Math.min(availableH * 0.88, height * 0.68);

  // Position cards exactly in center of available area
  const cardTop = Math.max(0, (availableH - CARD_H) / 2);
  const cardLeft = (width - CARD_W) / 2;

  // ─── Cafe data via TanStack Query + Meilisearch ─────────────────────────
  const lat = preferences?.location?.latitude ?? latitude;
  const lng = preferences?.location?.longitude ?? longitude;
  const radKm = DEV_DISABLE_RADIUS ? 9999 : (preferences?.radius ?? 2);

  const cafesQuery = useSearchCafes({
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    radius: Math.min(radKm * 1000, 50_000_000),
    limit: 50,
  });
  const promotedQuery = usePromotedCafes();

  const loading = cafesQuery.isLoading || promotedQuery.isLoading;

  useEffect(() => {
    if (cafesQuery.isFetching || promotedQuery.isFetching) return;

    let allCafes: Cafe[] = cafesQuery.data
      ? cafesQuery.data.pages.flatMap((p) =>
          hitsToCafes(p, lat ?? undefined, lng ?? undefined),
        )
      : [];
    const promotedCafes: Cafe[] = promotedQuery.data ?? [];

    if (!allCafes || allCafes.length === 0) {
      allCafes = MOCK_CAFES.map((c) => ({ ...c }));
    }

    // Ensure all required fields are present
    allCafes = allCafes.map((c) => {
      const mock = MOCK_CAFES.find((m) => m.id === c.id);
      return {
        ...c,
        photos: c.photos?.length ? c.photos : (mock?.photos ?? MOCK_CAFES[0].photos),
        purposes: c.purposes?.length ? c.purposes : (mock?.purposes ?? ['Me Time']),
        facilities: c.facilities?.length ? c.facilities : (mock?.facilities ?? []),
        menu: c.menu?.length ? c.menu : (mock?.menu ?? []),
        name: c.name || mock?.name || 'Cafe',
        address: c.address || mock?.address || '',
      };
    });

    // Rank by purposeScore matching wizard selection; fall back to matchScore
    const wizardPurpose = preferences?.purpose;
    const wantedSlug = wizardPurpose ? PURPOSE_SLUG_MAP[wizardPurpose] : null;

    const scored = allCafes.map((c) => {
      let score = c.matchScore || 0;
      if (wantedSlug && c.purposeScores?.[wantedSlug] != null) {
        score = c.purposeScores[wantedSlug];
      }
      return { cafe: c, score };
    });

    let sorted = scored.sort((a, b) => b.score - a.score).map((s) => s.cafe);

    if (wantedSlug) {
      const matched = sorted.filter((c) => (c.purposeScores?.[wantedSlug] || 0) >= 40);
      if (matched.length > 0) sorted = matched;
    } else if (preferences?.purpose) {
      const filtered = sorted.filter((c) => c.purposes.includes(preferences.purpose!));
      if (filtered.length > 0) sorted = filtered;
    }

    const regular = sorted.filter((c) => !c.promotionType).slice(0, 5);

    const promoA: Cafe =
      promotedCafes.find((c) => c.promotionType === 'A' || c.activePromotionType === 'new_cafe') ??
      allCafes.find((c) => c.promotionType === 'A') ??
      FALLBACK_PROMO_A;

    const promoB: Cafe =
      promotedCafes.find((c) => c.promotionType === 'B' || c.activePromotionType === 'featured_promo') ??
      allCafes.find((c) => c.promotionType === 'B') ??
      FALLBACK_PROMO_B;

    const deck = regular.length >= 5 ? [...regular] : [...sorted.slice(0, 5)];

    const posA = 1 + Math.floor(Math.random() * 3);
    let posB = 1 + Math.floor(Math.random() * 3);
    while (posB === posA) posB = 1 + Math.floor(Math.random() * 3);

    const insertPositions = [posA, posB].sort((a, b) => a - b);
    deck.splice(insertPositions[0], 0, promoA);
    deck.splice(insertPositions[1] + 1, 0, promoB);

    setCafes(deck.length > 0 ? deck : MOCK_CAFES.slice(0, 5));
  }, [
    cafesQuery.data,
    cafesQuery.isFetching,
    promotedQuery.data,
    promotedQuery.isFetching,
    preferences?.purpose,
    lat,
    lng,
  ]);

  const handleSwipedRight = (cardIndex: number) => {
    const cafe = cafes[cardIndex];
    if (cafe && !isInShortlist(cafe.id)) {
      addToShortlist(cafe);
      setToastMsg(`Added "${cafe.name}" to Shortlist!`);
      setShowToast(true);
    }
  };

  const handleSwipedAll = () => {
    setAllSwiped(true);
    // Fix 6: Always navigate, with safety timeout
    setTimeout(() => {
      navigation.replace('MainTabs');
    }, 1200);
  };

  const openShortlist = () => navigation.navigate('ShortlistModal');

  // Fix 2: Card with correctly stacked bottom overlay
  const renderCard = (cafe: Cafe) => {
    if (!cafe) return null;
    const saved = isInShortlist(cafe.id);
    const isTypeA = cafe.promotionType === 'A' || cafe.activePromotionType === 'new_cafe';
    const isTypeB = cafe.promotionType === 'B' || cafe.activePromotionType === 'featured_promo';

    // Pick background photo: promo photo if provided, else cafe photo
    const bgPhoto =
      (isTypeB && (cafe.promotionContent?.promoPhoto || cafe.promoPhoto)) ||
      (isTypeA && cafe.newCafeContent?.promoPhoto) ||
      cafe.photos?.[0] ||
      MOCK_CAFES[0].photos[0];

    const promoContent = cafe.promotionContent;
    const newCafe = cafe.newCafeContent;

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        style={[
          styles.card,
          { width: CARD_W, height: CARD_H },
          isTypeA && styles.cardTypeA,
          isTypeB && styles.cardTypeB,
        ]}
        onPress={() => navigation.navigate('CafeDetail', { cafe })}
      >
        <Image source={{ uri: bgPhoto }} style={styles.cardImage} />

        {/* Taller gradient for promo cards so rich text stays readable */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.4, 1]}
          style={[styles.gradient, (isTypeA || isTypeB) && styles.gradientPromo]}
        />

        {/* Promo badge — top left */}
        {isTypeA && (
          <View style={[styles.promoBadgeLeft, styles.promoBadgeNew]}>
            <Text style={styles.promoBadgeText}>NEW!</Text>
          </View>
        )}
        {isTypeB && (
          <View style={[styles.promoBadgeLeft, styles.promoBadgeFeatured]}>
            <Text style={styles.promoBadgeText}>⭐ Special Offer</Text>
          </View>
        )}

        {/* Match score badge — top right (only non-promo cards) */}
        {cafe.matchScore != null && !isTypeA && !isTypeB && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{cafe.matchScore}%</Text>
            <Text style={styles.matchLabel}>Match</Text>
          </View>
        )}

        {/* Distance badge — top right for promo cards */}
        {(isTypeA || isTypeB) && (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceBadgeText}>{cafe.distance} km</Text>
          </View>
        )}

        {/* Shortlist heart — top left (non-promo) or below badge (promo) */}
        <TouchableOpacity
          style={[
            styles.heartBtn,
            saved && styles.heartBtnActive,
            (isTypeA || isTypeB) && styles.heartBtnPromo,
          ]}
          onPress={() => {
            addToShortlist(cafe);
            setToastMsg(`Added "${cafe.name}" to Shortlist!`);
            setShowToast(true);
          }}
        >
          <Text style={styles.heartIcon}>{saved ? '★' : '☆'}</Text>
        </TouchableOpacity>

        {/* Bottom content stack */}
        <View style={styles.cardBottom}>
          {/* ── Type A: New Cafe rich content ──────────────────────────── */}
          {isTypeA && (
            <>
              {/* Grand opening offer banner — amber strip */}
              {newCafe?.promoOffer ? (
                <View style={styles.newCafeOfferBanner}>
                  <Text style={styles.newCafeOfferText} numberOfLines={2}>
                    🎉 {newCafe.promoOffer}
                  </Text>
                </View>
              ) : null}

              <View style={styles.cardInfo}>
                <Text style={styles.cafeName} numberOfLines={1}>{cafe.name}</Text>
                {newCafe?.openingSince ? (
                  <Text style={styles.openingSince}>
                    ✨ Open since {newCafe.openingSince}
                  </Text>
                ) : (
                  <Text style={styles.cafeDistance}>{cafe.distance} km away</Text>
                )}
                {/* Keunggulan pills row */}
                {newCafe?.keunggulan && newCafe.keunggulan.length > 0 && (
                  <View style={styles.tagsRow}>
                    {newCafe.keunggulan.slice(0, 3).map((k) => (
                      <View key={k} style={styles.keunggulanPill}>
                        <Text style={styles.keunggulanPillText}>{k}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Fallback: show purposes if no keunggulan */}
                {(!newCafe?.keunggulan || newCafe.keunggulan.length === 0) && (
                  <View style={styles.tagsRow}>
                    {(cafe.purposes ?? []).slice(0, 2).map((p) => (
                      <View key={p} style={styles.tag}>
                        <Text style={styles.tagText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── Type B: Featured Promo rich content ────────────────────── */}
          {isTypeB && (
            <>
              <View style={styles.promoBannerTall}>
                <Text style={styles.promoBannerTitleLg} numberOfLines={1}>
                  {promoContent?.title || cafe.promoTitle || 'Special Offer'}
                </Text>
                {(promoContent?.description || cafe.promoDescription) ? (
                  <Text style={styles.promoBannerDescLg} numberOfLines={2}>
                    {promoContent?.description || cafe.promoDescription}
                  </Text>
                ) : null}

                {/* Valid hours chip */}
                {(promoContent?.validHours || promoContent?.validDays) && (
                  <View style={styles.validHoursRowPromo}>
                    <View style={styles.validHoursChipWhite}>
                      <Text style={styles.validHoursIconWhite}>🕗</Text>
                      <Text style={styles.validHoursTextWhite}>
                        {promoContent?.validHours || ''}
                        {promoContent?.validDays && promoContent?.validHours ? ' · ' : ''}
                        {promoContent?.validDays || ''}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cafeName} numberOfLines={1}>📍 {cafe.name}</Text>
                <View style={styles.tagsRow}>
                  {(cafe.purposes ?? []).slice(0, 2).map((p) => (
                    <View key={p} style={styles.tag}>
                      <Text style={styles.tagText}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* ── Regular card ───────────────────────────────────────────── */}
          {!isTypeA && !isTypeB && (
            <View style={styles.cardInfo}>
              <Text style={styles.cafeName} numberOfLines={1}>{cafe.name}</Text>
              <Text style={styles.cafeDistance}>{cafe.distance} km away</Text>
              <View style={styles.tagsRow}>
                {(cafe.purposes ?? []).slice(0, 2).map((p) => (
                  <View key={p} style={styles.tag}>
                    <Text style={styles.tagText}>{p}</Text>
                  </View>
                ))}
                {(cafe.facilities ?? []).slice(0, 2).map((f) => (
                  <View key={f} style={styles.tag}>
                    <Text style={styles.tagText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (allSwiped) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🗺️</Text>
        <Text style={styles.emptyTitle}>No match?</Text>
        <Text style={styles.emptySubtitle}>Let's explore the map!</Text>
      </View>
    );
  }

  if (loading || cafes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: spacing.md }} />
        <Text style={styles.emptyTitle}>Finding cafes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>
          Cafe<Text style={{ color: colors.accent }}>Match</Text>
        </Text>
      </View>

      {/* Fix 1: Absolute container spanning full available area; cardStyle centers the card */}
      <Swiper
        ref={swiperRef}
        cards={cafes}
        renderCard={renderCard}
        onSwipedRight={handleSwipedRight}
        onSwipedAll={handleSwipedAll}
        cardIndex={0}
        backgroundColor="transparent"
        stackSize={3}
        stackSeparation={12}
        stackScale={4}
        animateOverlayLabelsOpacity
        animateCardOpacity
        disableTopSwipe
        disableBottomSwipe
        overlayLabels={{
          left: {
            title: 'NOPE',
            style: {
              label: {
                backgroundColor: colors.error,
                color: colors.white,
                fontSize: 16,
                fontWeight: '700',
                borderRadius: 8,
                padding: 8,
              },
              wrapper: {
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'flex-start',
                marginTop: 40,
                marginLeft: -20,
              },
            },
          },
          right: {
            title: 'SHORTLIST ★',
            style: {
              label: {
                backgroundColor: colors.accent,
                color: colors.white,
                fontSize: 16,
                fontWeight: '700',
                borderRadius: 8,
                padding: 8,
              },
              wrapper: {
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                marginTop: 40,
                marginLeft: 20,
              },
            },
          },
        }}
        containerStyle={{
          position: 'absolute',
          top: HEADER_H,
          left: 0,
          right: 0,
          bottom: BOTTOM_H,
          backgroundColor: 'transparent',
        }}
        cardStyle={{
          top: cardTop,
          left: cardLeft,
          width: CARD_W,
          height: CARD_H,
        }}
      />

      {/* Shortlist FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={openShortlist}
      >
        <Text style={styles.fabIcon}>★</Text>
      </TouchableOpacity>

      <Toast message={toastMsg} visible={showToast} onHide={() => setShowToast(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.primary },

  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  cardTypeA: {
    borderWidth: 2.5,
    borderColor: colors.promoPin,
    shadowColor: colors.promoPin,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  cardTypeB: {
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  gradientPromo: {
    height: '75%',
  },

  promoBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 1,
  },
  promoBadgeLeft: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  promoBadgeNew: {
    backgroundColor: colors.promoPin,
  },
  promoBadgeFeatured: {
    backgroundColor: colors.accent,
  },
  promoBadgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.4,
  },

  distanceBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
  },
  distanceBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  heartBtnPromo: {
    left: undefined,
    right: spacing.md,
    // Position heart below the distance badge on promo cards
    top: spacing.md + 42,
  },

  matchBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  matchText: { color: colors.white, fontWeight: '700', fontSize: 18 },
  matchLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },

  heartBtn: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtnActive: { backgroundColor: colors.accent },
  heartIcon: { fontSize: 22, color: colors.white },

  // Fix 2: Single stacked bottom container
  cardBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  promoBanner: {
    backgroundColor: 'rgba(212, 139, 58, 0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  promoBannerTitle: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  promoBannerDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  // Type B: tall rich promo banner
  promoBannerTall: {
    backgroundColor: 'rgba(212, 139, 58, 0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  promoBannerTitleLg: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: 0.2,
  },
  promoBannerDescLg: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  validHoursRowPromo: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  validHoursChipWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    gap: 4,
  },
  validHoursIconWhite: { fontSize: 12 },
  validHoursTextWhite: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Type A: new cafe offer banner
  newCafeOfferBanner: {
    backgroundColor: 'rgba(232, 89, 60, 0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  newCafeOfferText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  openingSince: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  keunggulanPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  keunggulanPillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  cardInfo: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  cafeName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  cafeDistance: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.sm,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  tagText: { color: colors.white, fontSize: 12, fontWeight: '600' },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 20,
  },
  fabIcon: { fontSize: 24, color: colors.white },

  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: colors.primary },
  emptySubtitle: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.xs },
});

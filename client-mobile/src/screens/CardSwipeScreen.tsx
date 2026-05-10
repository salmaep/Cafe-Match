import React, { useRef, useState, useEffect, useCallback } from 'react';
import WizardScreen from './WizardScreen';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';
import Toast from '../components/Toast';

const { width, height } = Dimensions.get('window');
const CARD_W = width * 0.85;

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

  // Mirror web DiscoverPage: every visit to Discover starts with the wizard.
  // Reset on every focus so switching tabs and coming back re-shows the wizard.
  const [showWizard, setShowWizard] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setShowWizard(true);
    }, []),
  );

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
  const radKm = preferences?.radius ?? 2;

  const cafesQuery = useSearchCafes({
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    radius: Math.min(radKm * 1000, 50_000_000),
    limit: 50,
  });
  const promotedQuery = usePromotedCafes();

  // Show loading ONLY when there is no data at all (initial fetch).
  // Background refetches keep the existing deck visible to avoid blanking.
  const hasAnyData =
    (cafesQuery.data?.pages?.[0]?.data?.length ?? 0) > 0 ||
    (promotedQuery.data?.length ?? 0) > 0 ||
    cafes.length > 0;
  const loading =
    (cafesQuery.isLoading || promotedQuery.isLoading) && !hasAnyData;

  // Build the swipe deck from server data only.
  // Server (Meilisearch) filters by geo radius + amenities + purposeId; this
  // effect just ranks + interleaves promos for display order.
  useEffect(() => {
    // NOTE: don't gate on isFetching — that ping-pongs the deck on every
    // background refetch (focus, tab switch, etc) and triggers blank flashes.

    const allCafes: Cafe[] = cafesQuery.data
      ? cafesQuery.data.pages.flatMap((p) =>
          hitsToCafes(p, lat ?? undefined, lng ?? undefined),
        )
      : [];
    const promotedCafes: Cafe[] = promotedQuery.data ?? [];

    // Don't blank an existing deck when a refetch returns nothing transiently.
    // Only commit empty if we genuinely have no data AND aren't fetching.
    if (allCafes.length === 0 && promotedCafes.length === 0) {
      if (!cafesQuery.isFetching && !promotedQuery.isFetching) {
        setCafes((prev) => (prev.length === 0 ? prev : []));
      }
      return;
    }

    const wizardPurpose = preferences?.purpose;
    const wantedSlug = wizardPurpose ? PURPOSE_SLUG_MAP[wizardPurpose] : null;

    const sorted = wantedSlug
      ? [...allCafes].sort(
          (a, b) =>
            (b.purposeScores?.[wantedSlug] || b.matchScore || 0) -
            (a.purposeScores?.[wantedSlug] || a.matchScore || 0),
        )
      : allCafes;

    const regular = sorted.filter((c) => !c.promotionType).slice(0, 5);

    const promoA = promotedCafes.find(
      (c) => c.promotionType === 'A' || c.activePromotionType === 'new_cafe',
    );
    const promoB = promotedCafes.find(
      (c) => c.promotionType === 'B' || c.activePromotionType === 'featured_promo',
    );

    const deck: Cafe[] = [...regular];
    const insertAt = (cafe: Cafe) => {
      const pos = Math.min(deck.length, 1 + Math.floor(Math.random() * 3));
      deck.splice(pos, 0, cafe);
    };
    if (promoA) insertAt(promoA);
    if (promoB) insertAt(promoB);

    // Skip if the deck is unchanged (same length + same first id) to avoid
    // remounting Swiper and resetting swipe progress on every refetch.
    setCafes((prev) => {
      if (
        prev.length === deck.length &&
        prev[0]?.id === deck[0]?.id &&
        prev[prev.length - 1]?.id === deck[deck.length - 1]?.id
      ) {
        return prev;
      }
      return deck;
    });
  }, [
    cafesQuery.data,
    promotedQuery.data,
    cafesQuery.isFetching,
    promotedQuery.isFetching,
    preferences?.purpose,
    lat,
    lng,
  ]);

  // Reset "all swiped" state when the screen regains focus so coming back to
  // the Discover tab doesn't strand the user on the empty state.
  useFocusEffect(
    useCallback(() => {
      setAllSwiped(false);
    }, []),
  );

  const handleSwipedRight = (cardIndex: number) => {
    const cafe = cafes[cardIndex];
    if (!cafe || isInShortlist(cafe.id)) return;
    // Defer state updates well past the swipe animation (~250ms). Touching
    // ShortlistContext or toast state too early re-renders the parent while
    // Swiper is still settling its internal stack — known cause of blank
    // next/last cards in react-native-deck-swiper.
    setTimeout(() => {
      addToShortlist(cafe);
      setToastMsg(`Added "${cafe.name}" to Shortlist!`);
      setShowToast(true);
    }, 350);
  };

  const handleSwipedAll = () => {
    setAllSwiped(true);
    // Briefly show "No match?" then auto-navigate to the Explore (map) tab
    // so the user is never stranded on the empty state. Works both when
    // CardSwipe is reached via wizard (stack) and when it's the Discover tab.
    setTimeout(() => {
      navigation.navigate('MainTabs', { screen: 'Explore' });
    }, 1200);
  };

  const openShortlist = () => navigation.navigate('ShortlistModal');

  // Memoized so its identity is stable across re-renders. Without this,
  // every parent re-render (Toast state, ShortlistContext, etc) gives Swiper
  // a new renderCard reference, which can confuse its internal stack and
  // cause blank/missing cards.
  const renderCard = useCallback((cafe: Cafe) => {
    if (!cafe) return null;
    const saved = isInShortlist(cafe.id);
    const isTypeA = cafe.promotionType === 'A' || cafe.activePromotionType === 'new_cafe';
    const isTypeB = cafe.promotionType === 'B' || cafe.activePromotionType === 'featured_promo';

    // Pick background photo: promo photo if provided, else cafe photo, else placeholder
    const bgPhoto =
      (isTypeB && (cafe.promotionContent?.promoPhoto || cafe.promoPhoto)) ||
      (isTypeA && cafe.newCafeContent?.promoPhoto) ||
      cafe.photos?.[0] ||
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';

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
  }, [navigation, addToShortlist, isInShortlist]);

  if (allSwiped) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🗺️</Text>
        <Text style={styles.emptyTitle}>No match?</Text>
        <Text style={styles.emptySubtitle}>Let's explore the map!</Text>
      </View>
    );
  }

  const goExplore = () =>
    navigation.navigate('MainTabs', { screen: 'Explore' });

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: spacing.md }} />
        <Text style={styles.emptyTitle}>Finding cafes...</Text>
      </View>
    );
  }

  if (cafes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>☕</Text>
        <Text style={styles.emptyTitle}>Tidak ada kafe</Text>
        <Text style={styles.emptySubtitle}>
          Coba perluas radius atau hapus filter di Explore.
        </Text>
        <View style={styles.emptyActions}>
          <TouchableOpacity style={styles.emptyPrimaryBtn} onPress={goExplore}>
            <Text style={styles.emptyPrimaryBtnText}>🗺️  Buka Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emptySecondaryBtn}
            onPress={() => cafesQuery.refetch()}
          >
            <Text style={styles.emptySecondaryBtnText}>↻ Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Gate behind wizard — every Discover visit starts here. After complete or
  // skip, the wizard hides and the swipe deck below renders.
  if (showWizard) {
    return (
      <WizardScreen
        onComplete={() => setShowWizard(false)}
        onSkip={() => setShowWizard(false)}
      />
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

      {/* Absolute container spans full available area; cardStyle centers the card.
          `key` is tied to deck identity (length + first id) so background
          refetches that don't actually change the deck don't remount Swiper
          (which would reset swipe progress). */}
      <Swiper
        key={`${cafes.length}-${cafes[0]?.id ?? 'empty'}`}
        ref={swiperRef}
        cards={cafes}
        renderCard={renderCard}
        onSwipedRight={handleSwipedRight}
        onSwipedAll={handleSwipedAll}
        cardIndex={0}
        backgroundColor="transparent"
        // stackSize=2 + no opacity animation: empirically prevents the
        // last-card blank bug in react-native-deck-swiper. With stackSize=3
        // and animateCardOpacity enabled, the final card was rendering
        // transparent because the lib expects 3 cards to compute fade.
        stackSize={2}
        stackSeparation={12}
        stackScale={4}
        animateOverlayLabelsOpacity
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
  emptyTitle: { fontSize: 24, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 21,
  },
  emptyActions: {
    width: '100%',
    maxWidth: 280,
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  emptyPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyPrimaryBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  emptySecondaryBtn: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  emptySecondaryBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});

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
import { fetchCafes, fetchPromotedCafes } from '../services/api';
import { MOCK_CAFES } from '../data/mockCafes';

import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';
import Toast from '../components/Toast';

const { width, height } = Dimensions.get('window');
const CARD_W = width * 0.85;

// Fetch a wide pool from the backend (so the user can later expand the radius
// from Discover without a refetch), but apply the wizard's chosen radius
// strictly on the client so the deck mirrors what Discover will show.
const FETCH_RADIUS_KM = 50;

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
  const [loading, setLoading] = useState(true);

  // Fix 1: Calculate available height for card centering
  const HEADER_H = insets.top + 72; // status bar + header row
  const BOTTOM_H = insets.bottom + 72; // FAB + bottom safe area
  const availableH = height - HEADER_H - BOTTOM_H;
  const CARD_H = Math.min(availableH * 0.88, height * 0.68);

  // Position cards exactly in center of available area
  const cardTop = Math.max(0, (availableH - CARD_H) / 2);
  const cardLeft = (width - CARD_W) / 2;

  useEffect(() => {
    loadCafes();
  }, []);

  const loadCafes = async () => {
    setLoading(true);
    try {
      const lat = preferences?.location?.latitude ?? latitude;
      const lng = preferences?.location?.longitude ?? longitude;
      const wizardRadius = preferences?.radius ?? 2;

      // Fetch a wide pool so the radius filter is applied client-side and
      // matches what Discover will compute.
      const [allCafesRaw, promotedRaw] = await Promise.allSettled([
        fetchCafes(lat, lng, FETCH_RADIUS_KM),
        fetchPromotedCafes(undefined, lat, lng),
      ]);

      let allCafes = allCafesRaw.status === 'fulfilled' ? allCafesRaw.value : [];
      const promotedCafes = promotedRaw.status === 'fulfilled' ? promotedRaw.value : [];

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

      // Map wizard Purpose → purpose_slug used in backend cafe_purpose_tags
      const PURPOSE_SLUG_MAP: Record<string, string> = {
        'Me Time': 'me-time',
        'Date': 'date',
        'Family Time': 'family',
        'Group Study': 'group-work',
        'WFC': 'wfc',
      };

      const wizardPurpose = preferences?.purpose;
      const wantedSlug = wizardPurpose ? PURPOSE_SLUG_MAP[wizardPurpose] : null;
      const wizardAmenities = preferences?.amenities ?? [];

      // Robust amenity matcher: handles label, raw key, and synonyms.
      // Returns true if `cafe` exposes the wizard amenity in any form.
      const AMENITY_KEY_MAP: Record<string, string[]> = {
        'WiFi': ['wifi', 'strong_wifi', 'internet'],
        'Power Outlet': ['power_outlet', 'power_outlets', 'outlet'],
        'Mushola': ['mushola', 'prayer_room'],
        'Parking': ['parking'],
        'Kid-Friendly': ['kid_friendly', 'family_friendly', 'noise_tolerant'],
        'Quiet Atmosphere': ['quiet_atmosphere', 'quiet'],
        'Large Tables': ['large_tables', 'spacious'],
        'Outdoor Area': ['outdoor_area', 'outdoor_seating', 'outdoor'],
      };
      const cafeHasAmenity = (cafe: Cafe, amenity: string): boolean => {
        const facLabels = (cafe.facilities ?? []) as any[];
        if (facLabels.includes(amenity)) return true;
        const keys = AMENITY_KEY_MAP[amenity] ?? [
          amenity.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        ];
        const detected = (cafe.detectedFacilities ?? []).map((d: string) =>
          String(d).toLowerCase(),
        );
        return keys.some((k) => detected.includes(k));
      };

      // Same filter pipeline used by MapScreen — keeps Discover and CardSwipe in sync.
      // ALL selected amenities + the chosen purpose must match (AND semantics).
      const applyWizardFilter = (list: Cafe[], enforceRadius: boolean): Cafe[] => {
        let result = list;
        if (enforceRadius) {
          result = result.filter((c) => (c.distance ?? 0) <= wizardRadius);
        }
        if (wantedSlug) {
          result = result.filter((c) => {
            const byScore = (c.purposeScores?.[wantedSlug] || 0) >= 40;
            const byName = (c.purposes ?? []).includes(wizardPurpose!);
            return byScore || byName;
          });
        } else if (preferences?.purpose) {
          result = result.filter((c) => (c.purposes ?? []).includes(preferences.purpose!));
        }
        if (wizardAmenities.length > 0) {
          // AND: every selected amenity must be present on the cafe
          result = result.filter((c) => wizardAmenities.every((a) => cafeHasAmenity(c, a)));
        }
        return result;
      };

      // Rank
      const scoreCafe = (c: Cafe) => {
        let score = c.matchScore || 0;
        if (wantedSlug && c.purposeScores?.[wantedSlug] != null) {
          score = c.purposeScores[wantedSlug];
        }
        return score;
      };

      let filtered = applyWizardFilter(allCafes, true);
      filtered.sort((a, b) => scoreCafe(b) - scoreCafe(a));

      // Top 5 regular (non-promo) cafes within the wizard radius
      const regular = filtered.filter((c) => !c.promotionType).slice(0, 5);

      // Promo cards: also scoped to the user's radius so the next card after a
      // swipe-right always exists. Promos that fall outside the radius are skipped.
      const promosInRadius = promotedCafes.filter(
        (c) => (c.distance ?? 0) <= wizardRadius,
      );
      const promoA = promosInRadius.find(
        (c) => c.promotionType === 'A' || c.activePromotionType === 'new_cafe',
      );
      const promoB = promosInRadius.find(
        (c) => c.promotionType === 'B' || c.activePromotionType === 'featured_promo',
      );

      // Build deck: start with regular cards in radius
      let deck: Cafe[] = [...regular];

      // Insert real promos at random middle positions (only if they fit in radius)
      const realPromos: Cafe[] = [];
      if (promoA) realPromos.push(promoA);
      if (promoB) realPromos.push(promoB);

      if (realPromos.length > 0) {
        const usedPositions = new Set<number>();
        for (const promo of realPromos) {
          if (deck.find((d) => d.id === promo.id)) continue; // dedupe
          const max = Math.max(1, deck.length);
          let pos = 1 + Math.floor(Math.random() * max);
          let safety = 0;
          while (usedPositions.has(pos) && safety < 10) {
            pos = 1 + Math.floor(Math.random() * max);
            safety++;
          }
          usedPositions.add(pos);
          deck.splice(pos, 0, promo);
        }
      }

      // Dedupe by id (defensive — promos sometimes overlap with regular pool)
      const seen = new Set<string>();
      deck = deck.filter((c) => {
        const id = String(c.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      // Final fallback: if filters wiped everything, relax radius and show
      // top-ranked anywhere (Discover will display the same wider set).
      if (deck.length === 0) {
        const relaxed = applyWizardFilter(allCafes, false);
        relaxed.sort((a, b) => scoreCafe(b) - scoreCafe(a));
        deck = relaxed.slice(0, 5);
      }

      setCafes(deck.length > 0 ? deck : MOCK_CAFES.slice(0, 5));
    } catch {
      setCafes(MOCK_CAFES.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  const handleSwipedRight = (cardIndex: number) => {
    const cafe = cafes[cardIndex];
    if (!cafe) return;
    // Promo cafes from the backend have real IDs, but skip-on-error so the
    // swiper never gets stuck if shortlist insert throws.
    try {
      if (!isInShortlist(cafe.id)) {
        addToShortlist(cafe);
        setToastMsg(`Added "${cafe.name}" to Shortlist!`);
        setShowToast(true);
      }
    } catch {
      // ignore — let the swiper continue to the next card
    }
  };

  const handleSwipedAll = () => {
    if (allSwiped) return; // guard against double-fire
    setAllSwiped(true);
    setTimeout(() => {
      navigation.replace('MainTabs');
    }, 1200);
  };

  const openShortlist = () => navigation.navigate('ShortlistModal');

  // Fix 2: Card with correctly stacked bottom overlay
  const renderCard = (cafe: Cafe) => {
    // Render a neutral placeholder instead of null when the swiper queries an
    // out-of-bounds slot — returning null causes a blank, "stuck" card.
    if (!cafe) {
      return (
        <View
          style={[
            styles.card,
            { width: CARD_W, height: CARD_H, justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>End of deck</Text>
        </View>
      );
    }
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
              {/* Grand opening offer banner — amber strip. Falls back to a
                  generic opening-period CTA when the owner hasn't filled one in. */}
              <View style={styles.newCafeOfferBanner}>
                <Text style={styles.newCafeOfferText} numberOfLines={2}>
                  🎉 {newCafe?.promoOffer || 'Grand Opening — Buy 1 Get 1 during opening period!'}
                </Text>
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cafeName} numberOfLines={1}>{cafe.name}</Text>
                {/* Always show distance + opening info on new-cafe cards */}
                <Text style={styles.cafeDistance}>
                  {cafe.distance != null ? `${cafe.distance} km away` : ''}
                  {newCafe?.openingSince ? `  ·  ✨ Open since ${newCafe.openingSince}` : ''}
                </Text>
                {/* Highlight text: explicit highlightText, then promoOffer fallback */}
                {(newCafe?.highlightText || (!newCafe?.promoOffer && 'Newly opened cafe — give them a try!')) && (
                  <Text style={styles.openingSince} numberOfLines={2}>
                    🌟 {newCafe?.highlightText || 'Newly opened cafe — give them a try!'}
                  </Text>
                )}
                {/* Keunggulan pills row */}
                {newCafe?.keunggulan && newCafe.keunggulan.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {newCafe.keunggulan.slice(0, 3).map((k) => (
                      <View key={k} style={styles.keunggulanPill}>
                        <Text style={styles.keunggulanPillText}>{k}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
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
        stackSize={Math.min(3, Math.max(1, cafes.length))}
        infinite={false}
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

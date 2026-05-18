import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import SwipeableCard from '../components/SwipeableCard';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useShortlist } from '../context/ShortlistContext';
import { usePreferences } from '../context/PreferencesContext';
import { useLocation } from '../context/LocationContext';
import { useDiscoverDeck } from '../queries/cafes/use-discover-deck';
import { usePurposeId } from '../queries/purposes/use-purpose-id';
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';
import Toast from '../components/Toast';
import { buildFacilityChips } from '../utils/facilities';

const { width, height } = Dimensions.get('window');
const CARD_W = width * 0.85;

export default function CardSwipeScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addToShortlist, isInShortlist } = useShortlist();
  const { preferences } = usePreferences();
  const { latitude, longitude } = useLocation();
  const purposeId = usePurposeId(preferences?.purpose);
  const isStandalone = route.name === 'CardSwipe';

  const [allSwiped, setAllSwiped] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [sessionId, setSessionId] = useState(0);
  const [index, setIndex] = useState(0);

  const [showWizard, setShowWizard] = useState(!isStandalone);
  useFocusEffect(
    useCallback(() => {
      if (!isStandalone) setShowWizard(true);
    }, [isStandalone]),
  );

  const dismissWizard = useCallback(() => {
    setShowWizard(false);
    setAllSwiped(false);
    setIndex(0);
    setSessionId((s) => s + 1);
  }, []);

  const HEADER_H = insets.top + 72;
  const BOTTOM_H = insets.bottom + 72;
  const availableH = height - HEADER_H - BOTTOM_H;
  const CARD_H = Math.min(availableH * 0.88, height * 0.68);
  const cardTop = Math.max(0, (availableH - CARD_H) / 2);
  const cardLeft = (width - CARD_W) / 2;

  const lat = preferences?.location?.latitude ?? latitude;
  const lng = preferences?.location?.longitude ?? longitude;
  const radKm = preferences?.radius ?? 2;

  const priceRangeParam = (['$', '$$', '$$$'] as const).includes(
    preferences?.priceRange as any,
  )
    ? (preferences?.priceRange as '$' | '$$' | '$$$')
    : undefined;

  const purposeReady = preferences?.purpose == null || purposeId != null;

  const deckQuery = useDiscoverDeck(
    {
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      radius: Math.min(radKm * 1000, 50_000_000),
      purposeId,
      facilities:
        preferences?.amenities && preferences.amenities.length > 0
          ? preferences.amenities
          : undefined,
      priceRange: priceRangeParam,
      limit: 7,
    },
    { enabled: purposeReady },
  );

  const cafes: Cafe[] = useMemo(() => {
    const raw = deckQuery.data?.data ?? [];
    return raw.filter((c) => !isInShortlist(c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckQuery.data]);
  const loading = deckQuery.isPending || deckQuery.isFetching;

  useEffect(() => {
    const upcoming = cafes.slice(index, index + 3);
    upcoming.forEach((cafe) => {
      const url =
        cafe.promotionContent?.promoPhoto ||
        cafe.newCafeContent?.promoPhoto ||
        cafe.photos?.[0];
      if (url) Image.prefetch(url);
    });
  }, [cafes, index]);

  const isInShortlistRef = useRef(isInShortlist);
  isInShortlistRef.current = isInShortlist;
  const addToShortlistRef = useRef(addToShortlist);
  addToShortlistRef.current = addToShortlist;
  const cafesRef = useRef(cafes);
  cafesRef.current = cafes;
  const userRef = useRef(user);
  userRef.current = user;

  const promptLoginRef = useRef<() => void>(() => {});
  promptLoginRef.current = () => navigation.navigate('AuthModal');

  const heartNativeGesture = useMemo(() => Gesture.Native(), []);

  useFocusEffect(
    useCallback(() => {
      setAllSwiped(false);
    }, []),
  );

  const indexRef = useRef(0);
  indexRef.current = index;

  const advanceIndex = useCallback((dir: 'left' | 'right') => {
    const i = indexRef.current;
    const cafe = cafesRef.current[i];
    if (dir === 'right' && cafe && !isInShortlistRef.current(cafe.id)) {
      if (!userRef.current) {
        promptLoginRef.current();
      } else {
        addToShortlistRef.current(cafe);
        setToastMsg(`Added "${cafe.name}" to Shortlist!`);
        setShowToast(true);
      }
    }
    const next = i + 1;
    const total = cafesRef.current.length;
    if (next >= total) {
      setAllSwiped(true);
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Explore' } }],
        });
      }, 1200);
    }
    setIndex(next);
  }, [navigation]);

  const handleTapCard = useCallback(() => {
    const cafe = cafesRef.current[indexRef.current];
    if (cafe) navigation.navigate('CafeDetail', { cafe });
  }, [navigation]);

  const openShortlist = () => navigation.navigate('ShortlistModal');

  const renderCard = useCallback((cafe: Cafe) => {
    if (!cafe) return <View />;
    const saved = isInShortlistRef.current(cafe.id);
    const isTypeA = cafe.promotionType === 'A' || cafe.activePromotionType === 'new_cafe';
    const isTypeB = cafe.promotionType === 'B' || cafe.activePromotionType === 'featured_promo';

    const bgPhoto =
      (isTypeB && (cafe.promotionContent?.promoPhoto || cafe.promoPhoto)) ||
      (isTypeA && cafe.newCafeContent?.promoPhoto) ||
      cafe.photos?.[0] ||
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';

    const promoContent = cafe.promotionContent;
    const newCafe = cafe.newCafeContent;

    return (
      <View
        style={[
          styles.card,
          { width: CARD_W, height: CARD_H },
          isTypeA && styles.cardTypeA,
          isTypeB && styles.cardTypeB,
        ]}
      >
        <Image source={{ uri: bgPhoto }} style={styles.cardImage} />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.4, 1]}
          style={[styles.gradient, (isTypeA || isTypeB) && styles.gradientPromo]}
        />

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

        {cafe.matchScore != null && !isTypeA && !isTypeB && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{cafe.matchScore}%</Text>
            <Text style={styles.matchLabel}>Match</Text>
          </View>
        )}

        {(isTypeA || isTypeB) && (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceBadgeText}>{cafe.distance} km</Text>
          </View>
        )}

        <GestureDetector gesture={heartNativeGesture}>
          <TouchableOpacity
            style={[
              styles.heartBtn,
              saved && styles.heartBtnActive,
              (isTypeA || isTypeB) && styles.heartBtnPromo,
            ]}
            onPress={() => {
              if (!userRef.current) {
                promptLoginRef.current();
                return;
              }
              addToShortlistRef.current(cafe);
              setToastMsg(`Added "${cafe.name}" to Shortlist!`);
              setShowToast(true);
            }}
          >
            <Text style={styles.heartIcon}>{saved ? '★' : '☆'}</Text>
          </TouchableOpacity>
        </GestureDetector>

        <View style={styles.cardBottom}>
          {isTypeA && (
            <>
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
                {newCafe?.keunggulan && newCafe.keunggulan.length > 0 && (
                  <View style={styles.tagsRow}>
                    {newCafe.keunggulan.slice(0, 3).map((k) => (
                      <View key={k} style={styles.keunggulanPill}>
                        <Text style={styles.keunggulanPillText}>{k}</Text>
                      </View>
                    ))}
                  </View>
                )}
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
                {buildFacilityChips(cafe).slice(0, 2).map((f) => (
                  <View key={f.key} style={styles.tag}>
                    <Text style={styles.tagText}>{f.icon} {f.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }, []);

  const goExplore = () =>
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Explore' } }],
    });

  if (showWizard) {
    return (
      <WizardScreen
        onComplete={dismissWizard}
        onSkip={dismissWizard}
      />
    );
  }

  if (allSwiped) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🗺️</Text>
        <Text style={styles.emptyTitle}>No match?</Text>
        <Text style={styles.emptySubtitle}>Let's explore the map!</Text>
      </View>
    );
  }

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
            onPress={() => deckQuery.refetch()}
          >
            <Text style={styles.emptySecondaryBtnText}>↻ Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>
          Cafe<Text style={{ color: colors.accent }}>Match</Text>
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          top: HEADER_H,
          left: 0,
          right: 0,
          bottom: BOTTOM_H,
        }}
      >
        {cafes[index + 1] && (
          <View
            style={{
              position: 'absolute',
              top: cardTop,
              left: cardLeft,
              width: CARD_W,
              height: CARD_H,
            }}
            pointerEvents="none"
          >
            {renderCard(cafes[index + 1])}
          </View>
        )}

        {cafes[index] && (
          <SwipeableCard
            key={`${sessionId}-${index}`}
            top={cardTop}
            left={cardLeft}
            width={CARD_W}
            height={CARD_H}
            onSwipeComplete={advanceIndex}
            onTap={handleTapCard}
            tapFailGesture={heartNativeGesture}
          >
            {renderCard(cafes[index])}
          </SwipeableCard>
        )}
      </View>

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

  cardStackBehind: {
    position: 'absolute',
  },
});

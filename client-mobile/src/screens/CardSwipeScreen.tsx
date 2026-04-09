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
};
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
      const rad = preferences?.radius ?? 2;

      // Fetch regular cafes and promoted cafes in parallel
      const [allCafesRaw, promotedRaw] = await Promise.allSettled([
        fetchCafes(lat, lng, rad),
        fetchPromotedCafes(),
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

      let sorted = [...allCafes].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      if (preferences?.purpose) {
        const filtered = sorted.filter((c) => c.purposes.includes(preferences.purpose!));
        if (filtered.length > 0) sorted = filtered;
      }

      // Top 5 regular (non-promo) cafes
      const regular = sorted.filter((c) => !c.promotionType).slice(0, 5);

      // Exactly 1 Type A + 1 Type B promo card — with fallbacks
      const promoA: Cafe =
        promotedCafes.find((c) => c.promotionType === 'A' || c.activePromotionType === 'new_cafe') ??
        allCafes.find((c) => c.promotionType === 'A') ??
        FALLBACK_PROMO_A;

      const promoB: Cafe =
        promotedCafes.find((c) => c.promotionType === 'B' || c.activePromotionType === 'featured_promo') ??
        allCafes.find((c) => c.promotionType === 'B') ??
        FALLBACK_PROMO_B;

      // Build deck of up to 5 regular cards + insert 2 promos at positions 2 & 4 (middle)
      const deck = regular.length >= 5 ? [...regular] : [...sorted.slice(0, 5)];

      // Insert promo cards at random non-first, non-last positions (indices 1–3 for 5 cards)
      const posA = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
      let posB = 1 + Math.floor(Math.random() * 3);
      while (posB === posA) posB = 1 + Math.floor(Math.random() * 3);

      const insertPositions = [posA, posB].sort((a, b) => a - b);
      deck.splice(insertPositions[0], 0, promoA);
      deck.splice(insertPositions[1] + 1, 0, promoB);

      setCafes(deck.length > 0 ? deck : MOCK_CAFES.slice(0, 5));
    } catch {
      setCafes(MOCK_CAFES.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

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
    const isTypeA = cafe.promotionType === 'A';
    const isTypeB = cafe.promotionType === 'B';
    const bgPhoto = (isTypeB && cafe.promoPhoto) ? cafe.promoPhoto : (cafe.photos?.[0] ?? MOCK_CAFES[0].photos[0]);

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        style={[styles.card, { width: CARD_W, height: CARD_H }, isTypeA && styles.cardTypeA]}
        onPress={() => navigation.navigate('CafeDetail', { cafe })}
      >
        <Image source={{ uri: bgPhoto }} style={styles.cardImage} />

        {/* Fix 2: Taller gradient so stacked text stays readable */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        />

        {/* Promo badge — top right */}
        {(isTypeA || isTypeB) && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>{isTypeA ? 'New' : 'Special Offer'}</Text>
          </View>
        )}

        {/* Match score badge — top right (only non-promo cards) */}
        {cafe.matchScore != null && !isTypeA && !isTypeB && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{cafe.matchScore}%</Text>
            <Text style={styles.matchLabel}>Match</Text>
          </View>
        )}

        {/* Shortlist heart — top left */}
        <TouchableOpacity
          style={[styles.heartBtn, saved && styles.heartBtnActive]}
          onPress={() => {
            addToShortlist(cafe);
            setToastMsg(`Added "${cafe.name}" to Shortlist!`);
            setShowToast(true);
          }}
        >
          <Text style={styles.heartIcon}>{saved ? '★' : '☆'}</Text>
        </TouchableOpacity>

        {/* Fix 2: Single bottom container — promo banner stacks ABOVE cafe info */}
        <View style={styles.cardBottom}>
          {isTypeB && cafe.promoTitle ? (
            <View style={styles.promoBanner}>
              <Text style={styles.promoBannerTitle} numberOfLines={1}>{cafe.promoTitle}</Text>
              {cafe.promoDescription ? (
                <Text style={styles.promoBannerDesc} numberOfLines={2}>{cafe.promoDescription}</Text>
              ) : null}
            </View>
          ) : null}

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

  promoBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 1,
  },
  promoBadgeText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
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

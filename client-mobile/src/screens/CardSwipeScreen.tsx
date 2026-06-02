import React, { useRef, useState, useCallback, useEffect } from 'react';
import WizardScreen from './WizardScreen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import SwipeableCard from '../components/SwipeableCard';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { cafeText, discoverText } from '@shared/i18n/keys';
import { useAuth } from '../context/AuthContext';
import { useShortlist } from '../context/ShortlistContext';
import { usePreferences } from '../context/PreferencesContext';
import { useLocation } from '../context/LocationContext';
import { fetchDiscoverDeck, DiscoverDeckParams } from '../queries/cafes/api';
import { usePurposeId } from '../queries/purposes/use-purpose-id';
import { Cafe } from '../types';
import { spacing, colors } from '../theme';
import { Star, MapPin, Map as MapIcon } from 'lucide-react-native';
import { LucideIcon } from '../utils/lucideIcon';
import Toast from '../components/Toast';
import { buildFacilityChips } from '../utils/facilities';
import { getOpenStatus } from '../utils/openingHours';
import { formatRating } from '../utils/rating';
import { cleanAddress } from '../utils/address';

const VISIBLE_TAGS = 4;
const MAX_CARD_W = 480;
const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

// Infinite-swipe tuning.
const BATCH_SIZE = 10;
const PREFETCH_THRESHOLD = 3; // fetch more when this many (or fewer) cards remain

interface Tier {
  radiusMultiplier: number;
  dropFacilities?: boolean;
  dropPurpose?: boolean;
  dropPrice?: boolean;
  maxRadiusKm?: number;
}

// Fallback tiers — when the current filter set is exhausted, progressively
// widen. Each tier is tried in order; advance only when the current one yields
// no new cafes. Mirrors web DiscoverSwipePage TIERS.
const TIERS: Tier[] = [
  { radiusMultiplier: 1 },
  { radiusMultiplier: 2, maxRadiusKm: 50 },
  { radiusMultiplier: 2, dropFacilities: true, maxRadiusKm: 50 },
  { radiusMultiplier: 3, dropFacilities: true, dropPurpose: true, maxRadiusKm: 75 },
  {
    radiusMultiplier: 4,
    dropFacilities: true,
    dropPurpose: true,
    dropPrice: true,
    maxRadiusKm: 100,
  },
];

export default function CardSwipeScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const headingSize = clamp(width * 0.075, 22, 32);
  const subheadingSize = clamp(width * 0.034, 11, 14);
  const cafeNameSize = clamp(width * 0.07, 22, 30);
  const cafeMetaSize = clamp(width * 0.034, 12, 14);
  const chipTextSize = clamp(width * 0.032, 11, 13);
  const { user } = useAuth();
  const { addToShortlist, isInShortlist } = useShortlist();
  const { preferences, wizardCompleted } = usePreferences();
  const { latitude, longitude } = useLocation();
  const purposeId = usePurposeId(preferences?.purpose);
  const isStandalone = route.name === 'CardSwipe';

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [index, setIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Show the wizard only when onboarding isn't done (no saved prefs). Returning
  // users on the Discover tab go straight to the deck. Mirrors web DiscoverPage.
  const hasPrefs = wizardCompleted && !!preferences;
  const [showWizard, setShowWizard] = useState(!isStandalone && !hasPrefs);
  useFocusEffect(
    useCallback(() => {
      if (!isStandalone && !hasPrefs) setShowWizard(true);
    }, [isStandalone, hasPrefs]),
  );

  const dismissWizard = useCallback(() => {
    // Just close the wizard; the reset effect below re-fetches the deck once
    // showWizard flips false.
    setShowWizard(false);
  }, []);

  const [cardAreaH, setCardAreaH] = useState(0);
  const [cardAreaW, setCardAreaW] = useState(0);
  const CARD_SIDE_GAP = clamp(width * 0.025, 8, 16);
  // Small breathing room so the card doesn't visually merge with the tab bar.
  const CARD_BOTTOM_GAP = spacing.md;
  const CARD_W = Math.min(cardAreaW - CARD_SIDE_GAP * 2, MAX_CARD_W);
  const CARD_H = Math.max(0, cardAreaH - CARD_BOTTOM_GAP);
  const cardTop = 0;
  const cardLeft = Math.max(CARD_SIDE_GAP, (cardAreaW - CARD_W) / 2);

  const lat = preferences?.location?.latitude ?? latitude;
  const lng = preferences?.location?.longitude ?? longitude;
  const baseRadiusKm = preferences?.radius ?? 5;

  const priceRange =
    (preferences?.priceRange as '$' | '$$' | '$$$' | undefined) || undefined;
  const facilitiesArr =
    preferences?.amenities && preferences.amenities.length > 0
      ? preferences.amenities
      : undefined;
  const facilitiesKey = facilitiesArr ? facilitiesArr.join(',') : '';

  const purposeReady = preferences?.purpose == null || purposeId != null;

  // ── Refs read inside stable callbacks (avoid stale closures) ──
  const isInShortlistRef = useRef(isInShortlist);
  isInShortlistRef.current = isInShortlist;
  const addToShortlistRef = useRef(addToShortlist);
  addToShortlistRef.current = addToShortlist;
  const cafesRef = useRef(cafes);
  cafesRef.current = cafes;
  const userRef = useRef(user);
  userRef.current = user;
  const indexRef = useRef(0);
  indexRef.current = index;

  // Infinite-deck bookkeeping.
  const seenIdsRef = useRef<Set<number>>(new Set());
  const tierRef = useRef(0);
  const exhaustedRef = useRef(false);
  const fetchingRef = useRef(false);
  // Latest query inputs — read inside the stable fetchMore (no stale closure).
  const paramsRef = useRef({
    lat,
    lng,
    baseRadiusKm,
    purposeId,
    priceRange,
    facilitiesArr,
  });
  paramsRef.current = {
    lat,
    lng,
    baseRadiusKm,
    purposeId,
    priceRange,
    facilitiesArr,
  };

  // Fetch the next batch, walking the fallback tiers until one yields new cafes
  // (or every tier is dry → exhausted). Accumulates into the deck; the server
  // ranks each batch by feature-match + distance, so no client re-rank needed.
  const fetchMore = useCallback(async () => {
    if (fetchingRef.current || exhaustedRef.current) return;
    const p = paramsRef.current;
    if (p.lat == null || p.lng == null) return;
    fetchingRef.current = true;

    let appended = 0;
    while (tierRef.current < TIERS.length && appended === 0) {
      const tier = TIERS[tierRef.current];
      const effectiveRadiusKm = Math.min(
        p.baseRadiusKm * tier.radiusMultiplier,
        tier.maxRadiusKm ?? p.baseRadiusKm * tier.radiusMultiplier,
      );
      const params: DiscoverDeckParams = {
        lat: p.lat,
        lng: p.lng,
        radius: effectiveRadiusKm * 1000,
        limit: BATCH_SIZE,
        excludeIds: Array.from(seenIdsRef.current),
      };
      if (!tier.dropPurpose && p.purposeId != null)
        params.purposeId = p.purposeId;
      if (!tier.dropFacilities && p.facilitiesArr && p.facilitiesArr.length > 0)
        params.facilities = p.facilitiesArr;
      if (!tier.dropPrice && p.priceRange) params.priceRange = p.priceRange;

      try {
        const res = await fetchDiscoverDeck(params);
        const fresh = res.data.filter(
          (c) => !seenIdsRef.current.has(Number(c.id)),
        );
        if (fresh.length > 0) {
          fresh.forEach((c) => seenIdsRef.current.add(Number(c.id)));
          setCafes((prev) => [...prev, ...fresh]);
          appended += fresh.length;
        } else {
          tierRef.current += 1;
        }
      } catch {
        tierRef.current += 1;
      }
    }

    if (appended === 0 && tierRef.current >= TIERS.length) {
      exhaustedRef.current = true;
      setExhausted(true);
    }
    fetchingRef.current = false;
  }, []);

  // Reset + initial fetch whenever the query signature changes (or the wizard
  // closes). Refs are reset so a fresh deck is built from tier 0.
  useEffect(() => {
    if (showWizard) return;
    if (!purposeReady) return;
    if (lat == null || lng == null) return;
    seenIdsRef.current = new Set();
    tierRef.current = 0;
    exhaustedRef.current = false;
    setExhausted(false);
    setCafes([]);
    setIndex(0);
    fetchMore();
  }, [
    showWizard,
    purposeReady,
    lat,
    lng,
    baseRadiusKm,
    purposeId,
    priceRange,
    facilitiesKey,
    fetchMore,
  ]);

  // Prefetch upcoming card images + fetch more when the deck runs low.
  useEffect(() => {
    if (showWizard) return;
    const upcoming = cafes.slice(index, index + 3);
    upcoming.forEach((cafe) => {
      const url = cafe.photos?.[0];
      if (url) Image.prefetch(url);
    });
    if (cafes.length > 0 && cafes.length - index <= PREFETCH_THRESHOLD) {
      fetchMore();
    }
  }, [cafes, index, showWizard, fetchMore]);

  // Truly exhausted and swiped past the last card → bounce to Explore (only
  // when there were cards; zero-result decks show the manual empty state).
  useEffect(() => {
    if (showWizard) return;
    if (exhausted && cafes.length > 0 && index >= cafes.length) {
      const tmr = setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Explore' } }],
        });
      }, 1200);
      return () => clearTimeout(tmr);
    }
  }, [exhausted, cafes.length, index, showWizard, navigation]);

  const advanceIndex = useCallback(
    (dir: 'left' | 'right') => {
      const i = indexRef.current;
      const cafe = cafesRef.current[i];
      if (dir === 'right' && cafe && !isInShortlistRef.current(cafe.id)) {
        if (!userRef.current) {
          navigation.navigate('AuthModal');
        } else {
          addToShortlistRef.current(cafe);
          setToastMsg(t(discoverText.addedToShortlistToast, { name: cafe.name }));
          setShowToast(true);
        }
      }
      setIndex(i + 1);
    },
    [navigation, t],
  );

  const handleTapCard = useCallback(() => {
    const cafe = cafesRef.current[indexRef.current];
    if (cafe) navigation.navigate('CafeDetail', { cafe });
  }, [navigation]);

  const renderCard = useCallback(
    (cafe: Cafe) => {
      if (!cafe) return <View />;
      const bgPhoto =
        cafe.photos?.[0] ||
        'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';
      const open = getOpenStatus(cafe.openingHours);
      const locality = cleanAddress(cafe.district || cafe.city || '');
      const distanceKm =
        cafe.distanceMeters != null
          ? (cafe.distanceMeters / 1000).toFixed(1)
          : cafe.distance != null
            ? cafe.distance.toFixed(1)
            : null;
      const rating = formatRating(cafe.googleRating);
      const shortlisted = isInShortlistRef.current(cafe.id);
      const allTags = cafe.chips ?? buildFacilityChips(cafe);
      const visibleTags = allTags.slice(0, VISIBLE_TAGS);
      const extra = allTags.length - visibleTags.length;
      const metaParts: string[] = [];
      if (locality) metaParts.push(`📍 ${locality}`);
      if (open?.isOpen && open.closesAt) metaParts.push(t(discoverText.openUntilTime, { time: open.closesAt }));
      if (cafe.priceRange) metaParts.push(cafe.priceRange);

      return (
        <View style={[styles.card, { width: CARD_W, height: CARD_H }]}>
          <Image
            source={{ uri: bgPhoto }}
            style={styles.cardImage}
            cachePolicy="memory-disk"
            transition={200}
            contentFit="cover"
          />

          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent']}
            locations={[0, 0.22]}
            style={styles.gradTop}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.92)']}
            locations={[0, 1]}
            style={styles.gradBottom}
          />

          <View style={styles.topChipsCol}>
            <View style={styles.topChipsRow}>
              {rating && (
                <View style={styles.ratingPill}>
                  <Star size={11} color="#F59E0B" fill="#F59E0B" strokeWidth={0} style={styles.ratingStarIcon} />
                  <Text style={styles.ratingNum}>{rating}</Text>
                  {cafe.totalGoogleReviews != null && (
                    <Text style={styles.ratingCount}>
                      {' '}
                      ({cafe.totalGoogleReviews.toLocaleString()})
                    </Text>
                  )}
                </View>
              )}
              {open && (
                <View style={styles.openPill}>
                  <View
                    style={[
                      styles.openDot,
                      { backgroundColor: open.isOpen ? '#34d399' : '#ef4444' },
                    ]}
                  />
                  <Text style={styles.openText}>
                    {open.isOpen ? t(cafeText.open) : t(cafeText.closed)}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              {distanceKm && (
                <View style={styles.distancePill}>
                  <MapPin size={11} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.distanceText}>{distanceKm} km</Text>
                </View>
              )}
            </View>
            {shortlisted && (
              <View style={styles.shortlistedBadge}>
                <Text style={styles.shortlistedText}>{t(discoverText.alreadyInShortlist)}</Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.cardBottom,
              { paddingHorizontal: isCompact ? 14 : 18 },
            ]}
          >
            <Text
              style={[
                styles.cafeName,
                { fontSize: cafeNameSize, lineHeight: cafeNameSize + 2 },
              ]}
              numberOfLines={2}
            >
              {cafe.name}
            </Text>
            {metaParts.length > 0 && (
              <Text
                style={[styles.cafeMeta, { fontSize: cafeMetaSize }]}
                numberOfLines={1}
              >
                {metaParts.join('  ·  ')}
              </Text>
            )}
            <View style={styles.chipsRow}>
              {visibleTags.map((tag) => (
                <View key={tag.key} style={styles.tagChip}>
                  {tag.lucideName && (
                    <LucideIcon
                      name={tag.lucideName}
                      size={chipTextSize - 1}
                      color="#FFFFFF"
                      strokeWidth={2}
                    />
                  )}
                  <Text
                    style={[styles.tagChipText, { fontSize: chipTextSize }]}
                  >
                    {tag.label}
                  </Text>
                </View>
              ))}
              {extra > 0 && (
                <View style={styles.extraChip}>
                  <Text
                    style={[styles.extraChipText, { fontSize: chipTextSize }]}
                  >
                    +{extra}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      );
    },
    [CARD_W, CARD_H, isCompact, cafeNameSize, cafeMetaSize, chipTextSize, t],
  );

  const goExplore = () =>
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Explore' } }],
    });

  if (showWizard) {
    return (
      <WizardScreen onComplete={dismissWizard} onSkip={dismissWizard} />
    );
  }

  // Spinner during initial load AND when the user has swiped past the loaded
  // deck while the next batch is still in flight (not yet exhausted).
  if (!exhausted && index >= cafes.length) {
    return (
      <View style={styles.bgWrap}>
        <View style={styles.fullCentered}>
          <ActivityIndicator
            size="large"
            color="#b85d04"
            style={{ marginBottom: spacing.md }}
          />
          <Text style={styles.fullCenteredTitle}>{t(discoverText.searchingCafes)}</Text>
        </View>
      </View>
    );
  }

  // Exhausted and swiped past the last card (covers both zero-result decks and
  // fully-swiped decks; the auto-navigate effect bounces to Explore shortly).
  if (exhausted && index >= cafes.length) {
    return (
      <View style={styles.bgWrap}>
        <View style={styles.fullCentered}>
          <MapIcon size={64} color={colors.textSecondary} strokeWidth={1.5} style={styles.emptyIconLead} />
          <Text style={styles.fullCenteredTitle}>{t(discoverText.allSeenTitle)}</Text>
          <Text style={styles.fullCenteredSubtitle}>
            {t(discoverText.allSeenSubtitle)}
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={goExplore}>
            <Text style={styles.emptyBtnText}>{t(discoverText.openExplore)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bgWrap}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text
          style={[
            styles.heading,
            { fontSize: headingSize, lineHeight: headingSize + 2 },
          ]}
        >
          {t(discoverText.headingBefore)}
          <Text style={[styles.headingAccent, { fontSize: headingSize }]}>
            {t(discoverText.headingAccent)}
          </Text>
          {t(discoverText.headingSuffix)}
        </Text>
        <Text style={[styles.subheading, { fontSize: subheadingSize }]}>
          {t(discoverText.subheading)}
        </Text>
      </View>

      <View
        style={{ flex: 1, position: 'relative' }}
        onLayout={(e) => {
          setCardAreaH(e.nativeEvent.layout.height);
          setCardAreaW(e.nativeEvent.layout.width);
        }}
      >
        {cafes[index + 1] && CARD_H > 0 && (
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
        {cafes[index] && CARD_H > 0 && (
          <SwipeableCard
            key={index}
            top={cardTop}
            left={cardLeft}
            width={CARD_W}
            height={CARD_H}
            onSwipeComplete={advanceIndex}
            onTap={handleTapCard}
            leftLabel={t(discoverText.swipeLeft)}
            rightLabel={t(discoverText.swipeRight)}
          >
            {renderCard(cafes[index])}
          </SwipeableCard>
        )}

      </View>

      <Toast
        message={toastMsg}
        visible={showToast}
        onHide={() => setShowToast(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bgWrap: {
    flex: 1,
    backgroundColor: '#f6efe2',
  },
  fullCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  fullCenteredTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1410',
    textAlign: 'center',
  },
  fullCenteredSubtitle: {
    fontSize: 15,
    color: '#8a7a66',
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 21,
  },
  emptyIconLead: { marginBottom: spacing.md },
  emptyBtn: {
    marginTop: spacing.xl,
    backgroundColor: '#d97706',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  emptyBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },

  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1a1410',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  headingAccent: {
    color: '#b85d04',
    fontStyle: 'italic',
  },
  subheading: {
    fontSize: 13,
    color: '#8a7a66',
    marginTop: 6,
  },

  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#2a2018',
  },
  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: 'cover',
  },
  gradTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '25%',
  },
  gradBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },

  topChipsCol: {
    position: 'absolute',
    top: 26,
    left: 12,
    right: 12,
    zIndex: 4,
    gap: 8,
  },
  topChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingStarIcon: { marginRight: 4 },
  ratingNum: { color: '#1a1410', fontSize: 12, fontWeight: '800' },
  ratingCount: { color: '#8a7a66', fontSize: 12, fontWeight: '600' },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,14,10,0.65)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: 6,
  },
  openDot: { width: 7, height: 7, borderRadius: 4 },
  openText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20,14,10,0.65)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  distanceText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  shortlistedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#d97706',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  shortlistedText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  cardBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    paddingHorizontal: 18,
  },
  cafeName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 30,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 8,
  },
  cafeMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.86)',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20,14,10,0.55)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  tagChipText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  extraChip: {
    backgroundColor: 'rgba(217,119,6,0.85)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  extraChipText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },

});

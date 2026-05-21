import React, { useRef, useState, useCallback, useEffect } from 'react';
import WizardScreen from './WizardScreen';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
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
import { fetchDiscoverDeck } from '../queries/cafes/api';
import { usePurposeId } from '../queries/purposes/use-purpose-id';
import { Cafe } from '../types';
import { spacing } from '../theme';
import Toast from '../components/Toast';
import { buildFacilityChips } from '../utils/facilities';
import { getOpenStatus } from '../utils/openingHours';
import { formatRating } from '../utils/rating';
import { cleanAddress } from '../utils/address';

const VISIBLE_TAGS = 4;
const MAX_CARD_W = 480;
const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

export default function CardSwipeScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = width < 360;
  const headingSize = clamp(width * 0.075, 22, 32);
  const subheadingSize = clamp(width * 0.034, 11, 14);
  const cafeNameSize = clamp(width * 0.07, 22, 30);
  const cafeMetaSize = clamp(width * 0.034, 12, 14);
  const chipTextSize = clamp(width * 0.032, 11, 13);
  const fabSize = clamp(width * 0.12, 40, 52);
  const { user } = useAuth();
  const { addToShortlist, isInShortlist, shortlist } = useShortlist();
  const { preferences } = usePreferences();
  const { latitude, longitude } = useLocation();
  const purposeId = usePurposeId(preferences?.purpose);
  const isStandalone = route.name === 'CardSwipe';

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [allSwiped, setAllSwiped] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

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
  }, []);

  const [cardAreaH, setCardAreaH] = useState(0);
  const [cardAreaW, setCardAreaW] = useState(0);
  const CARD_SIDE_GAP = clamp(width * 0.025, 8, 16);
  const CARD_FAB_GAP = spacing.lg;
  const BOTTOM_RESERVE = fabSize + insets.bottom + spacing.md + CARD_FAB_GAP;
  const CARD_W = Math.min(cardAreaW - CARD_SIDE_GAP * 2, MAX_CARD_W);
  const CARD_H = Math.max(0, cardAreaH - BOTTOM_RESERVE);
  const cardTop = 0;
  const cardLeft = Math.max(CARD_SIDE_GAP, (cardAreaW - CARD_W) / 2);

  const lat = preferences?.location?.latitude ?? latitude;
  const lng = preferences?.location?.longitude ?? longitude;
  const radiusMeters =
    preferences?.radius != null ? preferences.radius * 1000 : 9999 * 1000;

  const priceRange =
    (preferences?.priceRange as '$' | '$$' | '$$$' | undefined) || undefined;
  const facilitiesArr =
    preferences?.amenities && preferences.amenities.length > 0
      ? preferences.amenities
      : undefined;
  const facilitiesKey = facilitiesArr ? facilitiesArr.join(',') : '';

  const purposeReady = preferences?.purpose == null || purposeId != null;

  useEffect(() => {
    if (showWizard) return;
    if (!purposeReady) return;
    if (lat == null || lng == null) return;

    let cancelled = false;
    setLoading(true);
    setCafes([]);
    setIndex(0);
    setAllSwiped(false);

    const base = {
      lat,
      lng,
      radius: radiusMeters,
      limit: 10,
      purposeId,
      priceRange,
    };
    const facilities = facilitiesKey ? facilitiesKey.split(',') : undefined;

    (async () => {
      try {
        let res = await fetchDiscoverDeck({ ...base, facilities });
        if (res.data.length === 0) {
          res = await fetchDiscoverDeck(base);
        }
        if (res.data.length === 0) {
          res = await fetchDiscoverDeck({
            lat,
            lng,
            radius: radiusMeters,
            limit: 10,
          });
        }
        if (!cancelled) setCafes(res.data ?? []);
      } catch {
        if (!cancelled) setCafes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    showWizard,
    purposeReady,
    lat,
    lng,
    radiusMeters,
    purposeId,
    priceRange,
    facilitiesKey,
  ]);

  useEffect(() => {
    const upcoming = cafes.slice(index, index + 3);
    upcoming.forEach((cafe) => {
      const url = cafe.photos?.[0];
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
  const indexRef = useRef(0);
  indexRef.current = index;

  useFocusEffect(
    useCallback(() => {
      setAllSwiped(false);
    }, []),
  );

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
    },
    [navigation],
  );

  const handleTapCard = useCallback(() => {
    const cafe = cafesRef.current[indexRef.current];
    if (cafe) navigation.navigate('CafeDetail', { cafe });
  }, [navigation]);

  const openShortlist = () => navigation.navigate('ShortlistModal');

  const renderCard = useCallback(
    (cafe: Cafe, isCurrent: boolean) => {
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
      const allTags = buildFacilityChips(cafe);
      const visibleTags = allTags.slice(0, VISIBLE_TAGS);
      const extra = allTags.length - visibleTags.length;
      const metaParts: string[] = [];
      if (locality) metaParts.push(`📍 ${locality}`);
      if (open?.isOpen && open.closesAt) metaParts.push(t(discoverText.openUntilTime, { time: open.closesAt }));
      if (cafe.priceRange) metaParts.push(cafe.priceRange);

      return (
        <View style={[styles.card, { width: CARD_W, height: CARD_H }]}>
          <Image source={{ uri: bgPhoto }} style={styles.cardImage} />

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

          {isCurrent && cafesRef.current.length > 0 && (
            <View style={styles.progressRow}>
              {cafesRef.current.map((_, i) => {
                const active = i < indexRef.current;
                const isCur = indexRef.current === i;
                return (
                  <View key={i} style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: active || isCur ? '100%' : '0%',
                          opacity: isCur ? 0.95 : active ? 0.85 : 0,
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.topChipsCol}>
            <View style={styles.topChipsRow}>
              {rating && (
                <View style={styles.ratingPill}>
                  <Text style={styles.ratingStar}>★</Text>
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
                  <Text style={styles.distanceText}>📍 {distanceKm} km</Text>
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
                  <Text
                    style={[styles.tagChipText, { fontSize: chipTextSize }]}
                  >
                    {tag.icon ? `${tag.icon} ${tag.label}` : tag.label}
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

  if (loading) {
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

  if (allSwiped || cafes.length === 0) {
    return (
      <View style={styles.bgWrap}>
        <View style={styles.fullCentered}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
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
            {renderCard(cafes[index + 1], false)}
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
            {renderCard(cafes[index], true)}
          </SwipeableCard>
        )}

      </View>

      <TouchableOpacity
        style={[
          styles.shortlistFab,
          {
            width: fabSize,
            height: fabSize,
            borderRadius: fabSize / 2,
            bottom: insets.bottom + spacing.md,
            right: spacing.md,
          },
        ]}
        onPress={openShortlist}
        activeOpacity={0.85}
      >
        <Text style={[styles.shortlistFabIcon, { fontSize: fabSize * 0.5 }]}>
          ★
        </Text>
        {shortlist.length > 0 && (
          <View style={styles.shortlistFabBadge}>
            <Text style={styles.shortlistFabBadgeText}>{shortlist.length}</Text>
          </View>
        )}
      </TouchableOpacity>

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
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shortlistFab: {
    position: 'absolute',
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 30,
  },
  shortlistFabIcon: { fontSize: 22, color: '#ffffff', fontWeight: '700' },
  shortlistFabBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d97706',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortlistFabBadgeText: { color: '#d97706', fontSize: 11, fontWeight: '800' },
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

  progressRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
    zIndex: 5,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#ffffff',
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
  ratingStar: { color: '#f5b820', fontSize: 12, marginRight: 4 },
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

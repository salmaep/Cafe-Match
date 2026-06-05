import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CafePhoto from '../components/CafePhoto';
import CafeListItem from '../components/cafe/CafeListItem';
import MobileFilterModal from '../components/cafe/MobileFilterModal';
import { getOpenStatus } from '../utils/openingHours';
import { formatDistance } from '../utils/facilities';
import { formatRating } from '../utils/rating';
import { cleanAddress } from '../utils/address';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { cafeText, trendingText } from '@shared/i18n/keys';
import { useLocation } from '../context/LocationContext';
import { useSearchCafes } from '../queries/cafes/use-search-cafes';
import { hitsToCafesCached } from '../queries/cafes/api';
import { usePurposes } from '../queries/purposes/use-purposes';
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';
import {
  Flame, Crown, Star, MapPin, Heart, Bookmark, SlidersHorizontal,
  User, Users, BookOpen, Laptop, Briefcase, Lightbulb, Coffee, Book, Zap,
  PartyPopper, Camera,
} from 'lucide-react-native';
import type { LucideIcon as LucideIconType } from 'lucide-react-native';
import { LucideIcon } from '../utils/lucideIcon';

const SCREEN_W = Dimensions.get('window').width;
// FlashList content padding + winnerWrap 2px border padding (each side)
const WINNER_PHOTO_SIZE = SCREEN_W - spacing.md * 2 - 4;
// Two runners side-by-side with sm gap, inside the same listContent padding
const RUNNER_PHOTO_W = Math.floor((SCREEN_W - spacing.md * 2 - spacing.sm) / 2);
const RUNNER_PHOTO_H = Math.round((RUNNER_PHOTO_W * 3) / 4);

const PURPOSE_SLUG_TO_ICON: Record<string, LucideIconType> = {
  'me-time': User,
  'date': Heart,
  'family': Users,
  'group-work': BookOpen,
  'wfc': Laptop,
  'meeting': Briefcase,
  'brainstorm': Lightbulb,
  'catch-up': Coffee,
  'reading': Book,
  'quick-coffee': Zap,
  'celebration': PartyPopper,
  'photo-spot': Camera,
};
import NativeAdCard from '../components/NativeAdCard';
import { interleaveAds, WithAd } from '../utils/adInterleave';

type ListItem = WithAd<{ cafe: Cafe; rank: number }>;

const ItemSeparator = () => <View style={styles.separator} />;

export default function TrendingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { latitude, longitude } = useLocation();

  // Trending cafes state
  const purposesQuery = usePurposes();
  const purposes = purposesQuery.data ?? [];
  const [purposeId, setPurposeId] = useState<number | null>(null);
  const [facilityKeys, setFacilityKeys] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('');
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount =
    facilityKeys.length + (priceRange ? 1 : 0) + (purposeId != null ? 1 : 0);

  // Mirror web TrendingPage exactly so the two surfaces show the same set of
  // cafes. radius=50_000m (50km), limit=24 per page, sort=trending.
  const cafesQuery = useSearchCafes({
    lat: latitude ?? undefined,
    lng: longitude ?? undefined,
    radius: 50_000,
    purposeId: purposeId ?? undefined,
    priceRange: (priceRange as any) || undefined,
    facilities: facilityKeys.length > 0 ? facilityKeys : undefined,
    limit: 24,
    sort: 'trending',
  });

  // Server (Meilisearch) handles search/filter/sort — purposeId is sent as query param.
  // Memoized so paginated fetches don't rebuild downstream slice/interleave arrays
  // and re-key FlatList rows (which would interrupt scroll on every page append).
  const cafes: Cafe[] = useMemo(
    () =>
      cafesQuery.data
        ? cafesQuery.data.pages.flatMap((p) =>
            hitsToCafesCached(p, latitude ?? undefined, longitude ?? undefined),
          )
        : [],
    [cafesQuery.data, latitude, longitude],
  );

  // Top 3 render as a podium header; ranks 4+ go through ad interleaving.
  const podiumCafes = useMemo(() => cafes.slice(0, 3), [cafes]);
  const restCafes = useMemo(() => cafes.slice(3), [cafes]);
  const listItems: ListItem[] = useMemo(
    () =>
      interleaveAds(
        restCafes.map((cafe, i) => ({ cafe, rank: i + 4 })),
        { maxAds: 2 },
      ),
    [restCafes],
  );

  // Only true on the FIRST load (no pages yet). `isFetching` would also flip
  // true during pagination — using it here would unmount the FlatList every
  // page append and lose the user's scroll position.
  const initialLoading = cafesQuery.isLoading;

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === 'ad') return <NativeAdCard cacheKey={item.key} />;
    const cafe = item.data.cafe;
    const rank = item.data.rank;
    return (
      <View style={styles.rankItemWrap}>
        <CafeListItem cafe={cafe} />
        <View style={styles.rankBadgeOverlay} pointerEvents="none">
          <Text style={styles.rankBadgeOverlayText}>{rank}</Text>
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback(
    (item: ListItem) => (item.kind === 'ad' ? item.key : item.data.cafe.id),
    [],
  );

  const getItemType = useCallback(
    (item: ListItem) => item.kind,
    [],
  );

  const onEndReached = useCallback(() => {
    if (cafesQuery.hasNextPage && !cafesQuery.isFetchingNextPage) {
      cafesQuery.fetchNextPage();
    }
  }, [cafesQuery.hasNextPage, cafesQuery.isFetchingNextPage, cafesQuery.fetchNextPage]);

  // ─── Podium for top 3 — mirrors web TrendingPage WinnerCard + RunnerUpCard
  const renderPodium = () => {
    if (podiumCafes.length === 0) return null;
    const winner = podiumCafes[0];
    const runners = podiumCafes.slice(1, 3);

    return (
      <View style={styles.podium}>
        <WinnerCard
          cafe={winner}
          onPress={() => navigation.navigate('CafeDetail', { cafe: winner })}
        />
        {runners.length > 0 && (
          <View style={styles.runnerRow}>
            {runners.map((cafe, idx) => (
              <RunnerUpCard
                key={cafe.id}
                cafe={cafe}
                rank={idx + 2}
                onPress={() => navigation.navigate('CafeDetail', { cafe })}
              />
            ))}
          </View>
        )}

        {restCafes.length > 0 && (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderAccent} />
            <Text style={styles.sectionHeaderText}>
              Peringkat 4 – {totalCount.toLocaleString()}
            </Text>
            <View style={styles.sectionHeaderLine} />
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Flame size={56} color={colors.textSecondary} strokeWidth={1.5} style={styles.emptyIconLead} />
      <Text style={styles.emptyTitle}>{t(trendingText.emptyTitle)}</Text>
      <Text style={styles.emptySubtitle}>{t(trendingText.emptySubtitle)}</Text>
    </View>
  );

  const totalCount = cafesQuery.data?.pages?.[0]?.meta?.total ?? cafes.length;

  return (
    <View style={styles.container}>
      {/* Branded hero header — mirrors web TrendingPage */}
      <View style={styles.heroHeader}>
        <View style={styles.heroBlobAmber} />
        <View style={styles.heroBlobOrange} />
        <View style={[styles.heroBody, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.heroPill}>
                <Flame size={11} color="#B45309" fill="#B45309" strokeWidth={0} />
                <Text style={styles.heroPillText}>{t(trendingText.heroPill)}</Text>
              </View>
              <Text style={styles.heroTitle}>
                {t(trendingText.heroTitleBefore)}
                <Text style={styles.heroTitleAccent}>{t(trendingText.heroTitleAccent)}</Text>
                {t(trendingText.heroTitleAfter)}
              </Text>
              <Text style={styles.heroSub}>
                {t(trendingText.heroSubtitle)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Trending content (no sub-tabs — leaderboard moved to standalone screen) */}
      <>
          {/* Sticky filter button + scrollable purpose chips */}
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={[
                styles.filterBarBtn,
                activeFilterCount > 0 && styles.filterBarBtnActive,
              ]}
              onPress={() => setFilterOpen(true)}
            >
              <SlidersHorizontal
                size={14}
                color={activeFilterCount > 0 ? '#FFFFFF' : '#1C1C1A'}
                strokeWidth={2.2}
              />
              {activeFilterCount > 0 && (
                <View style={styles.filterBarBadge}>
                  <Text style={styles.filterBarBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.filterBarDivider} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.sm, gap: 6 }}
            >
              <TouchableOpacity
                onPress={() => setPurposeId(null)}
                style={[styles.purposeChip, purposeId === null && styles.purposeChipDarkActive]}
              >
                <Text style={[styles.purposeChipText, purposeId === null && styles.purposeChipTextActive]}>
                  {t(trendingText.allFilter)}
                </Text>
              </TouchableOpacity>
              {purposes.map((p) => {
                const active = purposeId === p.id;
                const Icon = PURPOSE_SLUG_TO_ICON[p.slug];
                const iconColor = active ? colors.white : colors.primary;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setPurposeId(active ? null : p.id)}
                    style={[styles.purposeChip, active && styles.purposeChipActive]}
                  >
                    {Icon && (
                      <Icon size={12} color={iconColor} strokeWidth={2.2} />
                    )}
                    <Text style={[styles.purposeChipText, active && styles.purposeChipTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Content */}
          {initialLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <FlashList
              data={listItems}
              keyExtractor={keyExtractor}
              getItemType={getItemType}
              renderItem={renderItem}
              drawDistance={1500}
              ListHeaderComponent={renderPodium}
              ListEmptyComponent={cafes.length === 0 ? renderEmpty : null}
              style={styles.listSurface}
              contentContainerStyle={
                cafes.length === 0 ? styles.listEmptyContent : styles.listContent
              }
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={ItemSeparator}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.8}
              ListFooterComponent={
                cafesQuery.isFetchingNextPage ? (
                  <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                ) : !cafesQuery.hasNextPage && cafes.length > 0 ? (
                  <Text style={styles.endHint}>{t(trendingText.endHint)}</Text>
                ) : null
              }
            />
          )}
        </>

      <MobileFilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        purposes={purposes}
        activePurposeId={purposeId}
        onPurposeSelect={setPurposeId}
        facilities={facilityKeys}
        onFacilitiesChange={setFacilityKeys}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
      />

    </View>
  );
}

// ─── Top podium cards — full data parity with web TrendingPage ─────────────

function WinnerCard(props: { cafe: Cafe; onPress: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => handle.cancel();
  }, []);
  if (!ready) return <WinnerCardSkeleton />;
  return <WinnerCardContent {...props} />;
}

function WinnerCardContent({ cafe, onPress }: { cafe: Cafe; onPress: () => void }) {
  const { t } = useTranslation();
  const open = getOpenStatus(cafe.openingHours);
  const locality = cleanAddress(cafe.district || cafe.city || '');
  const rating = formatRating(cafe.googleRating);
  const reviews = cafe.totalGoogleReviews;
  const distMeters =
    cafe.distanceMeters ?? (cafe.distance != null ? Math.round(cafe.distance * 1000) : null);
  const km = distMeters != null ? formatDistance(distMeters) : null;
  const isHot = (cafe.favoritesCount ?? 0) >= 300;
  const allChips = cafe.chips ?? [];
  const visibleChips = allChips.slice(0, 3);
  const overflow = allChips.length - visibleChips.length;

  return (
    <TouchableOpacity
      style={cardStyles.winnerWrap}
      activeOpacity={0.92}
      onPress={onPress}
    >
      <View style={cardStyles.winnerCard}>
        {/* Photo with stacked gradient overlays for stronger bottom readability */}
        <View style={cardStyles.winnerPhotoBox}>
          <CafePhoto
            photos={cafe.photos}
            name={cafe.name}
            cafeId={cafe.id}
            style={cardStyles.winnerPhoto}
          />
          <View style={cardStyles.winnerOverlayTop} />

          {/* Top-left: champion + HOT */}
          <View style={cardStyles.winnerTopLeft}>
            <View style={cardStyles.winnerCrown}>
              <View style={cardStyles.winnerCrownIconWrap}>
                <Crown size={12} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
              </View>
              <Text style={cardStyles.winnerCrownText}>{t(trendingText.winnerCrown)}</Text>
            </View>
            {isHot && (
              <View style={cardStyles.hotPulse}>
                <Flame size={11} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
                <Text style={cardStyles.hotPulseText}>{t(trendingText.hotBadge)}</Text>
              </View>
            )}
          </View>

          {/* Top-right: rating pill */}
          {rating && (
            <View style={cardStyles.winnerRating}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
              <Text style={cardStyles.winnerRatingNum}>{rating}</Text>
              {reviews != null && (
                <Text style={cardStyles.winnerRatingCount}>
                  ({reviews.toLocaleString()})
                </Text>
              )}
            </View>
          )}

          {/* Bottom: name + meta + stat pills */}
          <View style={cardStyles.winnerBottom}>
            <Text style={cardStyles.winnerName} numberOfLines={2}>
              {cafe.name}
            </Text>
            {(locality || km) && (
              <View style={cardStyles.winnerSubRow}>
                <MapPin size={12} color="rgba(255,255,255,0.92)" strokeWidth={2.2} />
                <Text style={cardStyles.winnerSubtitle} numberOfLines={1}>
                  {[locality, km].filter(Boolean).join(' · ')}
                </Text>
              </View>
            )}
            <View style={cardStyles.winnerStatRow}>
              <View style={cardStyles.winnerStatPill}>
                <Heart size={11} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
                <Text style={cardStyles.winnerStatPillText}>
                  {(cafe.favoritesCount ?? 0).toLocaleString()}
                </Text>
              </View>
              <View style={cardStyles.winnerStatPill}>
                <Bookmark size={11} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
                <Text style={cardStyles.winnerStatPillText}>
                  {(cafe.bookmarksCount ?? 0).toLocaleString()}
                </Text>
              </View>
              {!!cafe.priceRange && (
                <View style={cardStyles.winnerStatPill}>
                  <Text style={cardStyles.winnerStatPillText}>{cafe.priceRange}</Text>
                </View>
              )}
              {open && (
                <View
                  style={[
                    cardStyles.winnerOpenPill,
                    open.isOpen ? cardStyles.openOn : cardStyles.openOff,
                  ]}
                >
                  <View style={[
                    cardStyles.openDot,
                    { backgroundColor: open.isOpen ? '#A7F3D0' : '#FCA5A5' },
                  ]} />
                  <Text style={cardStyles.winnerOpenText} numberOfLines={1}>
                    {open.isOpen
                      ? open.closesAt
                        ? `${t(cafeText.open)} · ${open.closesAt}`
                        : t(cafeText.open)
                      : open.opensAt
                        ? `${t(cafeText.closed)} · ${open.opensAt}`
                        : t(cafeText.closed)}
                  </Text>
                </View>
              )}
            </View>

            {/* Facility chips on photo — semi-transparent over overlay */}
            {visibleChips.length > 0 && (
              <View style={cardStyles.winnerFacilityRow}>
                {visibleChips.map((c) => (
                  <View key={c.key} style={cardStyles.winnerFacilityChip}>
                    {c.lucideName && (
                      <LucideIcon
                        name={c.lucideName}
                        size={11}
                        color="#FFFFFF"
                        strokeWidth={2}
                      />
                    )}
                    <Text style={cardStyles.winnerFacilityText} numberOfLines={1}>
                      {c.label}
                    </Text>
                  </View>
                ))}
                {overflow > 0 && (
                  <View style={cardStyles.winnerFacilityOverflow}>
                    <Text style={cardStyles.winnerFacilityOverflowText}>+{overflow}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function WinnerCardSkeleton() {
  return (
    <View style={cardStyles.winnerWrap}>
      <View style={cardStyles.winnerCard}>
        <View style={[cardStyles.winnerPhotoBox, { backgroundColor: '#EAE7E0' }]} />
      </View>
    </View>
  );
}

function RunnerUpCard(props: { cafe: Cafe; rank: number; onPress: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => handle.cancel();
  }, []);
  if (!ready) return <RunnerUpCardSkeleton />;
  return <RunnerUpCardContent {...props} />;
}

function RunnerUpCardContent({
  cafe,
  rank,
  onPress,
}: {
  cafe: Cafe;
  rank: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const open = getOpenStatus(cafe.openingHours);
  const locality = cleanAddress(cafe.district || cafe.city || '');
  const rating = formatRating(cafe.googleRating);
  const distMeters =
    cafe.distanceMeters ?? (cafe.distance != null ? Math.round(cafe.distance * 1000) : null);
  const km = distMeters != null ? formatDistance(distMeters) : null;
  const allChips = cafe.chips ?? [];
  const visibleChips = allChips.slice(0, 2);
  const overflow = allChips.length - visibleChips.length;
  const rankBg = rank === 2 ? '#9CA3AF' : '#B45309';
  const borderColor = rank === 2 ? '#D1D5DB' : '#FDE3B8';

  return (
    <TouchableOpacity
      style={[cardStyles.runnerWrap, { borderColor }]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {/* Photo with stacked overlays — mirrors winner */}
      <View style={cardStyles.runnerPhotoBox}>
        <CafePhoto
          photos={cafe.photos}
          name={cafe.name}
          cafeId={cafe.id}
          style={cardStyles.runnerPhoto}
        />
        <View style={cardStyles.runnerOverlayTop} />
        <View style={cardStyles.runnerOverlayBottom} />

        {/* Top-left rank pill — same shape as winnerCrown, lite */}
        <View style={cardStyles.runnerRankPill}>
          <View style={[cardStyles.runnerRankIconWrap, { backgroundColor: rankBg }]}>
            <Text style={cardStyles.runnerRankNum}>{rank}</Text>
          </View>
          <Text style={cardStyles.runnerRankLabel}>{t(trendingText.rankLabel)}</Text>
        </View>

        {/* Top-right rating */}
        {rating && (
          <View style={cardStyles.runnerRating}>
            <Star size={10} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
            <Text style={cardStyles.runnerRatingNum}>{rating}</Text>
          </View>
        )}

        {/* Bottom: name + locality · km only */}
        <View style={cardStyles.runnerBottom}>
          <Text style={cardStyles.runnerName} numberOfLines={1}>
            {cafe.name}
          </Text>
          {(locality || km) && (
            <View style={cardStyles.runnerSubRow}>
              <MapPin size={10} color="rgba(255,255,255,0.9)" strokeWidth={2.2} />
              <Text style={cardStyles.runnerSubtitle} numberOfLines={1}>
                {[locality, km].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Body: open · price · favorites + facility chips */}
      <View style={cardStyles.runnerBody}>
        <View style={cardStyles.runnerBodyStats}>
          {open && (
            <View
              style={[
                cardStyles.runnerOpenChip,
                open.isOpen ? cardStyles.openOnSoft : cardStyles.closedSoft,
              ]}
            >
              <View style={[
                cardStyles.openDot,
                { backgroundColor: open.isOpen ? '#10B981' : '#EF4444' },
              ]} />
              <Text
                style={[
                  cardStyles.runnerOpenChipText,
                  open.isOpen ? cardStyles.openOnText : cardStyles.closedText,
                ]}
                numberOfLines={1}
              >
                {open.isOpen
                  ? open.closesAt
                    ? `${t(cafeText.open)} · ${open.closesAt}`
                    : t(cafeText.open)
                  : open.opensAt
                    ? `${t(cafeText.closed)} · ${open.opensAt}`
                    : t(cafeText.closed)}
              </Text>
            </View>
          )}
          {!!cafe.priceRange && (
            <Text style={cardStyles.runnerBodyPrice}>{cafe.priceRange}</Text>
          )}
          <View style={cardStyles.runnerBodyFav}>
            <Heart size={11} color="#EA580C" fill="#EA580C" strokeWidth={0} />
            <Text style={cardStyles.runnerBodyFavText}>
              {(cafe.favoritesCount ?? 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {visibleChips.length > 0 && (
          <View style={cardStyles.runnerBodyChipRow}>
            {visibleChips.map((c) => (
              <View key={c.key} style={cardStyles.runnerFacilityChip}>
                {c.lucideName && (
                  <LucideIcon
                    name={c.lucideName}
                    size={9}
                    color="#5C5A52"
                    strokeWidth={2}
                  />
                )}
                <Text style={cardStyles.runnerFacilityText} numberOfLines={1}>
                  {c.label}
                </Text>
              </View>
            ))}
            {overflow > 0 && (
              <View style={cardStyles.runnerFacilityOverflow}>
                <Text style={cardStyles.runnerFacilityOverflowText}>+{overflow}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function RunnerUpCardSkeleton() {
  return (
    <View style={[cardStyles.runnerWrap, { borderColor: '#EAE7E0' }]}>
      <View style={[cardStyles.runnerPhotoBox, { backgroundColor: '#EAE7E0' }]} />
      <View style={cardStyles.runnerBody}>
        <View style={{ height: 14, width: '70%', borderRadius: 4, backgroundColor: '#EAE7E0' }} />
        <View style={cardStyles.runnerBodyChipRow}>
          <View style={[cardStyles.runnerFacilityChip, { width: 50, borderWidth: 0, backgroundColor: '#EAE7E0' }]} />
          <View style={[cardStyles.runnerFacilityChip, { width: 40, borderWidth: 0, backgroundColor: '#EAE7E0' }]} />
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  // Winner
  winnerWrap: {
    borderRadius: 24,
    padding: 2,
    backgroundColor: '#F59E0B',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  winnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
  },
  winnerPhotoBox: {
    position: 'relative',
    width: WINNER_PHOTO_SIZE,
    height: WINNER_PHOTO_SIZE,
    backgroundColor: '#F0EDE8',
  },
  winnerPhoto: { width: WINNER_PHOTO_SIZE, height: WINNER_PHOTO_SIZE },
  winnerOverlayTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '18%',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  winnerTopLeft: {
    position: 'absolute',
    top: 12, left: 12,
    flexDirection: 'row',
    gap: 6, flexWrap: 'wrap',
  },
  winnerCrown: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: 3,
    paddingRight: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  winnerCrownIconWrap: {
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerCrownText: {
    fontSize: 11, fontWeight: '900',
    color: '#1C1C1A', letterSpacing: 1.2,
  },
  hotPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    gap: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  hotPulseText: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '900',
    letterSpacing: 1,
  },
  winnerRating: {
    position: 'absolute',
    top: 12, right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, gap: 3,
  },
  winnerRatingNum: { color: '#1C1C1A', fontSize: 12, fontWeight: '900' },
  winnerRatingCount: { color: '#8A8880', fontSize: 11, fontWeight: '500' },
  winnerBottom: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  winnerName: {
    color: '#FFFFFF', fontSize: 26, fontWeight: '900',
    lineHeight: 30,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  winnerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  winnerSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12, fontWeight: '600',
    flexShrink: 1,
  },
  winnerStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6, marginTop: 12,
  },
  winnerStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  winnerStatPillText: {
    color: '#FFFFFF', fontSize: 11, fontWeight: '800',
  },
  winnerOpenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
  },
  openDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  winnerOpenText: {
    color: '#FFFFFF', fontSize: 11, fontWeight: '800',
  },
  openOn: { backgroundColor: 'rgba(16,185,129,0.92)' },
  openOff: { backgroundColor: 'rgba(0,0,0,0.6)' },
  openOnSoft: { backgroundColor: '#ECFDF5' },
  closedSoft: { backgroundColor: '#FEF2F2' },
  openOnText: { color: '#047857' },
  closedText: { color: '#B91C1C' },
  winnerFacilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  winnerFacilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    maxWidth: 150,
  },
  winnerFacilityText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  winnerFacilityOverflow: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  winnerFacilityOverflowText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

  // Runner
  runnerWrap: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#1C1C1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  runnerPhotoBox: {
    position: 'relative',
    width: '100%',
    height: RUNNER_PHOTO_H,
    backgroundColor: '#F0EDE8',
  },
  runnerPhoto: { width: '100%', height: RUNNER_PHOTO_H },
  runnerOverlayTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '35%',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  runnerOverlayBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Top-left rank pill — mirrors winnerCrown, lite
  runnerRankPill: {
    position: 'absolute',
    top: 8, left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: 2,
    paddingRight: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  runnerRankIconWrap: {
    width: 18, height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runnerRankNum: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  runnerRankLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1C1C1A',
    letterSpacing: 1,
  },

  // Top-right rating
  runnerRating: {
    position: 'absolute',
    top: 8, right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 7,
    borderRadius: 999,
    gap: 3,
  },
  runnerRatingNum: { color: '#1C1C1A', fontSize: 11, fontWeight: '900' },

  // Bottom on-photo region
  runnerBottom: {
    position: 'absolute',
    left: 10, right: 10, bottom: 10,
  },
  runnerName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  runnerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  runnerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '600',
    flexShrink: 1,
  },
  // Body below photo — open · price · favorites
  runnerBody: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  runnerBodyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  runnerOpenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  runnerOpenChipText: { fontSize: 10, fontWeight: '800' },
  runnerBodyPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D48B3A',
  },
  runnerBodyFav: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  runnerBodyFavText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1C1C1A',
  },

  // Facility chip row inside body
  runnerBodyChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  runnerFacilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F0E4CC',
    maxWidth: 120,
  },
  runnerFacilityText: { fontSize: 10, fontWeight: '600', color: '#5C5A52' },
  runnerFacilityOverflow: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E4CC',
  },
  runnerFacilityOverflowText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Hero header (mirrors web TrendingPage) ─────────────────
  heroHeader: {
    backgroundColor: '#FFFBF3',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE3B8',
    overflow: 'hidden',
  },
  heroBlobAmber: {
    position: 'absolute',
    top: -80, left: -48,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(252, 211, 77, 0.45)',
    opacity: 0.6,
  },
  heroBlobOrange: {
    position: 'absolute',
    bottom: -80, right: 0,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(254, 215, 170, 0.4)',
    opacity: 0.6,
  },
  heroBody: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.lg,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 999,
    borderWidth: 1, borderColor: '#FDE3B8',
    marginBottom: 8,
  },
  heroPillText: {
    fontSize: 10, fontWeight: '900',
    color: '#B45309', letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 24, fontWeight: '900',
    color: '#1C1C1A', lineHeight: 28,
  },
  heroTitleAccent: { color: '#EA580C' },
  heroSub: {
    fontSize: 13, color: '#5C5A52',
    marginTop: 6, lineHeight: 18,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    width: 36,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: 0,
  },
  filterBarBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E8E4DD',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  filterBarBtnActive: {
    backgroundColor: '#1C1C1A',
    borderColor: '#1C1C1A',
  },
  filterBarBadge: {
    position: 'absolute',
    top: -3, right: -3,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EA580C',
    paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  filterBarBadgeText: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '900',
  },
  filterBarDivider: {
    width: 1, height: 20,
    backgroundColor: '#E8E4DD',
    marginHorizontal: spacing.sm,
  },
  purposeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1, borderColor: '#E8E4DD',
    backgroundColor: '#FFFFFF',
  },
  purposeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  purposeChipDarkActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  purposeChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  purposeChipTextActive: { color: colors.white },
  filterBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0EDE8',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: { backgroundColor: colors.accent },
  filterBtnText: { fontSize: 16, color: colors.primary },
  filterBtnTextActive: { color: colors.white },
  filterBadge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: colors.accent,
    paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  rankItemWrap: {
    position: 'relative',
  },
  rankBadgeOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(28,28,26,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  rankBadgeOverlayText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  endHint: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    paddingVertical: spacing.lg,
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listSurface: {
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  listEmptyContent: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardPhoto: {
    width: 70,
    height: 70,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 3,
  },
  cardDistance: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  purposePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent + '20',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  purposePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  favCount: {
    alignItems: 'center',
    marginLeft: spacing.sm,
    minWidth: 40,
  },
  favIcon: {
    fontSize: 16,
  },
  favCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 2,
  },
  separator: {
    height: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIconLead: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  // ── Main tabs ─────────────────────────────
  mainTabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  mainTab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  mainTabActive: {
    backgroundColor: colors.primary,
  },
  mainTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  mainTabTextActive: {
    color: colors.white,
  },

  // ── Global Leaderboard ────────────────────
  lbHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    elevation: 1,
  },
  lbRankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  lbRankText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  lbAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  lbAvatarText: { fontSize: 16, fontWeight: '700', color: colors.accent },
  lbName: { fontSize: 15, fontWeight: '700', color: colors.primary },
  lbDetails: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
  lbStat: { fontSize: 11, color: colors.textSecondary },
  lbStatSep: { fontSize: 11, color: colors.textSecondary, marginHorizontal: 3 },
  lbScoreBox: { alignItems: 'center', marginLeft: spacing.sm },
  lbScoreNum: { fontSize: 20, fontWeight: '900', color: colors.accent },
  lbScoreLabel: { fontSize: 9, color: colors.textSecondary, fontWeight: '600' },

  // ── Podium container ─────────────────────────
  podium: { marginBottom: spacing.md },
  runnerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  podiumDivider: {
    fontSize: 11, fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginTop: spacing.md, marginBottom: 4,
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  sectionHeaderAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#EA580C',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1C1C1A',
    letterSpacing: 0.3,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EFEAE0',
    marginLeft: 4,
  },
});

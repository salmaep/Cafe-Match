import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import CafePhoto from '../components/CafePhoto';
import CafeListItem from '../components/cafe/CafeListItem';
import MobileFilterModal from '../components/cafe/MobileFilterModal';
import { getOpenStatus } from '../utils/openingHours';
import { buildFacilityChips, formatDistance } from '../utils/facilities';
import { formatRating } from '../utils/rating';
import { cleanAddress } from '../utils/address';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '../context/LocationContext';
import { useSearchCafes } from '../queries/cafes/use-search-cafes';
import { hitsToCafes } from '../queries/cafes/api';
import { usePurposes } from '../queries/purposes/use-purposes';
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';
import NativeAdCard from '../components/NativeAdCard';
import { interleaveAds, WithAd } from '../utils/adInterleave';

type ListItem = WithAd<{ cafe: Cafe; rank: number }>;

// ─── Rank badge colors ───
const RANK_COLORS: Record<number, string> = {
  1: '#FFD700', // gold
  2: '#C0C0C0', // silver
  3: '#CD7F32', // bronze
};

export default function TrendingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
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
            hitsToCafes(p, latitude ?? undefined, longitude ?? undefined),
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
    if (item.kind === 'ad') return <NativeAdCard />;
    const cafe = item.data.cafe;
    const rank = item.data.rank;
    const rankColor = RANK_COLORS[rank] || colors.surface;
    return (
      <View style={styles.rankRowWrap}>
        <View style={[styles.rankPill, { backgroundColor: rankColor }]}>
          <Text style={styles.rankPillText}>#{rank}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <CafeListItem cafe={cafe} />
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback(
    (item: ListItem) => (item.kind === 'ad' ? item.key : item.data.cafe.id),
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
          <Text style={styles.podiumDivider}>
            Peringkat 4 – {cafes.length}
          </Text>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🔥</Text>
      <Text style={styles.emptyTitle}>No trending cafes</Text>
      <Text style={styles.emptySubtitle}>Try a different filter or check back later</Text>
    </View>
  );

  const totalCount = cafesQuery.data?.pages?.[0]?.meta?.total ?? cafes.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Branded hero header — mirrors web TrendingPage */}
      <View style={styles.heroHeader}>
        <View style={styles.heroBlobAmber} />
        <View style={styles.heroBlobOrange} />
        <View style={styles.heroBody}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>🔥 TRENDING NOW</Text>
              </View>
              <Text style={styles.heroTitle}>
                Cafe paling <Text style={styles.heroTitleAccent}>hits</Text>{' '}
                minggu ini
              </Text>
              <Text style={styles.heroSub}>
                Berdasarkan jumlah favorit & bookmark dari komunitas — update tiap hari.
              </Text>
            </View>
          </View>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroCountBadge}>
              <Text style={styles.heroCountIcon}>🔥</Text>
              <Text style={styles.heroCountNum}>
                {totalCount.toLocaleString()}
              </Text>
              <Text style={styles.heroCountLabel}>CAFES</Text>
            </View>
            <TouchableOpacity
              style={styles.heroLbBtn}
              onPress={() => navigation.navigate('GlobalLeaderboard')}
            >
              <Text style={styles.heroLbBtnText}>🏆 Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.heroFilterBtn,
                activeFilterCount > 0 && styles.heroFilterBtnActive,
              ]}
              onPress={() => setFilterOpen(true)}
            >
              <Text
                style={[
                  styles.heroFilterBtnText,
                  activeFilterCount > 0 && styles.heroFilterBtnTextActive,
                ]}
              >
                ⚙️ Filter
              </Text>
              {activeFilterCount > 0 && (
                <View style={styles.heroFilterBadge}>
                  <Text style={styles.heroFilterBadgeText}>
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Trending content (no sub-tabs — leaderboard moved to standalone screen) */}
      <>
          {/* Purpose chips (filter button moved into hero header) */}
          <View style={styles.filterBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 6 }}
            >
              <TouchableOpacity
                onPress={() => setPurposeId(null)}
                style={[styles.purposeChip, purposeId === null && styles.purposeChipDarkActive]}
              >
                <Text style={[styles.purposeChipText, purposeId === null && styles.purposeChipTextActive]}>
                  Semua
                </Text>
              </TouchableOpacity>
              {purposes.map((p) => {
                const active = purposeId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setPurposeId(active ? null : p.id)}
                    style={[styles.purposeChip, active && styles.purposeChipActive]}
                  >
                    <Text style={[styles.purposeChipText, active && styles.purposeChipTextActive]}>
                      {p.icon ? `${p.icon} ` : ''}{p.name}
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
            <FlatList
              data={listItems}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              ListHeaderComponent={renderPodium}
              ListEmptyComponent={cafes.length === 0 ? renderEmpty : null}
              contentContainerStyle={
                cafes.length === 0 ? styles.listEmptyContent : styles.listContent
              }
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.5}
              // Perf tuning for long lists with mixed item heights.
              initialNumToRender={8}
              maxToRenderPerBatch={6}
              windowSize={8}
              removeClippedSubviews={true}
              ListFooterComponent={
                cafesQuery.isFetchingNextPage ? (
                  <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                ) : !cafesQuery.hasNextPage && cafes.length > 0 ? (
                  <Text style={styles.endHint}>Itu semua untuk filter ini ✓</Text>
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

function WinnerCard({ cafe, onPress }: { cafe: Cafe; onPress: () => void }) {
  const open = getOpenStatus(cafe.openingHours);
  const locality = cleanAddress(cafe.district || cafe.city || '');
  const rating = formatRating(cafe.googleRating);
  const reviews = cafe.totalGoogleReviews;
  const distMeters =
    cafe.distanceMeters ?? (cafe.distance != null ? Math.round(cafe.distance * 1000) : null);
  const km = distMeters != null ? formatDistance(distMeters) : null;
  const isHot = (cafe.favoritesCount ?? 0) >= 300;
  const allChips = buildFacilityChips(cafe);
  const visibleChips = allChips.slice(0, 4);
  const overflow = allChips.length - visibleChips.length;

  return (
    <TouchableOpacity
      style={cardStyles.winnerWrap}
      activeOpacity={0.92}
      onPress={onPress}
    >
      <View style={cardStyles.winnerCard}>
        {/* Photo with overlay */}
        <View style={cardStyles.winnerPhotoBox}>
          <CafePhoto
            photos={cafe.photos}
            name={cafe.name}
            style={cardStyles.winnerPhoto}
          />
          <View style={cardStyles.winnerOverlay} />

          {/* Top-left: champion + HOT */}
          <View style={cardStyles.winnerTopLeft}>
            <View style={cardStyles.winnerCrown}>
              <Text style={cardStyles.winnerCrownEmoji}>👑</Text>
              <Text style={cardStyles.winnerCrownText}>#1 TRENDING</Text>
            </View>
            {isHot && (
              <View style={cardStyles.hotPulse}>
                <Text style={cardStyles.hotPulseText}>🔥 HOT</Text>
              </View>
            )}
          </View>

          {/* Top-right: rating pill */}
          {rating && (
            <View style={cardStyles.winnerRating}>
              <Text style={cardStyles.winnerRatingStar}>★</Text>
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
              <Text style={cardStyles.winnerSubtitle} numberOfLines={1}>
                {[locality, km].filter(Boolean).join(' · ')}
              </Text>
            )}
            <View style={cardStyles.winnerStatRow}>
              <View style={cardStyles.winnerStatPill}>
                <Text style={cardStyles.winnerStatPillText}>
                  ❤️ {(cafe.favoritesCount ?? 0).toLocaleString()}
                </Text>
              </View>
              <View style={cardStyles.winnerStatPill}>
                <Text style={cardStyles.winnerStatPillText}>
                  🔖 {(cafe.bookmarksCount ?? 0).toLocaleString()}
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
                  <Text style={cardStyles.winnerOpenText}>
                    ● {open.isOpen
                      ? `Buka${open.closesAt ? ` · ${open.closesAt}` : ''}`
                      : 'Tutup'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Facility strip */}
        {visibleChips.length > 0 && (
          <View style={cardStyles.winnerFacilityStrip}>
            {visibleChips.map((c) => (
              <View key={c.key} style={cardStyles.winnerFacilityChip}>
                <Text style={cardStyles.winnerFacilityText} numberOfLines={1}>
                  {c.icon} {c.label}
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
    </TouchableOpacity>
  );
}

function RunnerUpCard({
  cafe,
  rank,
  onPress,
}: {
  cafe: Cafe;
  rank: number;
  onPress: () => void;
}) {
  const open = getOpenStatus(cafe.openingHours);
  const locality = cleanAddress(cafe.district || cafe.city || '');
  const rating = formatRating(cafe.googleRating);
  const distMeters =
    cafe.distanceMeters ?? (cafe.distance != null ? Math.round(cafe.distance * 1000) : null);
  const km = distMeters != null ? formatDistance(distMeters) : null;
  const allChips = buildFacilityChips(cafe);
  const visibleChips = allChips.slice(0, 3);
  const overflow = allChips.length - visibleChips.length;
  const rankBg = rank === 2 ? '#9CA3AF' : '#B45309';
  const borderColor = rank === 2 ? '#9CA3AF' : '#D97706';

  return (
    <TouchableOpacity
      style={[cardStyles.runnerWrap, { borderColor }]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {/* Photo */}
      <View style={cardStyles.runnerPhotoBox}>
        <CafePhoto
          photos={cafe.photos}
          name={cafe.name}
          style={cardStyles.runnerPhoto}
        />
        <View style={cardStyles.runnerOverlay} />

        {/* Rank pill */}
        <View style={cardStyles.runnerRankPill}>
          <View style={[cardStyles.runnerRankBubble, { backgroundColor: rankBg }]}>
            <Text style={cardStyles.runnerRankBubbleText}>{rank}</Text>
          </View>
          <Text style={cardStyles.runnerRankLabel}>TOP</Text>
        </View>

        {/* Distance pill */}
        {km && (
          <View style={cardStyles.runnerDistPill}>
            <Text style={cardStyles.runnerDistText}>📍 {km}</Text>
          </View>
        )}

        {/* Title overlay */}
        <View style={cardStyles.runnerTitleOverlay}>
          <Text style={cardStyles.runnerName} numberOfLines={1}>
            {cafe.name}
          </Text>
          {!!locality && (
            <Text style={cardStyles.runnerLocality} numberOfLines={1}>
              {locality}
            </Text>
          )}
        </View>
      </View>

      {/* Body */}
      <View style={cardStyles.runnerBody}>
        <View style={cardStyles.runnerStatsRow}>
          <Text style={cardStyles.runnerFavCount}>
            ❤️ {(cafe.favoritesCount ?? 0).toLocaleString()}
          </Text>
          {rating && (
            <Text style={cardStyles.runnerRating}>
              ⭐ {rating}
            </Text>
          )}
          {!!cafe.priceRange && (
            <Text style={cardStyles.runnerPrice}>{cafe.priceRange}</Text>
          )}
        </View>

        {(open || visibleChips.length > 0) && (
          <View style={cardStyles.runnerChipRow}>
            {open && (
              <View
                style={[
                  cardStyles.runnerOpenChip,
                  open.isOpen ? cardStyles.openOn : cardStyles.openOff,
                ]}
              >
                <Text
                  style={[
                    cardStyles.runnerOpenChipText,
                    open.isOpen ? cardStyles.openOnText : cardStyles.openOffText,
                  ]}
                >
                  {open.isOpen
                    ? open.closesAt
                      ? `Buka · ${open.closesAt}`
                      : 'Buka'
                    : open.opensAt
                      ? `Tutup · ${open.opensAt}`
                      : 'Tutup'}
                </Text>
              </View>
            )}
            {visibleChips.map((c) => (
              <View key={c.key} style={cardStyles.runnerFacChip}>
                <Text style={cardStyles.runnerFacChipText} numberOfLines={1}>
                  {c.icon} {c.label}
                </Text>
              </View>
            ))}
            {overflow > 0 && (
              <View style={cardStyles.runnerFacOverflow}>
                <Text style={cardStyles.runnerFacOverflowText}>+{overflow}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  // Winner
  winnerWrap: {
    borderRadius: 24,
    padding: 2,
    backgroundColor: '#F59E0B',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  winnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
  },
  winnerPhotoBox: {
    position: 'relative',
    aspectRatio: 16 / 10,
    backgroundColor: '#F0EDE8',
  },
  winnerPhoto: { width: '100%', height: '100%' },
  winnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: 4, paddingRight: 10,
    paddingVertical: 4, gap: 6,
  },
  winnerCrownEmoji: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#F59E0B',
    textAlign: 'center', lineHeight: 22,
    fontSize: 12, color: '#FFFFFF',
  },
  winnerCrownText: {
    fontSize: 10, fontWeight: '900',
    color: '#1C1C1A', letterSpacing: 1.5,
  },
  hotPulse: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 10, paddingVertical: 4,
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, gap: 3,
  },
  winnerRatingStar: { color: '#F59E0B', fontSize: 12 },
  winnerRatingNum: { color: '#1C1C1A', fontSize: 12, fontWeight: '900' },
  winnerRatingCount: { color: '#8A8880', fontSize: 11, fontWeight: '500' },
  winnerBottom: {
    position: 'absolute',
    left: 16, right: 16, bottom: 16,
  },
  winnerName: {
    color: '#FFFFFF', fontSize: 24, fontWeight: '900',
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  winnerSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12, fontWeight: '600',
    marginTop: 4,
  },
  winnerStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6, marginTop: 10,
  },
  winnerStatPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  winnerStatPillText: {
    color: '#FFFFFF', fontSize: 11, fontWeight: '800',
  },
  winnerOpenPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
  },
  winnerOpenText: {
    color: '#FFFFFF', fontSize: 11, fontWeight: '800',
  },
  openOn: { backgroundColor: 'rgba(16,185,129,0.92)' },
  openOff: { backgroundColor: 'rgba(0,0,0,0.6)' },
  openOnText: { color: '#047857' },
  openOffText: { color: '#4B5563' },
  winnerFacilityStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FDF6EC',
    borderTopWidth: 1, borderTopColor: '#FDE3B8',
  },
  winnerFacilityChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1, borderColor: '#FDE3B8',
    maxWidth: 150,
  },
  winnerFacilityText: { fontSize: 11, fontWeight: '600', color: '#5C5A52' },
  winnerFacilityOverflow: {
    backgroundColor: '#FFF1E0',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  winnerFacilityOverflowText: { fontSize: 11, fontWeight: '800', color: '#B45309' },

  // Runner
  runnerWrap: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  runnerPhotoBox: {
    position: 'relative',
    aspectRatio: 4 / 3,
    backgroundColor: '#F0EDE8',
  },
  runnerPhoto: { width: '100%', height: '100%' },
  runnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  runnerRankPill: {
    position: 'absolute',
    top: 6, left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingLeft: 3, paddingRight: 8,
    paddingVertical: 3, gap: 4,
    borderRadius: 999,
  },
  runnerRankBubble: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  runnerRankBubbleText: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '900',
  },
  runnerRankLabel: {
    fontSize: 9, fontWeight: '900',
    color: '#1C1C1A', letterSpacing: 1,
  },
  runnerDistPill: {
    position: 'absolute',
    top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 999,
  },
  runnerDistText: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '700',
  },
  runnerTitleOverlay: {
    position: 'absolute',
    left: 8, right: 8, bottom: 8,
  },
  runnerName: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  runnerLocality: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11, fontWeight: '600',
    marginTop: 2,
  },
  runnerBody: {
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#FDF6EC',
    gap: 6,
  },
  runnerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  runnerFavCount: {
    fontSize: 12, fontWeight: '900', color: '#EA580C',
  },
  runnerRating: { fontSize: 12, fontWeight: '700', color: '#1C1C1A' },
  runnerPrice: {
    marginLeft: 'auto',
    fontSize: 12, fontWeight: '900', color: '#D48B3A',
  },
  runnerChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  runnerOpenChip: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 999,
  },
  runnerOpenChipText: { fontSize: 10, fontWeight: '800' },
  runnerFacChip: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(253,227,184,0.6)',
    maxWidth: 110,
  },
  runnerFacChipText: { fontSize: 10, fontWeight: '600', color: '#5C5A52' },
  runnerFacOverflow: {
    backgroundColor: '#FFF1E0',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  runnerFacOverflowText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
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
    paddingHorizontal: 10, paddingVertical: 3,
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
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, marginTop: 14,
  },
  heroCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, gap: 4,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  heroCountIcon: { fontSize: 13 },
  heroCountNum: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  heroCountLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10, fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, gap: 4,
    borderWidth: 1, borderColor: '#E8E4DD',
  },
  heroFilterBtnActive: { borderColor: '#D48B3A' },
  heroFilterBtnText: { fontSize: 12, fontWeight: '800', color: '#1C1C1A' },
  heroFilterBtnTextActive: { color: '#D48B3A' },
  heroFilterBadge: {
    backgroundColor: '#D48B3A',
    paddingHorizontal: 6,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  heroFilterBadgeText: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '900',
  },
  heroLbBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#FDE3B8',
  },
  heroLbBtnText: {
    fontSize: 12, fontWeight: '800', color: '#B45309',
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
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  purposeChip: {
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
  rankRowWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rankPill: {
    minWidth: 36,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 12,
  },
  rankPillText: { fontSize: 12, fontWeight: '900', color: colors.primary },
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
  emptyEmoji: {
    fontSize: 52,
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
});

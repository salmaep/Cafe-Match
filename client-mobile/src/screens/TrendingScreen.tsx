import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import CafePhoto from '../components/CafePhoto';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '../context/LocationContext';
import { useSearchCafes } from '../queries/cafes/use-search-cafes';
import { hitsToCafes } from '../queries/cafes/api';
import { usePurposeId } from '../queries/purposes/use-purpose-id';
import { Cafe, Purpose } from '../types';
import { colors, spacing, radius } from '../theme';
import NativeAdCard from '../components/NativeAdCard';
import { interleaveAds, WithAd } from '../utils/adInterleave';

type ListItem = WithAd<{ cafe: Cafe; rank: number }>;

// ─── Purpose filter options ───
const PURPOSE_FILTERS: Array<'All' | Purpose> = [
  'All',
  'Me Time',
  'Date',
  'Family Time',
  'Group Study',
  'WFC',
];

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
  const [activeFilter, setActiveFilter] = useState<'All' | Purpose>('All');

  const purposeId = usePurposeId(activeFilter !== 'All' ? activeFilter : null);

  const cafesQuery = useSearchCafes({
    lat: latitude ?? undefined,
    lng: longitude ?? undefined,
    radius: 5000,
    purposeId,
    limit: 10,
  });

  // Server (Meilisearch) handles search/filter/sort — purposeId is sent as query param.
  const cafes: Cafe[] = cafesQuery.data
    ? cafesQuery.data.pages.flatMap((p) =>
        hitsToCafes(p, latitude ?? undefined, longitude ?? undefined),
      )
    : [];

  // Build FlatList items with rank + interleaved ads.
  const listItems: ListItem[] = interleaveAds(
    cafes.map((cafe, i) => ({ cafe, rank: i + 1 })),
  );

  const loading = cafesQuery.isLoading || cafesQuery.isFetching;

  const handleFilterSelect = (filter: 'All' | Purpose) => {
    setActiveFilter(filter);
  };

  const handleReset = () => {
    setActiveFilter('All');
  };

  // ─── Render each ranked cafe item ───
  const renderCafe = (item: Cafe, rank: number) => {
    const rankColor = RANK_COLORS[rank] || colors.surface;
    const rankTextColor = rank <= 3 ? colors.primary : colors.textSecondary;


    const topPurpose =
      item.purposes && item.purposes.length > 0 ? item.purposes[0] : null;

    const distanceLabel =
      item.distance != null
        ? item.distance < 1
          ? `${Math.round(item.distance * 1000)} m`
          : `${item.distance.toFixed(1)} km`
        : '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CafeDetail', { cafe: item })}
      >
        {/* Rank Badge */}
        <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
          <Text style={[styles.rankText, { color: rankTextColor }]}>{rank}</Text>
        </View>

        {/* Photo */}
        <CafePhoto photos={item.photos} name={item.name} style={styles.cardPhoto} />

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          {distanceLabel ? (
            <Text style={styles.cardDistance}>{distanceLabel}</Text>
          ) : null}
          {topPurpose ? (
            <View style={styles.purposePill}>
              <Text style={styles.purposePillText}>{topPurpose}</Text>
            </View>
          ) : null}
        </View>

        {/* Favorites Count */}
        <View style={styles.favCount}>
          <Text style={styles.favIcon}>❤️</Text>
          <Text style={styles.favCountText}>{item.favoritesCount || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'ad') return <NativeAdCard />;
    return renderCafe(item.data.cafe, item.data.rank);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🔥</Text>
      <Text style={styles.emptyTitle}>No trending cafes</Text>
      <Text style={styles.emptySubtitle}>Try a different filter or check back later</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CafeMatch</Text>
        </View>
      </View>

      {/* Main tabs: Trending Cafes vs Global Leaderboard */}
      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.mainTab, styles.mainTabActive]}
          onPress={() => {}}
        >
          <Text style={[styles.mainTabText, styles.mainTabTextActive]}>
            ☕ Trending Cafes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mainTab}
          onPress={() => navigation.navigate('GlobalLeaderboard')}
        >
          <Text style={styles.mainTabText}>
            🏆 Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Trending Cafes ────────────────────────────────────── */}
      <>
          {/* Purpose Filter Pills */}
          <View style={styles.filterBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {PURPOSE_FILTERS.map(filter => {
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterPill,
                      isActive ? styles.filterPillActive : styles.filterPillInactive,
                    ]}
                    onPress={() => handleFilterSelect(filter)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isActive ? styles.filterPillTextActive : styles.filterPillTextInactive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {activeFilter !== 'All' && (
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.75}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={listItems}
              keyExtractor={(item) =>
                item.kind === 'ad' ? item.key : item.data.cafe.id
              }
              renderItem={renderItem}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={
                cafes.length === 0 ? styles.listEmptyContent : styles.listContent
              }
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
      </>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  filterPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  filterPillActive: {
    backgroundColor: colors.accent,
  },
  filterPillInactive: {
    backgroundColor: colors.surface,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.white,
  },
  filterPillTextInactive: {
    color: colors.textSecondary,
  },
  resetBtn: {
    marginRight: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
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

});

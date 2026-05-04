import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '../context/LocationContext';
import { MOCK_CAFES } from '../data/mockCafes';
import { fetchGlobalLeaderboard } from '../services/api';
import { useSearchCafes } from '../queries/cafes/use-search-cafes';
import { hitsToCafes } from '../queries/cafes/api';
import { Cafe, Purpose } from '../types';
import { colors, spacing, radius } from '../theme';

// ─── Purpose filter options ───
const PURPOSE_FILTERS: Array<'All' | Purpose> = [
  'All',
  'Me Time',
  'Date',
  'Family Time',
  'Group Study',
  'WFC',
];

// ─── Purpose → backend purpose id mapping ───
const PURPOSE_ID_MAP: Partial<Record<Purpose, number>> = {
  'Me Time': 1,
  'Date': 2,
  'Family Time': 3,
  'Group Study': 4,
  'WFC': 5,
};

// ─── Rank badge colors ───
const RANK_COLORS: Record<number, string> = {
  1: '#FFD700', // gold
  2: '#C0C0C0', // silver
  3: '#CD7F32', // bronze
};

function getFallback(filter: 'All' | Purpose): Cafe[] {
  let list = [...MOCK_CAFES];
  if (filter !== 'All') {
    list = list.filter(
      (c) => c.purposes && c.purposes.includes(filter as Purpose),
    );
  }
  return list
    .sort((a, b) => (b.favoritesCount || 0) - (a.favoritesCount || 0))
    .slice(0, 10);
}

export default function TrendingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { latitude, longitude } = useLocation();

  // Main tab toggle: Trending Cafes vs Global Leaderboard
  const [mainTab, setMainTab] = useState<'cafes' | 'leaderboard'>('cafes');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Trending cafes state
  const [activeFilter, setActiveFilter] = useState<'All' | Purpose>('All');

  const purposeId =
    activeFilter !== 'All' ? PURPOSE_ID_MAP[activeFilter] : undefined;

  const cafesQuery = useSearchCafes({
    lat: latitude ?? undefined,
    lng: longitude ?? undefined,
    radius: 5000,
    purposeId,
    limit: 10,
  });

  const cafes: Cafe[] = cafesQuery.data
    ? cafesQuery.data.pages.flatMap((p) =>
        hitsToCafes(p, latitude ?? undefined, longitude ?? undefined),
      )
    : [];

  const displayCafes =
    cafes.length > 0 ? cafes : getFallback(activeFilter);

  const loading = cafesQuery.isLoading || cafesQuery.isFetching;

  // Load global leaderboard when tab switches
  useEffect(() => {
    if (mainTab !== 'leaderboard') return;
    if (globalLeaderboard.length > 0) return; // already loaded
    setLbLoading(true);
    fetchGlobalLeaderboard()
      .then(setGlobalLeaderboard)
      .catch(() => setGlobalLeaderboard([]))
      .finally(() => setLbLoading(false));
  }, [mainTab]);

  const handleFilterSelect = (filter: 'All' | Purpose) => {
    setActiveFilter(filter);
  };

  const handleReset = () => {
    setActiveFilter('All');
  };

  // ─── Render each ranked cafe item ───
  const renderItem = ({ item, index }: { item: Cafe; index: number }) => {
    const rank = index + 1;
    const rankColor = RANK_COLORS[rank] || colors.surface;
    const rankTextColor = rank <= 3 ? colors.primary : colors.textSecondary;

    const photoUri =
      item.photos && item.photos.length > 0
        ? item.photos[0]
        : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';

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
        <Image source={{ uri: photoUri }} style={styles.cardPhoto} />

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
          style={[styles.mainTab, mainTab === 'cafes' && styles.mainTabActive]}
          onPress={() => setMainTab('cafes')}
        >
          <Text style={[styles.mainTabText, mainTab === 'cafes' && styles.mainTabTextActive]}>
            ☕ Trending Cafes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'leaderboard' && styles.mainTabActive]}
          onPress={() => setMainTab('leaderboard')}
        >
          <Text style={[styles.mainTabText, mainTab === 'leaderboard' && styles.mainTabTextActive]}>
            🏆 Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab: Trending Cafes ────────────────────────────────────── */}
      {mainTab === 'cafes' && (
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
              data={displayCafes}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={
                displayCafes.length === 0 ? styles.listEmptyContent : styles.listContent
              }
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </>
      )}

      {/* ── Tab: Global Leaderboard ─────────────────────────────────── */}
      {mainTab === 'leaderboard' && (
        <>
          {lbLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : globalLeaderboard.length === 0 ? (
            <View style={styles.centered}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🏆</Text>
              <Text style={{ fontSize: 16, color: colors.textSecondary }}>
                Belum ada data leaderboard
              </Text>
            </View>
          ) : (
            <FlatList
              data={globalLeaderboard}
              keyExtractor={(item) => String(item.userId)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <Text style={styles.lbHeader}>
                  Top Users · All Cafes
                </Text>
              }
              renderItem={({ item }) => {
                const rank = item.rank;
                const rankEmoji =
                  rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                return (
                  <View
                    style={[
                      styles.lbRow,
                      rank <= 3 && { borderLeftWidth: 3, borderLeftColor: RANK_COLORS[rank] || colors.surface },
                    ]}
                  >
                    <View style={[styles.lbRankBadge, { backgroundColor: RANK_COLORS[rank] || colors.surface }]}>
                      <Text style={styles.lbRankText}>{rankEmoji}</Text>
                    </View>
                    <View style={styles.lbAvatar}>
                      <Text style={styles.lbAvatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lbName}>{item.name}</Text>
                      <View style={styles.lbDetails}>
                        <Text style={styles.lbStat}>☕ {item.totalCheckins} check-in</Text>
                        <Text style={styles.lbStatSep}>·</Text>
                        <Text style={styles.lbStat}>🗺️ {item.uniqueCafes} cafes</Text>
                        <Text style={styles.lbStatSep}>·</Text>
                        <Text style={styles.lbStat}>⏱️ {item.totalDuration}</Text>
                      </View>
                    </View>
                    <View style={styles.lbScoreBox}>
                      <Text style={styles.lbScoreNum}>{item.score}</Text>
                      <Text style={styles.lbScoreLabel}>pts</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </>
      )}
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
});

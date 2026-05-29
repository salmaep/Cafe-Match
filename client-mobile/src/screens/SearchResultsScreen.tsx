import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Search, SlidersHorizontal } from 'lucide-react-native';
import { mapText } from '@shared/i18n/keys';
import { usePreferences } from '../context/PreferencesContext';
import { useLocation } from '../context/LocationContext';
import { useSearchCafes } from '../queries/cafes/use-search-cafes';
import { usePurposes } from '../queries/purposes/use-purposes';
import { hitsToCafes, fetchAutocomplete } from '../queries/cafes/api';
import CafeListItem from '../components/cafe/CafeListItem';
import MobileFilterModal from '../components/cafe/MobileFilterModal';
import StatusBarScrim from '../components/StatusBarScrim';
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';

const RESULTS_RADIUS_M = 50_000;

type SortKey = 'distance' | 'rating' | 'trending' | 'newest';
type RouteParams = { SearchResults: { q: string } };

export default function SearchResultsScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'SearchResults'>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const q = route.params?.q ?? '';

  const { preferences } = usePreferences();
  const { latitude: userLat, longitude: userLng } = useLocation();
  const lat = preferences?.location?.latitude ?? userLat;
  const lng = preferences?.location?.longitude ?? userLng;

  const purposesQuery = usePurposes();
  const purposes = purposesQuery.data ?? [];

  const [purposeId, setPurposeId] = useState<number | null>(null);
  const [facilityKeys, setFacilityKeys] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('distance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);

  const activeFilterCount =
    facilityKeys.length + (priceRange ? 1 : 0) + (purposeId != null ? 1 : 0);

  // Wide radius (50km) so search feels global (Tokopedia-style), not limited to
  // the user's discover radius. Mirrors TrendingScreen's query shape.
  const cafesQuery = useSearchCafes({
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    radius: RESULTS_RADIUS_M,
    q: q || undefined,
    purposeId: purposeId ?? undefined,
    priceRange: (priceRange as any) || undefined,
    facilities: facilityKeys.length > 0 ? facilityKeys : undefined,
    limit: 20,
    sort,
  });

  const cafes: Cafe[] = useMemo(
    () =>
      cafesQuery.data
        ? cafesQuery.data.pages.flatMap((p) =>
            hitsToCafes(p, lat ?? undefined, lng ?? undefined),
          )
        : [],
    [cafesQuery.data, lat, lng],
  );

  const initialLoading = cafesQuery.isLoading;
  const totalCount = cafesQuery.data?.pages?.[0]?.meta?.total ?? cafes.length;

  // Did-you-mean: only when a committed query returns zero results.
  useEffect(() => {
    if (initialLoading || cafes.length > 0 || !q.trim()) {
      setDidYouMean(null);
      return;
    }
    let cancelled = false;
    fetchAutocomplete({ q, limit: 1, lat: lat ?? undefined, lng: lng ?? undefined })
      .then((res) => {
        if (cancelled) return;
        const hit = res.data[0];
        setDidYouMean(
          hit && hit.name.toLowerCase() !== q.toLowerCase() ? hit.name : null,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoading, cafes.length, q]);

  const onEndReached = useCallback(() => {
    if (cafesQuery.hasNextPage && !cafesQuery.isFetchingNextPage) {
      cafesQuery.fetchNextPage();
    }
  }, [cafesQuery.hasNextPage, cafesQuery.isFetchingNextPage, cafesQuery.fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Cafe }) => <CafeListItem cafe={item} />,
    [],
  );

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'distance', label: t(mapText.sortDistance) },
    { key: 'rating', label: t(mapText.sortRating) },
    { key: 'trending', label: t(mapText.sortTrending) },
    { key: 'newest', label: t(mapText.sortNewest) },
  ];

  return (
    <View style={styles.container}>
      <StatusBarScrim />
      {/* Header: back + tappable query bar + filter */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2.2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.queryBar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Search')}
        >
          <Search
            size={16}
            color={colors.textSecondary}
            strokeWidth={2.2}
            style={styles.searchIcon}
          />
          <Text style={styles.queryText} numberOfLines={1}>
            {q}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilterOpen(true)}
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
        >
          <SlidersHorizontal
            size={20}
            color={activeFilterCount > 0 ? colors.white : colors.primary}
            strokeWidth={2.2}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort chips */}
      <View style={styles.sortBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 6 }}
        >
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => setSort(s.key)}
                style={[styles.sortChip, active && styles.sortChipActive]}
              >
                <Text
                  style={[styles.sortChipText, active && styles.sortChipTextActive]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {initialLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={cafes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <View>
              <Text style={styles.resultsCount}>
                {t(mapText.cafesMatched, { count: totalCount })}
              </Text>
              {didYouMean && (
                <TouchableOpacity
                  style={styles.didYouMean}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.replace('SearchResults', { q: didYouMean })
                  }
                >
                  <Text style={styles.didYouMeanText}>
                    {t(mapText.didYouMean)}{' '}
                    <Text style={styles.didYouMeanTerm}>{didYouMean}</Text>?
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t(mapText.noMatchSearch)}</Text>
            </View>
          }
          contentContainerStyle={
            cafes.length === 0 ? styles.listEmptyContent : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={9}
          ListFooterComponent={
            cafesQuery.isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : null
          }
        />
      )}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queryBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  searchIcon: { marginRight: spacing.sm },
  queryText: { flex: 1, fontSize: 14, color: colors.primary },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface,
  },
  filterBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: colors.accent, fontSize: 10, fontWeight: '900' },
  sortBar: {
    paddingBottom: spacing.sm,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortChipActive: { backgroundColor: '#FDF6EC', borderColor: colors.accent },
  sortChipText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  sortChipTextActive: { color: colors.accent },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resultsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  didYouMean: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  didYouMeanText: { fontSize: 14, color: colors.primary },
  didYouMeanTerm: { fontWeight: '800', color: colors.accent },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  listEmptyContent: { flexGrow: 1 },
  separator: { height: spacing.sm },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  footerLoader: { paddingVertical: spacing.md, alignItems: 'center' },
});

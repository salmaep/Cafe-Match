import React, { useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { BottomSheetFlashList } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { mapText } from "@shared/i18n/keys";
import CafeListItem from "../../../components/cafe/CafeListItem";
import NativeAdCard from "../../../components/NativeAdCard";
import { Cafe } from "../../../types";
import { colors, spacing } from "../../../theme";

type ListEntry =
  | { kind: "ad"; key: string }
  | { kind: "item"; data: Cafe };

type Props = {
  loading: boolean;
  listTotal: number;
  radiusKm: number;
  searchActive: boolean;
  preferencePurpose?: string | null;
  cafes: Cafe[];
  items: ListEntry[];
  selectedCafeId?: string | number | null;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onResetFilters: () => void;
  onEndReached: () => void;
  header?: React.ReactNode;
  contentContainerStyle?: any;
};

function CafeList({
  loading,
  listTotal,
  radiusKm,
  searchActive,
  preferencePurpose,
  cafes,
  items,
  selectedCafeId,
  isFetchingNextPage,
  hasNextPage,
  onResetFilters,
  onEndReached,
  header,
  contentContainerStyle,
}: Props) {
  const { t } = useTranslation();

  const renderItem = useCallback(
    ({ item }: { item: ListEntry }) => {
      if (item.kind === "ad") {
        return <NativeAdCard cacheKey={item.key} />;
      }
      return <CafeListItem cafe={item.data} />;
    },
    [],
  );

  const keyExtractor = useCallback(
    (item: ListEntry) => (item.kind === "ad" ? item.key : String(item.data.id)),
    [],
  );

  const getItemType = useCallback(
    (item: ListEntry) => item.kind,
    [],
  );

  const ItemSeparator = useCallback(
    () => <View style={styles.cardSep} />,
    [],
  );

  const ListHeader = useMemo(
    () => (
      <>
        {header}
        <View style={styles.listTitleRow}>
          <Text style={styles.listTitle}>
            {loading
              ? t(mapText.loadingCafes)
              : listTotal === 0
                ? t(mapText.noResultsInRadius)
                : t(mapText.resultsInRadius, { count: listTotal, radius: radiusKm })}
          </Text>
          {searchActive ? (
            <Text style={styles.listSubtitle}>{t(mapText.filteredBySearch)}</Text>
          ) : preferencePurpose ? (
            <Text style={styles.listSubtitle}>{preferencePurpose}</Text>
          ) : null}
        </View>
      </>
    ),
    [header, loading, listTotal, radiusKm, searchActive, preferencePurpose, t],
  );

  const ListEmpty = useMemo(
    () =>
      loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>
            {t(mapText.noResults, { radius: radiusKm })}
          </Text>
          <TouchableOpacity onPress={onResetFilters} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>{t(mapText.resetFilters)}</Text>
          </TouchableOpacity>
        </View>
      ),
    [loading, radiusKm, onResetFilters, t],
  );

  const ListFooter = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }
    if (!hasNextPage && cafes.length > 0) {
      return (
        <Text style={styles.endHint}>
          {t(mapText.endOfList, { radius: radiusKm })}
        </Text>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, cafes.length, radiusKm, t]);

  return (
    <BottomSheetFlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      drawDistance={1500}
      style={styles.listSurface}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={ListEmpty}
      ListFooterComponent={ListFooter}
      ItemSeparatorComponent={ItemSeparator}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.8}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listSurface: { backgroundColor: colors.background },
  listTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  listTitle: { fontSize: 14, fontWeight: "700", color: colors.primary },
  listSubtitle: { fontSize: 12, color: colors.accent },
  cardSep: { height: spacing.sm },
  selectedCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  stateBox: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  stateText: { fontSize: 15, color: colors.textSecondary },
  resetBtn: { marginTop: spacing.md },
  resetBtnText: { fontSize: 14, color: colors.accent, fontWeight: "600" },
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  endHint: {
    textAlign: "center",
    fontSize: 12,
    color: colors.textSecondary,
    paddingVertical: spacing.lg,
    fontStyle: "italic",
  },
});

export default React.memo(CafeList);
export type { ListEntry };

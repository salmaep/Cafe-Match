import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
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
}: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {loading
            ? t(mapText.loadingCafes)
            : listTotal === 0
              ? t(mapText.noResultsInRadius)
              : t(mapText.resultsInRadius, { count: listTotal, radius: radiusKm })}
        </Text>
        {searchActive && (
          <Text style={styles.subtitle}>{t(mapText.filteredBySearch)}</Text>
        )}
        {!searchActive && preferencePurpose && (
          <Text style={styles.subtitle}>{preferencePurpose}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : cafes.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t(mapText.noResults, { radius: radiusKm })}</Text>
          <TouchableOpacity onPress={onResetFilters} style={styles.emptyReset}>
            <Text style={styles.emptyResetText}>{t(mapText.resetFilters)}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {items.map((entry) =>
            entry.kind === "ad" ? (
              <React.Fragment key={entry.key}>
                <NativeAdCard />
                <View style={styles.cardSep} />
              </React.Fragment>
            ) : (
              <React.Fragment key={entry.data.id}>
                <View
                  style={
                    selectedCafeId === entry.data.id
                      ? styles.selectedCard
                      : undefined
                  }
                >
                  <CafeListItem cafe={entry.data} />
                </View>
                <View style={styles.cardSep} />
              </React.Fragment>
            ),
          )}
          {isFetchingNextPage && (
            <View style={styles.loadingFoot}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}
          {!hasNextPage && cafes.length > 0 && (
            <Text style={styles.endHint}>{t(mapText.endOfList, { radius: radiusKm })}</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 14, fontWeight: "700", color: colors.primary },
  subtitle: { fontSize: 12, color: colors.accent },
  loadingBox: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyBox: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyText: { fontSize: 15, color: colors.textSecondary },
  emptyReset: { marginTop: spacing.md },
  emptyResetText: { fontSize: 14, color: colors.accent, fontWeight: "600" },
  cardSep: { height: spacing.sm },
  selectedCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  loadingFoot: {
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

export default CafeList;
export type { ListEntry };

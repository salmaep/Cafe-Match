import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Search, X, SlidersHorizontal } from "lucide-react-native";
import { mapText } from "@shared/i18n/keys";
import { colors, spacing, radius } from "../../../theme";

type Props = {
  topInset: number;
  searchQuery: string;
  searchActive: boolean;
  onSearchQueryChange: (s: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onFocus?: () => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  showNoResultsBanner: boolean;
};

function MapSearchBar({
  topInset,
  searchQuery,
  searchActive,
  onSearchQueryChange,
  onSubmit,
  onClear,
  onFocus,
  onOpenFilters,
  activeFilterCount,
  showNoResultsBanner,
}: Props) {
  const { t } = useTranslation();
  return (
    <View style={[styles.container, { top: topInset + 8 }]}>
      <View style={styles.row}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textSecondary} strokeWidth={2.2} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t(mapText.searchPlaceholder)}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            onSubmitEditing={onSubmit}
            onFocus={onFocus}
            returnKeyType="search"
          />
          {(searchActive || searchQuery.length > 0) && (
            <TouchableOpacity
              onPress={onClear}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={onOpenFilters}
          style={[
            styles.filterFab,
            activeFilterCount > 0 && styles.filterFabActive,
          ]}
        >
          <SlidersHorizontal
            size={20}
            color={activeFilterCount > 0 ? colors.white : colors.primary}
            strokeWidth={2.2}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterFabBadge}>
              <Text style={styles.filterFabBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {showNoResultsBanner && (
        <View style={styles.noResultsBanner}>
          <Text style={styles.noResultsText}>
            {t(mapText.noMatchSearch)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    paddingVertical: spacing.sm + 4,
  },
  clearBtn: { padding: spacing.xs },
  filterFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    position: "relative",
  },
  filterFabActive: { backgroundColor: colors.accent },
  filterFabBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  filterFabBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "900",
  },
  noResultsBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    alignItems: "center",
    elevation: 2,
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});

export default MapSearchBar;

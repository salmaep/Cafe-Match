import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../../../theme";

type Props = {
  topInset: number;
  searchQuery: string;
  searchActive: boolean;
  onSearchQueryChange: (s: string) => void;
  onSubmit: () => void;
  onClear: () => void;
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
  onOpenFilters,
  activeFilterCount,
  showNoResultsBanner,
}: Props) {
  return (
    <View style={[styles.container, { top: topInset + 8 }]}>
      <View style={styles.row}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari kafe, alamat, atau fasilitas…"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            onSubmitEditing={onSubmit}
            returnKeyType="search"
          />
          {searchActive && (
            <TouchableOpacity
              onPress={onClear}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearIcon}>×</Text>
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
          <Text
            style={[
              styles.filterFabIcon,
              activeFilterCount > 0 && styles.filterFabIconActive,
            ]}
          >
            ⚙︎
          </Text>
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
            Gak ada cafe yang cocok sama pencarian kamu
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
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    paddingVertical: spacing.sm + 4,
  },
  clearBtn: { padding: spacing.xs },
  clearIcon: { fontSize: 22, color: colors.textSecondary },
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
  filterFabIcon: { fontSize: 18, color: colors.primary, fontWeight: "700" },
  filterFabIconActive: { color: colors.white },
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

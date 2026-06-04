import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, X, RotateCcw, ChevronRight } from "lucide-react-native";
import { mapText } from "@shared/i18n/keys";
import { colors, spacing, radius } from "../../../theme";

export type ActiveFilter = {
  key: string;
  label: string;
  remove: () => void;
};

type Props = {
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  onOpenRadiusModal: () => void;
  activeFilters: ActiveFilter[];
  hasAnyFilter: boolean;
  onResetFilters: () => void;
  onOpenFilters: () => void;
};

const QUICK_RADII = [0.5, 1, 2];
const VISIBLE_FILTER_LIMIT = 3;

function RadiusControls({
  radiusKm,
  onRadiusChange,
  onOpenRadiusModal,
  activeFilters,
  hasAnyFilter,
  onResetFilters,
  onOpenFilters,
}: Props) {
  const { t } = useTranslation();
  const isCustomRadius = !QUICK_RADII.includes(radiusKm);
  const overflowCount = Math.max(0, activeFilters.length - VISIBLE_FILTER_LIMIT);
  const visibleFilters =
    overflowCount > 0
      ? activeFilters.slice(0, VISIBLE_FILTER_LIMIT)
      : activeFilters;
  return (
    <View style={styles.section}>
      <View style={styles.radiusRow}>
        <Text style={styles.label}>{t(mapText.radius)}</Text>
        <View style={styles.pillsWrap}>
          {QUICK_RADII.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.pill, radiusKm === r && styles.pillActive]}
              onPress={() => onRadiusChange(r)}
            >
              <Text
                style={[
                  styles.pillText,
                  radiusKm === r && styles.pillTextActive,
                ]}
              >
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
          {isCustomRadius && (
            <View style={[styles.pill, styles.pillActive]}>
              <Text style={[styles.pillText, styles.pillTextActive]}>
                {radiusKm} km
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.moreBtn} onPress={onOpenRadiusModal}>
            <MoreHorizontal size={16} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {hasAnyFilter && (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterCount}>
              {activeFilters.length} filter
            </Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={onResetFilters}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RotateCcw size={12} color={colors.accent} strokeWidth={2.5} />
              <Text style={styles.resetText}>{t(mapText.resetAll)}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterRow}>
            {visibleFilters.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={styles.filterPill}
                onPress={f.remove}
              >
                <Text style={styles.filterPillText} numberOfLines={1}>
                  {f.label}
                </Text>
                <X size={12} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            ))}
            {overflowCount > 0 && (
              <TouchableOpacity
                style={styles.seeAllPill}
                onPress={onOpenFilters}
              >
                <Text style={styles.seeAllText}>+{overflowCount} lainnya</Text>
                <ChevronRight size={12} color={colors.accent} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 0, marginBottom: spacing.sm },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    width: 44,
  },
  pillsWrap: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: "transparent",
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: "#FDF6EC",
  },
  pillText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  pillTextActive: { color: colors.accent },
  moreBtn: {
    width: 34,
    height: 30,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.primary,
    lineHeight: 16,
  },
  filterSection: {
    paddingBottom: spacing.xs,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  filterCount: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterPill: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  seeAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
  },
  filterPillText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  filterPillX: { fontSize: 13, color: colors.textSecondary },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  resetText: { fontSize: 12, fontWeight: "700", color: colors.accent },
});

export default RadiusControls;

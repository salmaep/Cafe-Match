import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
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
};

const QUICK_RADII = [0.5, 1, 2];

function RadiusControls({
  radiusKm,
  onRadiusChange,
  onOpenRadiusModal,
  activeFilters,
  hasAnyFilter,
  onResetFilters,
}: Props) {
  const { t } = useTranslation();
  const isCustomRadius = !QUICK_RADII.includes(radiusKm);
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
            <Text style={styles.moreBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {hasAnyFilter && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {activeFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={styles.filterPill}
              onPress={f.remove}
            >
              <Text style={styles.filterPillText}>{f.label}</Text>
              <Text style={styles.filterPillX}> ×</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.resetBtn} onPress={onResetFilters}>
            <Text style={styles.resetText}>{t(mapText.resetAll)}</Text>
          </TouchableOpacity>
        </ScrollView>
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
  filterScroll: {
    gap: spacing.xs,
    alignItems: "center",
    paddingVertical: 2,
    paddingBottom: spacing.xs,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
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
  filterPillText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  filterPillX: { fontSize: 13, color: colors.textSecondary },
  resetBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  resetText: { fontSize: 13, fontWeight: "600", color: colors.white },
});

export default RadiusControls;

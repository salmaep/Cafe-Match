import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { mapText } from "@shared/i18n/keys";
import { colors, spacing, radius } from "../../../theme";
import { formatDuration } from "../utils";

type Props = {
  topInset: number;
  cafeName: string;
  durationSec: number;
  checkoutLoading: boolean;
  onCheckOut: () => void;
};

function ActiveCheckinCard({
  topInset,
  cafeName,
  durationSec,
  checkoutLoading,
  onCheckOut,
}: Props) {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, { top: topInset + 80 }]}>
      <View style={styles.left}>
        <View style={styles.dot} />
      </View>
      <View style={styles.body}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{t(mapText.checkingIn)}</Text>
          <Text style={styles.duration}>{formatDuration(durationSec)}</Text>
        </View>
        <Text style={styles.cafeName} numberOfLines={1}>
          {cafeName}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.checkoutBtn}
        onPress={onCheckOut}
        disabled={checkoutLoading}
        activeOpacity={0.8}
      >
        <Text style={styles.checkoutBtnText}>
          {checkoutLoading ? "..." : t(mapText.checkOut)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 4,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    zIndex: 999,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  left: {
    marginRight: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },
  body: { flex: 1 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.success,
    letterSpacing: 0.6,
  },
  duration: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  cafeName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  checkoutBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

export default ActiveCheckinCard;

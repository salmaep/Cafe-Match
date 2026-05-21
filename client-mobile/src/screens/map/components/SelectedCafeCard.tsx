import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import CafePhoto from "../../../components/CafePhoto";
import { Cafe } from "../../../types";
import { colors, spacing, radius } from "../../../theme";

type Props = {
  cafe: Cafe;
  onPress: () => void;
  onDismiss: () => void;
};

function SelectedCafeCard({ cafe, onPress, onDismiss }: Props) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
        <CafePhoto photos={cafe.photos} name={cafe.name} style={styles.photo} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {cafe.name}
          </Text>
          <Text style={styles.dist}>{cafe.distance} km away</Text>
          <View style={styles.tags}>
            {(cafe.purposes ?? []).slice(0, 2).map((p) => (
              <View key={p} style={styles.tag}>
                <Text style={styles.tagText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
        <Text style={styles.dismissText}>Tutup ×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.accent,
    elevation: 3,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    resizeMode: "cover",
  },
  info: { flex: 1, marginLeft: spacing.sm },
  name: { fontSize: 15, fontWeight: "700", color: colors.primary },
  dist: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  tags: { flexDirection: "row", gap: 4, marginTop: 4 },
  tag: {
    backgroundColor: colors.accent + "20",
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: colors.accent },
  arrow: { fontSize: 22, color: colors.accent, marginLeft: spacing.sm },
  dismiss: { alignSelf: "flex-end", marginTop: 6 },
  dismissText: { fontSize: 12, color: colors.textSecondary },
});

export default SelectedCafeCard;

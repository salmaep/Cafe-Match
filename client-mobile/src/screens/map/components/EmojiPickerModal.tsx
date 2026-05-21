import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { commonText, mapText } from "@shared/i18n/keys";
import { colors, spacing, radius } from "../../../theme";
import { formatDuration } from "../utils";

type Friend = {
  id: number | string;
  name?: string;
  currentCafe?: { name?: string } | null;
  checkInAt?: string | null;
};

type Props = {
  friend: Friend | null;
  onDismiss: () => void;
  onPickEmoji: (emoji: string) => void;
};

const EMOJIS = ["👋", "☕", "🔥", "💥", "😂", "❤️", "🎉", "😎"];

function EmojiPickerModal({ friend, onDismiss, onPickEmoji }: Props) {
  const { t } = useTranslation();
  if (!friend) return null;
  const durationSec = friend.checkInAt
    ? Math.max(0, Math.floor((Date.now() - new Date(friend.checkInAt).getTime()) / 1000))
    : 0;

  return (
    <TouchableOpacity
      style={styles.backdrop}
      activeOpacity={1}
      onPress={onDismiss}
    >
      <View style={styles.picker}>
        <Text style={styles.title}>{friend.name}</Text>
        <Text style={styles.sub}>📍 {friend.currentCafe?.name}</Text>
        {friend.checkInAt && (
          <Text style={styles.duration}>
            {t(mapText.checkinAgo, { time: formatDuration(durationSec) })}
          </Text>
        )}
        <View style={styles.row}>
          {EMOJIS.map((e) => (
            <TouchableOpacity
              key={e}
              style={styles.btn}
              onPress={() => onPickEmoji(e)}
              activeOpacity={0.6}
            >
              <Text style={styles.btnText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
          <Text style={styles.cancelText}>{t(commonText.cancel)}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  picker: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    minWidth: 280,
    alignItems: "center",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
  },
  sub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  duration: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.success,
    marginTop: 4,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: { fontSize: 28 },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default EmojiPickerModal;

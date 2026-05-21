import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing } from "../../../theme";

type Props = {
  topOffset: number;
  showCafePins: boolean;
  showFriendPins: boolean;
  onToggleCafePins: () => void;
  onToggleFriendPins: () => void;
};

function PinTogglesOverlay({
  topOffset,
  showCafePins,
  showFriendPins,
  onToggleCafePins,
  onToggleFriendPins,
}: Props) {
  return (
    <View style={[styles.container, { top: topOffset, right: spacing.md }]}>
      <TouchableOpacity
        style={[styles.btn, showCafePins && styles.btnActive]}
        onPress={onToggleCafePins}
      >
        <Text style={[styles.emoji, showCafePins && styles.emojiActive]}>☕</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, showFriendPins && styles.btnActive]}
        onPress={onToggleFriendPins}
      >
        <Text style={[styles.emoji, showFriendPins && styles.emojiActive]}>👥</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    flexDirection: "column",
    gap: 8,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  btnActive: {
    backgroundColor: "#D48B3A",
    borderColor: "#D48B3A",
  },
  emoji: { fontSize: 18 },
  emojiActive: { color: colors.white },
});

export default PinTogglesOverlay;

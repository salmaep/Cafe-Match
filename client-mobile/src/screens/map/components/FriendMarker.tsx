import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import { colors } from "../../../theme";

type Friend = {
  id: number | string;
  name?: string;
  currentCafe?: { latitude: number; longitude: number } | null;
};

type Props = {
  friend: Friend;
  onPress: () => void;
};

function FriendMarker({ friend, onPress }: Props) {
  if (!friend.currentCafe) return null;
  return (
    <Marker
      coordinate={{
        latitude: friend.currentCafe.latitude + 0.00015,
        longitude: friend.currentCafe.longitude + 0.00015,
      }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={10}
      tracksViewChanges={false}
      {...({ cluster: false } as any)}
    >
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(friend.name || "?")[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.tail} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: colors.white,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  avatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.white,
  },
});

export default FriendMarker;

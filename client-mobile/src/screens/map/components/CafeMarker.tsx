import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Marker } from "react-native-maps";
import Svg, { Path } from "react-native-svg";
import { Cafe } from "../../../types";
import { colors, radius } from "../../../theme";
import { TEARDROP_PATH } from "../utils";

type Props = {
  cafe: Cafe;
  coordinate: { latitude: number; longitude: number };
  friendCount: number;
  isPromoted: boolean;
  bounceAnim: Animated.Value;
  onPress: (cafe: Cafe) => void;
};

const CafeMarker = React.memo(function CafeMarker({
  cafe,
  coordinate,
  friendCount,
  isPromoted,
  bounceAnim,
  onPress,
}: Props) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    if (isPromoted) return;
    setTracks(true);
    const id = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(id);
  }, [isPromoted, friendCount]);

  const handlePress = useCallback(() => onPress(cafe), [onPress, cafe]);
  const w = isPromoted ? 32 : 28;
  const h = Math.round((w * 7) / 6);
  const innerDot = Math.round(w * 0.55);
  const ringPad = 1.5;
  const color = isPromoted ? "#dc2626" : "#d97706";
  const headCenterY = Math.round((h * 3) / 7);

  return (
    <Marker
      coordinate={coordinate}
      onPress={handlePress}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={isPromoted ? true : tracks}
      zIndex={isPromoted ? 1000 : undefined}
    >
      <View style={styles.container} collapsable={false}>
        {isPromoted && (
          <Animated.View
            style={[styles.newBadge, { transform: [{ translateY: bounceAnim }] }]}
          >
            <Text style={styles.newBadgeText}>NEW!</Text>
          </Animated.View>
        )}
        {friendCount > 0 && (
          <View style={styles.friendBadge}>
            <Text style={styles.friendBadgeText}>{friendCount}👤</Text>
          </View>
        )}
        <View
          collapsable={false}
          style={{ width: w, height: h, alignItems: "center" }}
        >
          <Svg width={w} height={h} viewBox="0 0 24 28">
            <Path d={TEARDROP_PATH} fill={color} />
          </Svg>
          <View
            collapsable={false}
            style={{
              position: "absolute",
              top: headCenterY - innerDot / 2 - ringPad,
              padding: ringPad,
              backgroundColor: "#ffffff",
              borderRadius: (innerDot + ringPad * 2) / 2,
            }}
          >
            <View
              collapsable={false}
              style={{
                width: innerDot,
                height: innerDot,
                borderRadius: innerDot / 2,
                backgroundColor: color,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={isPromoted ? styles.iconPromoted : styles.icon}>
                ☕
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 11,
    lineHeight: 13,
    textAlign: "center",
  },
  iconPromoted: {
    fontSize: 13,
    lineHeight: 15,
    textAlign: "center",
  },
  newBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  friendBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  friendBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
});

export default CafeMarker;

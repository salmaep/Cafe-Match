import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import Svg, { Path } from "react-native-svg";
import { TEARDROP_PATH } from "../utils";

type Props = {
  lat: number;
  lng: number;
  count: number;
  onPress: () => void;
};

const ClusterMarker = React.memo(function ClusterMarker({
  lat,
  lng,
  count,
  onPress,
}: Props) {
  const w = 32;
  const h = Math.round((w * 7) / 6);
  const innerDot = Math.round(w * 0.74);
  const ringPad = 2;
  const headCenterY = Math.round((h * 3) / 7);
  const label =
    count < 1000
      ? String(count)
      : count < 1000000
        ? `${Math.floor(count / 1000)}k`
        : `${Math.floor(count / 1000000)}M`;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges
      onPress={onPress}
    >
      <View
        collapsable={false}
        style={{ width: w, height: h, alignItems: "center" }}
      >
        <Svg width={w} height={h} viewBox="0 0 24 28">
          <Path d={TEARDROP_PATH} fill="#d97706" />
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
              backgroundColor: "#d97706",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={styles.icon}>☕</Text>
            <Text style={styles.text}>{label}</Text>
          </View>
        </View>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  text: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    lineHeight: 9,
  },
  icon: {
    color: "#FFFFFF",
    fontSize: 8,
    lineHeight: 9,
  },
});

export default ClusterMarker;

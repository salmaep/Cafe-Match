import React from "react";
import { View, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import { colors } from "../../../theme";

type Props = {
  latitude: number;
  longitude: number;
};

function SearchCenterMarker({ latitude, longitude }: Props) {
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
      tracksViewChanges={false}
      {...({ cluster: false } as any)}
    >
      <View style={styles.ring}>
        <View style={styles.dot} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(212, 139, 58, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default SearchCenterMarker;

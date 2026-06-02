import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

type Props = {
  /** Fill color of the status-bar strip. Defaults to the app background. */
  color?: string;
};

/**
 * Opaque strip covering exactly the top safe-area (status bar / notch) so that
 * scrolled content underneath doesn't bleed into the clock/notch area. Gives a
 * clean status-bar boundary on full-bleed screens (map, cafe detail, profile),
 * matching the solid status-bar zone on the Trending screen.
 *
 * Sits above everything via zIndex/elevation and ignores touches.
 */
export default function StatusBarScrim({ color = colors.background }: Props) {
  const insets = useSafeAreaInsets();
  if (insets.top <= 0) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.scrim, { height: insets.top, backgroundColor: color }]}
    />
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
});

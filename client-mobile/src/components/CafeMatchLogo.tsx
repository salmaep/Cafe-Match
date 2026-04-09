import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';

interface Props {
  size?: number;
  color?: string;
}

export default function CafeMatchLogo({ size = 48, color = colors.primary }: Props) {
  const iconSize = size * 0.7;
  return (
    <View style={styles.container}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 64 64" fill="none">
        {/* Coffee cup body */}
        <Path
          d="M12 24h32v24c0 4.418-3.582 8-8 8H20c-4.418 0-8-3.582-8-8V24z"
          fill={color}
        />
        {/* Cup handle */}
        <Path
          d="M44 28h4c3.314 0 6 2.686 6 6v4c0 3.314-2.686 6-6 6h-4"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Steam lines */}
        <Path
          d="M22 18c0-3 2-5 0-8"
          stroke={colors.accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <Path
          d="M28 16c0-3 2-5 0-8"
          stroke={colors.accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <Path
          d="M34 18c0-3 2-5 0-8"
          stroke={colors.accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Location pin dot on cup */}
        <Circle cx="28" cy="38" r="4" fill={colors.accent} />
        <Path
          d="M28 34c-2.761 0-5 2.239-5 5s5 9 5 9 5-6.239 5-9-2.239-5-5-5z"
          fill={colors.accent}
          opacity={0.3}
        />
      </Svg>
      <Text style={[styles.wordmark, { fontSize: size * 0.5, color }]}>
        Cafe<Text style={{ color: colors.accent }}>Match</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: -1,
  },
});

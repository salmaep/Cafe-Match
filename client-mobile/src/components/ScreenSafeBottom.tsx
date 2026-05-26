import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = ViewProps & {
  extra?: number;
};

export default function ScreenSafeBottom({ children, style, extra = 0, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.flex, style, { paddingBottom: insets.bottom + extra }]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

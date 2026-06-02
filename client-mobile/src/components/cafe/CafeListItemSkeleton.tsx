import React from 'react';
import { View, StyleSheet } from 'react-native';

function CafeListItemSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.photo} />
      <View style={styles.body}>
        <View style={styles.titleLine} />
        <View style={styles.metaLine} />
        <View style={styles.localityLine} />
        <View style={styles.chipRow}>
          <View style={styles.chipStub} />
          <View style={styles.chipStub} />
          <View style={styles.chipStubShort} />
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.favStub} />
      </View>
    </View>
  );
}

const BLOCK = '#EAE7E0';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    padding: 12,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: BLOCK,
  },
  body: { flex: 1, minWidth: 0, gap: 6, paddingTop: 2 },
  titleLine: { width: '70%', height: 14, borderRadius: 4, backgroundColor: BLOCK },
  metaLine: { width: '50%', height: 11, borderRadius: 4, backgroundColor: BLOCK },
  localityLine: { width: '40%', height: 10, borderRadius: 4, backgroundColor: BLOCK },
  chipRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  chipStub: { width: 50, height: 16, borderRadius: 999, backgroundColor: BLOCK },
  chipStubShort: { width: 32, height: 16, borderRadius: 999, backgroundColor: BLOCK },
  right: { width: 40, alignItems: 'flex-end', paddingTop: 2 },
  favStub: { width: 28, height: 14, borderRadius: 4, backgroundColor: BLOCK },
});

export default React.memo(CafeListItemSkeleton);

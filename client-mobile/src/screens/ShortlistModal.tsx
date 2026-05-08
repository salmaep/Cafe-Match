import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import CafePhoto from '../components/CafePhoto';
import { useShortlist } from '../context/ShortlistContext';
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';

const SCREEN_PADDING = spacing.md;
const COL_GAP = spacing.sm;
const NUM_COLUMNS = 3;

export default function ShortlistModal() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { shortlist, removeFromShortlist } = useShortlist();

  const screenW = Dimensions.get('window').width;
  const tileW = Math.floor(
    (screenW - SCREEN_PADDING * 2 - COL_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
  );

  const openDetail = (cafe: Cafe) => {
    navigation.navigate('CafeDetail', { cafe });
  };

  return (
    <View style={styles.container}>
      <View style={styles.handleBar} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shortlist</Text>
          <Text style={styles.subtitle}>
            {shortlist.length} cafe{shortlist.length === 1 ? '' : 's'} tersimpan
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtn}>Tutup</Text>
        </TouchableOpacity>
      </View>

      {shortlist.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>☕</Text>
          <Text style={styles.emptyTitle}>Belum ada cafe</Text>
          <Text style={styles.emptySubtitle}>
            Swipe kanan di Discover untuk menyimpan ke shortlist!
          </Text>
        </View>
      ) : (
        <FlatList
          data={shortlist}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tile, { width: tileW }]}
              onPress={() => openDetail(item)}
              activeOpacity={0.85}
            >
              <View style={[styles.photoWrap, { height: tileW }]}>
                <CafePhoto
                  photos={item.photos}
                  name={item.name}
                  style={styles.photo}
                />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeFromShortlist(item.id)}
                  hitSlop={8}
                >
                  <Text style={styles.removeIcon}>×</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tileInfo}>
                <Text style={styles.tileName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.distance != null && (
                  <Text style={styles.tileMeta} numberOfLines={1}>
                    {item.distance} km
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.textSecondary + '40',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  closeBtn: { fontSize: 14, color: colors.accent, fontWeight: '700' },

  list: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: { gap: COL_GAP, marginBottom: COL_GAP },

  tile: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    overflow: 'hidden',
  },
  photoWrap: { position: 'relative', backgroundColor: colors.surface },
  photo: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  removeIcon: {
    color: colors.white, fontSize: 16,
    fontWeight: '700', lineHeight: 18,
  },
  tileInfo: { paddingHorizontal: 8, paddingVertical: 6 },
  tileName: { fontSize: 12, fontWeight: '700', color: colors.primary },
  tileMeta: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.primary },
  emptySubtitle: {
    fontSize: 13, color: colors.textSecondary,
    marginTop: 6, textAlign: 'center', maxWidth: 260,
  },
});

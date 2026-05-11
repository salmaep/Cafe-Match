import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import CafeListItem from '../components/cafe/CafeListItem';
import { useShortlist } from '../context/ShortlistContext';
import { useLocation } from '../context/LocationContext';
import { haversineKm } from '../queries/cafes/mappers';
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';

const SCREEN_PADDING = spacing.md;

type SortMode = 'recent' | 'distance' | 'rating';

export default function ShortlistModal() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { shortlist, removeFromShortlist, clearShortlist } = useShortlist();
  const { latitude, longitude } = useLocation();
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const sortedShortlist = useMemo(() => {
    if (sortMode === 'recent') return shortlist;
    const arr = [...shortlist];
    if (sortMode === 'distance' && latitude != null && longitude != null) {
      arr.sort((a, b) => {
        const da = haversineKm(latitude, longitude, a.latitude, a.longitude);
        const db = haversineKm(latitude, longitude, b.latitude, b.longitude);
        return da - db;
      });
    } else if (sortMode === 'rating') {
      arr.sort((a, b) => (b.googleRating ?? 0) - (a.googleRating ?? 0));
    }
    return arr;
  }, [shortlist, sortMode, latitude, longitude]);

  const handleClearAll = () => {
    if (shortlist.length === 0) return;
    Alert.alert(
      'Hapus semua?',
      `Hapus semua ${shortlist.length} cafe dari shortlist?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus semua',
          style: 'destructive',
          onPress: () => clearShortlist(),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.handleBar} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Shortlist</Text>
          <Text style={styles.subtitle}>
            {shortlist.length > 0
              ? `${shortlist.length} cafe disimpan untuk dikunjungi nanti`
              : 'Swipe kanan di Discover untuk menyimpan cafe'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtn}>Tutup</Text>
        </TouchableOpacity>
      </View>

      {shortlist.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>Shortlist masih kosong</Text>
          <Text style={styles.emptySubtitle}>
            Buka Discover, swipe kanan cafe yang menarik — semua tersimpan di sini.
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => {
              navigation.goBack();
              navigation.navigate('MainTabs', { screen: 'Discover' });
            }}
          >
            <Text style={styles.emptyCtaText}>🃏 Mulai Discover</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Sort + clear toolbar — mirrors web ShortlistPage */}
          <View style={styles.toolbar}>
            <View style={styles.sortPills}>
              <SortPill
                active={sortMode === 'recent'}
                onPress={() => setSortMode('recent')}
                label="Terbaru"
              />
              <SortPill
                active={sortMode === 'distance'}
                onPress={() => setSortMode('distance')}
                label="Terdekat"
              />
              <SortPill
                active={sortMode === 'rating'}
                onPress={() => setSortMode('rating')}
                label="Rating"
              />
            </View>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearAll}
              hitSlop={6}
            >
              <Text style={styles.clearBtnText}>🗑️ Hapus semua</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={sortedShortlist}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <CafeListItem
                cafe={item}
                rightAccessory={
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeFromShortlist(String(item.id))}
                    hitSlop={8}
                  >
                    <Text style={styles.removeIcon}>✕</Text>
                  </TouchableOpacity>
                }
              />
            )}
          />
        </>
      )}
    </View>
  );
}

function SortPill({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.sortPill, active && styles.sortPillActive]}
    >
      <Text
        style={[
          styles.sortPillText,
          active && styles.sortPillTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary + '40',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: { fontSize: 14, color: colors.accent, fontWeight: '700' },

  // Sort + clear toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: spacing.sm,
  },
  sortPills: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    gap: 2,
  },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sortPillActive: { backgroundColor: '#1C1C1A' },
  sortPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sortPillTextActive: { color: colors.white },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // List
  list: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  separator: { height: spacing.sm },

  // Remove (X) accessory — overrides the default fav-count/chev in CafeListItem
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.primary },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.lg,
  },
  emptyCta: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  emptyCtaText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});

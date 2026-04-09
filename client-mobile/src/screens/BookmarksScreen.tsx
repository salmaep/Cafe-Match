import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { fetchBookmarks, toggleBookmark } from '../services/api';
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';

export default function BookmarksScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBookmarks();
      setCafes(data);
    } catch {
      setCafes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadBookmarks();
    }
  }, [user, loadBookmarks]);

  const handleUnbookmark = async (cafe: Cafe) => {
    // Optimistic removal
    setCafes(prev => prev.filter(c => c.id !== cafe.id));
    setRemovingId(cafe.id);
    try {
      await toggleBookmark(cafe.id);
    } catch {
      // Revert on failure
      setCafes(prev => {
        const exists = prev.find(c => c.id === cafe.id);
        if (!exists) return [cafe, ...prev];
        return prev;
      });
    } finally {
      setRemovingId(null);
    }
  };

  // ─── Guest View ───
  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookmarks</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.guestContainer}>
          <Text style={styles.guestEmoji}>🔖</Text>
          <Text style={styles.guestTitle}>My Bookmarks</Text>
          <Text style={styles.guestSubtitle}>Login to see your bookmarked cafes</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('AuthModal')}
          >
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Loading State ───
  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookmarks</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  // ─── Render Item ───
  const renderItem = ({ item }: { item: Cafe }) => {
    const photoUri =
      item.photos && item.photos.length > 0
        ? item.photos[0]
        : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';
    const topPurposes = item.purposes ? item.purposes.slice(0, 2) : [];
    const distanceLabel =
      item.distance != null
        ? item.distance < 1
          ? `${Math.round(item.distance * 1000)} m away`
          : `${item.distance.toFixed(1)} km away`
        : '';
    const isRemoving = removingId === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CafeDetail', { cafe: item })}
      >
        {/* Photo */}
        <Image source={{ uri: photoUri }} style={styles.cardPhoto} />

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          {distanceLabel ? (
            <Text style={styles.cardDistance}>{distanceLabel}</Text>
          ) : null}
          {topPurposes.length > 0 && (
            <View style={styles.pillRow}>
              {topPurposes.map(p => (
                <View key={p} style={styles.pill}>
                  <Text style={styles.pillText}>{p}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Unbookmark Button */}
        <TouchableOpacity
          style={styles.unbookmarkBtn}
          onPress={() => handleUnbookmark(item)}
          disabled={isRemoving}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.bookmarkIcon}>{isRemoving ? '📑' : '🔖'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ─── Empty State ───
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🔖</Text>
      <Text style={styles.emptyTitle}>No bookmarks yet</Text>
      <Text style={styles.emptySubtitle}>Cafes you bookmark will appear here</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookmarks</Text>
        <View style={styles.headerRight}>
          {cafes.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{cafes.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={cafes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={cafes.length === 0 ? styles.listEmptyContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  headerRight: {
    width: 36,
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  countBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  guestEmoji: {
    fontSize: 52,
    marginBottom: spacing.md,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  guestSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  loginBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
  },
  listEmptyContent: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPhoto: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 3,
  },
  cardDistance: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  unbookmarkBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkIcon: {
    fontSize: 22,
  },
  separator: {
    height: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

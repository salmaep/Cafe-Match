import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchLeaderboard } from '../services/api';
import { LeaderboardEntry } from '../types';
import { colors, spacing, radius } from '../theme';

type RouteParams = { Leaderboard: { cafeId: string; cafeName: string } };

const RANK_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
const RANK_EMOJIS: Record<number, string> = { 1: '👑', 2: '🥈', 3: '🥉' };

export default function LeaderboardScreen() {
  const route = useRoute<RouteProp<RouteParams, 'Leaderboard'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { cafeId, cafeName } = route.params;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard(cafeId).then(setEntries).finally(() => setLoading(false));
  }, [cafeId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Leaderboard · {cafeName}</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 60 }} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Belum ada data check-in</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => String(e.userId)}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => {
            const isTop3 = item.rank <= 3;
            return (
              <View style={[styles.row, isTop3 && styles.rowTop3]}>
                <View style={[styles.rankBadge, { backgroundColor: RANK_COLORS[item.rank] || colors.surface }]}>
                  <Text style={styles.rankNum}>{RANK_EMOJIS[item.rank] || `#${item.rank}`}</Text>
                </View>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.badge && <Text style={styles.badge}>{item.badge}</Text>}
                </View>
                <View style={styles.countBox}>
                  <Text style={styles.count}>{item.checkinCount}</Text>
                  <Text style={styles.countLabel}>visits</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surface,
    backgroundColor: colors.white,
  },
  back: { fontSize: 15, color: colors.accent, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary, flex: 1, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: colors.textSecondary },

  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
    elevation: 1,
  },
  rowTop3: { borderWidth: 1.5, borderColor: colors.accent + '40' },
  rankBadge: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankNum: { fontSize: 14, fontWeight: '800', color: colors.primary },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent + '20',
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.accent },
  name: { fontSize: 15, fontWeight: '700', color: colors.primary },
  badge: { fontSize: 12, color: colors.accent, fontWeight: '600', marginTop: 1 },
  countBox: { alignItems: 'center' },
  count: { fontSize: 20, fontWeight: '800', color: colors.primary },
  countLabel: { fontSize: 10, color: colors.textSecondary },
});

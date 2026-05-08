import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchGlobalLeaderboard } from '../services/api';
import { GlobalLeaderboardEntry, LeaderboardPeriod } from '../types';
import { colors, spacing, radius } from '../theme';

// Rank colours matching the web (solid approximation of the gradients)
const RANK_COLORS: Record<number, string> = {
  1: '#F59E0B', // amber gold
  2: '#9CA3AF', // silver
  3: '#D97706', // bronze
};
const RANK_EMOJIS: Record<number, string> = { 1: '👑', 2: '🥈', 3: '🥉' };

// Pedestal heights (px) — 1st tallest in the middle
const PEDESTAL_HEIGHTS: Record<number, number> = { 1: 180, 2: 140, 3: 120 };

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// ─── Podium ──────────────────────────────────────────────────────────────────

function PodiumStep({ entry, isWinner }: { entry: GlobalLeaderboardEntry; isWinner?: boolean }) {
  const color = RANK_COLORS[entry.rank] || RANK_COLORS[3];
  const emoji = RANK_EMOJIS[entry.rank] || '';
  const height = PEDESTAL_HEIGHTS[entry.rank] || 120;
  const initials = getInitials(entry.name);
  const avatarSize = isWinner ? 68 : 56;

  return (
    <View style={styles.podiumStep}>
      {/* Avatar above pedestal */}
      <View style={[styles.podiumAvatarWrap, { width: avatarSize + 8, height: avatarSize + 8 }]}>
        <View style={[styles.podiumAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: color }]}>
          {entry.avatarUrl ? (
            <Image source={{ uri: entry.avatarUrl }} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} />
          ) : (
            <Text style={[styles.podiumAvatarText, { fontSize: isWinner ? 22 : 18 }]}>{initials}</Text>
          )}
        </View>
        <Text style={styles.podiumEmoji}>{emoji}</Text>
      </View>

      {/* Pedestal block */}
      <View style={[styles.pedestal, { height, backgroundColor: color }]}>
        <Text style={styles.pedestalRank}>{entry.rank}</Text>
        <Text style={styles.pedestalName} numberOfLines={2}>{entry.name}</Text>
        {entry.badge ? (
          <View style={styles.pedestalBadge}>
            <Text style={styles.pedestalBadgeText}>{entry.badge}</Text>
          </View>
        ) : null}
        {/* Score at bottom */}
        <View style={styles.pedestalScore}>
          <Text style={styles.pedestalScoreNum}>{Math.round(entry.score)}</Text>
          <Text style={styles.pedestalScoreLabel}>pts</Text>
        </View>
        {isWinner && <View style={styles.winnerGlow} />}
      </View>
    </View>
  );
}

function Podium({ entries }: { entries: GlobalLeaderboardEntry[] }) {
  const [first, second, third] = [entries[0], entries[1], entries[2]];
  // visual order: 2nd | 1st (middle) | 3rd
  return (
    <View style={styles.podiumRow}>
      {second ? <PodiumStep entry={second} /> : <View style={styles.podiumPlaceholder} />}
      {first ? <PodiumStep entry={first} isWinner /> : <View style={styles.podiumPlaceholder} />}
      {third ? <PodiumStep entry={third} /> : <View style={styles.podiumPlaceholder} />}
    </View>
  );
}

// ─── List row (rank 4+) ───────────────────────────────────────────────────────

function ListRow({ entry, isLast }: { entry: GlobalLeaderboardEntry; isLast: boolean }) {
  const initials = getInitials(entry.name);
  return (
    <View style={[styles.listRow, !isLast && styles.listRowBorder]}>
      {/* Rank */}
      <View style={styles.listRank}>
        <Text style={styles.listRankText}>{entry.rank}</Text>
      </View>

      {/* Avatar */}
      <View style={styles.listAvatar}>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={styles.listAvatarImg} />
        ) : (
          <Text style={styles.listAvatarText}>{initials}</Text>
        )}
      </View>

      {/* Name + stats */}
      <View style={styles.listInfo}>
        <View style={styles.listNameRow}>
          <Text style={styles.listName} numberOfLines={1}>{entry.name}</Text>
          {entry.badge ? (
            <View style={styles.listBadge}>
              <Text style={styles.listBadgeText}>{entry.badge}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.listStats}>
          <Text style={styles.listStatText}>☕ {entry.totalCheckins}</Text>
          <Text style={styles.listStatDot}>·</Text>
          <Text style={styles.listStatText}>📍 {entry.uniqueCafes} cafe</Text>
          <Text style={styles.listStatDot}>·</Text>
          <Text style={styles.listStatText}>{entry.totalDuration}</Text>
        </View>
      </View>

      {/* Score */}
      <View style={styles.listScoreBox}>
        <Text style={styles.listScore}>{Math.round(entry.score)}</Text>
        <Text style={styles.listScoreLabel}>pts</Text>
      </View>
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={{ opacity: pulse }}>
      {/* Podium skeleton */}
      <View style={styles.podiumRow}>
        {[140, 180, 120].map((h, i) => (
          <View key={i} style={styles.podiumStep}>
            <View style={[styles.skeletonCircle, { width: i === 1 ? 68 : 56, height: i === 1 ? 68 : 56, borderRadius: 34 }]} />
            <View style={[styles.skeletonBlock, { height: h }]} />
          </View>
        ))}
      </View>
      {/* List skeleton */}
      <View style={[styles.listCard, { marginTop: spacing.lg }]}>
        {[0, 1, 2, 3].map((k) => (
          <View key={k} style={[styles.listRow, k < 3 && styles.listRowBorder]}>
            <View style={[styles.skeletonBlock, { width: 28, height: 14, borderRadius: 4 }]} />
            <View style={[styles.skeletonCircle, { width: 44, height: 44, borderRadius: 22, marginHorizontal: spacing.sm }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[styles.skeletonBlock, { height: 12, width: '50%', borderRadius: 4 }]} />
              <View style={[styles.skeletonBlock, { height: 10, width: '35%', borderRadius: 4 }]} />
            </View>
            <View style={[styles.skeletonBlock, { width: 36, height: 20, borderRadius: 4 }]} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GlobalLeaderboardScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
  const [entries, setEntries] = useState<GlobalLeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchGlobalLeaderboard(period)
      .then((data) => setEntries(data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [period]);

  const top3 = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Siapa paling rajin ngafe?</Text>
        <Text style={styles.heroSubtitle}>
          Ranking berdasarkan check-in, cafe dikunjungi, dan total waktu nongkrong.
        </Text>

        {/* Period toggle */}
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodPill, period === 'month' && styles.periodPillActive]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.periodText, period === 'month' && styles.periodTextActive]}>
              📅 30 Hari
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodPill, period === 'all' && styles.periodPillActive]}
            onPress={() => setPeriod('all')}
          >
            <Text style={[styles.periodText, period === 'all' && styles.periodTextActive]}>
              🌟 All-time
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && entries === null ? (
          <Skeleton />
        ) : !entries || entries.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyTitle}>Belum ada yang masuk leaderboard</Text>
            <Text style={styles.emptySubtitle}>
              {period === 'month'
                ? 'Belum ada check-in dalam 30 hari terakhir. Yuk mulai!'
                : 'Belum ada check-in sama sekali. Jadi yang pertama!'}
            </Text>
          </View>
        ) : (
          <>
            {top3.length > 0 && <Podium entries={top3} />}

            {rest.length > 0 && (
              <>
                <Text style={styles.restLabel}>
                  Peringkat 4 – {entries?.length}
                </Text>
                <View style={styles.listCard}>
                  {rest.map((e, i) => (
                    <ListRow key={e.userId} entry={e} isLast={i === rest.length - 1} />
                  ))}
                </View>
              </>
            )}

            <Text style={styles.formula}>
              Score = (check-in × 2) + (cafe unik × 5) + (jam nongkrong × 1)
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 15, color: colors.accent, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.primary },

  // Hero
  hero: {
    backgroundColor: '#FFF8EC',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E9CC',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    padding: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F5E9CC',
  },
  periodPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  periodPillActive: {
    backgroundColor: colors.accent,
  },
  periodText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  periodTextActive: { color: colors.white },

  // Content
  content: { padding: spacing.md },

  // Podium
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  podiumStep: {
    flex: 1,
    alignItems: 'center',
  },
  podiumPlaceholder: { flex: 1 },
  podiumAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    position: 'relative',
  },
  podiumAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  podiumAvatarText: { color: colors.white, fontWeight: '800' },
  podiumEmoji: {
    position: 'absolute',
    top: -8,
    right: -4,
    fontSize: 22,
  },
  pedestal: {
    width: '100%',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    overflow: 'hidden',
  },
  pedestalRank: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 32,
  },
  pedestalName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
  },
  pedestalBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pedestalBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  pedestalScore: {
    position: 'absolute',
    bottom: spacing.sm,
    alignItems: 'center',
  },
  pedestalScoreNum: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 18,
  },
  pedestalScoreLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  winnerGlow: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,200,0.6)',
  },

  // List (rank 4+)
  restLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    gap: spacing.sm,
  },
  listRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  listRank: { width: 28, alignItems: 'center' },
  listRankText: { fontSize: 15, fontWeight: '800', color: colors.textSecondary },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  listAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  listAvatarText: { fontSize: 15, fontWeight: '700', color: colors.white },
  listInfo: { flex: 1, minWidth: 0 },
  listNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listName: { fontSize: 14, fontWeight: '700', color: colors.primary, flexShrink: 1 },
  listBadge: {
    backgroundColor: '#FFF1E0',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  listBadgeText: { fontSize: 9, fontWeight: '700', color: '#B45309' },
  listStats: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
  listStatText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  listStatDot: { fontSize: 11, color: colors.surface, marginHorizontal: 4 },
  listScoreBox: { alignItems: 'flex-end', minWidth: 40 },
  listScore: { fontSize: 16, fontWeight: '800', color: '#EA580C', lineHeight: 18 },
  listScoreLabel: { fontSize: 9, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Empty
  emptyBox: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.surface,
    borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.primary },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },

  // Score formula footnote
  formula: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xl,
  },

  // Skeleton
  skeletonBlock: { backgroundColor: colors.surface },
  skeletonCircle: { backgroundColor: colors.surface },
});

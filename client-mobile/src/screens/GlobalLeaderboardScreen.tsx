import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { socialText } from '@shared/i18n/keys';
import {
  fetchGlobalLeaderboard,
  type LeaderboardPeriod,
} from '../services/api';
import { colors, spacing, radius } from '../theme';

type Entry = Awaited<ReturnType<typeof fetchGlobalLeaderboard>>[number];

const PODIUM_STYLE: Record<
  number,
  { bg: string; emoji: string; height: number }
> = {
  1: { bg: '#F59E0B', emoji: '👑', height: 155 },
  2: { bg: '#9CA3AF', emoji: '🥈', height: 130 },
  3: { bg: '#D97706', emoji: '🥉', height: 118 },
};

export default function GlobalLeaderboardScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchGlobalLeaderboard(period)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [period]);

  const top3 = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(socialText.globalLbTitle)}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero strip */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{t(socialText.globalLbBadge)}</Text>
          </View>
          <Text style={styles.heroTitle}>
            Siapa{' '}
            <Text style={styles.heroTitleAccent}>{t(socialText.globalLbAccent)}</Text>{t(socialText.globalLbSuffix)}
          </Text>
          <Text style={styles.heroSubtitle}>
            {t(socialText.globalLbSubtitle)}
          </Text>

          <View style={styles.periodWrap}>
            <PeriodPill
              active={period === 'month'}
              label={t(socialText.period30Days)}
              onPress={() => setPeriod('month')}
            />
            <PeriodPill
              active={period === 'all'}
              label={t(socialText.periodAllTime)}
              onPress={() => setPeriod('all')}
            />
          </View>
        </View>

        <View style={styles.body}>
          {loading && entries === null ? (
            <ActivityIndicator
              size="large"
              color={colors.accent}
              style={{ marginTop: 60 }}
            />
          ) : entries && entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏆</Text>
              <Text style={styles.emptyTitle}>
                {t(socialText.globalLbEmpty)}
              </Text>
              <Text style={styles.emptySubtitle}>
                {period === 'month' ? t(socialText.globalLbEmptyMonth) : t(socialText.globalLbEmptyAll)}
              </Text>
            </View>
          ) : (
            <>
              {top3.length > 0 && <Podium entries={top3} />}

              {rest.length > 0 && (
                <View style={{ marginTop: spacing.lg }}>
                  <Text style={styles.listHeader}>
                    {t(socialText.rankingRange, { total: entries?.length })}
                  </Text>
                  <View style={styles.listCard}>
                    {rest.map((e, i) => (
                      <ListRow
                        key={e.userId}
                        entry={e}
                        isLast={i === rest.length - 1}
                      />
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.formula}>
                Score = (check-in × 2) + (cafe unik × 5) + (jam nongkrong × 1)
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function PeriodPill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.periodPill, active && styles.periodPillActive]}
    >
      <Text
        style={[styles.periodPillText, active && styles.periodPillTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Podium({ entries }: { entries: Entry[] }) {
  const [first, second, third] = entries;
  return (
    <View style={styles.podiumRow}>
      {second ? <PodiumStep entry={second} /> : <View style={{ flex: 1 }} />}
      {first && <PodiumStep entry={first} isWinner />}
      {third ? <PodiumStep entry={third} /> : <View style={{ flex: 1 }} />}
    </View>
  );
}

function PodiumStep({ entry, isWinner }: { entry: Entry; isWinner?: boolean }) {
  const { t } = useTranslation();
  const style = PODIUM_STYLE[entry.rank] || PODIUM_STYLE[3];
  const initials = entry.name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={styles.podiumStep}>
      <View style={styles.avatarWrap}>
        <View style={[styles.podiumAvatar, { backgroundColor: style.bg }]}>
          {entry.avatarUrl ? (
            <Image
              source={{ uri: entry.avatarUrl }}
              style={styles.avatarImg}
            />
          ) : (
            <Text style={styles.podiumAvatarText}>{initials}</Text>
          )}
        </View>
        <Text style={styles.podiumEmoji}>{style.emoji}</Text>
      </View>
      <View
        style={[
          styles.pedestal,
          { backgroundColor: style.bg, height: style.height },
          isWinner && styles.pedestalWinner,
        ]}
      >
        <Text style={styles.pedestalRank}>{entry.rank}</Text>
        <Text style={styles.pedestalName} numberOfLines={1}>
          {entry.name}
        </Text>
        {entry.badge && (
          <View style={styles.pedestalBadge}>
            <Text
              style={styles.pedestalBadgeText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {entry.badge}
            </Text>
          </View>
        )}
        <View style={styles.pedestalScore}>
          <Text style={styles.pedestalScoreNum}>{Math.round(entry.score)}</Text>
          <Text style={styles.pedestalScoreLabel}>{t(socialText.ptsLabel)}</Text>
        </View>
      </View>
    </View>
  );
}

function ListRow({ entry, isLast }: { entry: Entry; isLast: boolean }) {
  const { t } = useTranslation();
  const initials = entry.name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={[styles.listRow, !isLast && styles.listRowDivider]}>
      <Text style={styles.listRank}>{entry.rank}</Text>
      <View style={styles.listAvatar}>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.listAvatarText}>{initials}</Text>
        )}
      </View>
      <View style={styles.listInfo}>
        <View style={styles.listNameRow}>
          <Text style={styles.listName} numberOfLines={1}>
            {entry.name}
          </Text>
          {entry.badge && (
            <View style={styles.listBadge}>
              <Text style={styles.listBadgeText}>{entry.badge}</Text>
            </View>
          )}
        </View>
        <View style={styles.listStats}>
          <Text style={styles.listStat}>☕ {entry.totalCheckins}</Text>
          <Text style={styles.listStatDot}>·</Text>
          <Text style={styles.listStat}>📍 {entry.uniqueCafes} cafe</Text>
          <Text style={styles.listStatDot}>·</Text>
          <Text style={styles.listStat}>{entry.totalDuration}</Text>
        </View>
      </View>
      <View style={styles.listScoreBox}>
        <Text style={styles.listScoreNum}>{Math.round(entry.score)}</Text>
        <Text style={styles.listScoreLabel}>{t(socialText.ptsLabel)}</Text>
      </View>
    </View>
  );
}

const CARD_BORDER = '#F0EDE8';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  headerBtn: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { fontSize: 22, color: colors.primary, fontWeight: '600' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '700', color: colors.primary,
  },

  hero: {
    backgroundColor: '#FFF8EC',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#FDEFD3',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.full,
    borderWidth: 1, borderColor: '#FDE3B8',
    marginBottom: spacing.sm,
  },
  heroBadgeText: {
    fontSize: 10, fontWeight: '800',
    color: '#B45309', letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 24, fontWeight: '900',
    color: colors.primary, lineHeight: 30,
  },
  heroTitleAccent: { color: '#EA580C' },
  heroSubtitle: {
    fontSize: 13, color: '#5C5A52',
    marginTop: 6, lineHeight: 18,
  },
  periodWrap: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: '#FDE3B8',
    padding: 3, marginTop: spacing.md,
    alignSelf: 'flex-start',
    gap: 2,
  },
  periodPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  periodPillActive: { backgroundColor: '#F97316' },
  periodPillText: {
    fontSize: 11, fontWeight: '800',
    color: '#5C5A52',
  },
  periodPillTextActive: { color: colors.white },

  body: { padding: spacing.md },

  empty: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#E0DCD3',
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.primary },
  emptySubtitle: {
    fontSize: 13, color: colors.textSecondary,
    marginTop: 6, textAlign: 'center',
  },

  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  podiumStep: { flex: 1, alignItems: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 6 },
  podiumAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3, borderColor: colors.white,
  },
  avatarImg: { width: '100%', height: '100%' },
  podiumAvatarText: { color: colors.white, fontSize: 18, fontWeight: '900' },
  podiumEmoji: {
    position: 'absolute', top: -8, right: -8,
    fontSize: 22,
  },
  pedestal: {
    width: '100%',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingTop: spacing.sm,
    paddingHorizontal: 8, paddingBottom: 6,
    alignItems: 'center',
  },
  pedestalWinner: {
    borderTopWidth: 3, borderTopColor: '#FFD700',
  },
  pedestalRank: {
    color: colors.white, fontSize: 26, fontWeight: '900',
  },
  pedestalName: {
    color: colors.white, fontSize: 11, fontWeight: '800',
    textAlign: 'center', marginTop: 4,
  },
  pedestalBadge: {
    marginTop: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.full,
    maxWidth: '95%',
    alignSelf: 'center',
  },
  pedestalBadgeText: {
    color: colors.white, fontSize: 9, fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  pedestalScore: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 4,
  },
  pedestalScoreNum: {
    color: colors.white, fontSize: 13, fontWeight: '900',
  },
  pedestalScoreLabel: {
    color: 'rgba(255,255,255,0.85)', fontSize: 8, fontWeight: '800',
    letterSpacing: 1,
  },

  listHeader: {
    fontSize: 11, fontWeight: '800',
    color: colors.primary, letterSpacing: 1.2,
    marginBottom: 8, paddingHorizontal: 4,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  listRowDivider: { borderBottomWidth: 1, borderBottomColor: CARD_BORDER },
  listRank: {
    width: 28, textAlign: 'center',
    fontSize: 14, fontWeight: '800', color: colors.textSecondary,
  },
  listAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  listAvatarText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  listInfo: { flex: 1, minWidth: 0 },
  listNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listName: { fontSize: 13, fontWeight: '800', color: colors.primary, flexShrink: 1 },
  listBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: '#FFF1E0',
  },
  listBadgeText: { fontSize: 9, fontWeight: '800', color: '#B45309' },
  listStats: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 2, flexWrap: 'wrap',
  },
  listStat: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  listStatDot: { fontSize: 11, color: '#D9D6CE', marginHorizontal: 4 },
  listScoreBox: { alignItems: 'flex-end' },
  listScoreNum: { fontSize: 15, fontWeight: '900', color: '#EA580C' },
  listScoreLabel: {
    fontSize: 8, fontWeight: '800',
    color: colors.textSecondary, letterSpacing: 1,
    marginTop: 1,
  },

  formula: {
    fontSize: 11, color: '#A8A59C',
    textAlign: 'center', marginTop: spacing.lg,
  },
});

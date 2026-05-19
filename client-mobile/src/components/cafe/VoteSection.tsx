import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { usePurposes } from '../../queries/purposes/use-purposes';
import {
  useCastVote,
  useMyVotes,
  useVoteTallies,
} from '../../queries/votes/use-votes';
import { LucideIcon } from '../../utils/lucideIcon';
import { colors, spacing, radius } from '../../theme';

interface Props {
  cafeId: number;
}

const MAX_VOTES = 3;

// `purpose.icon` from the server is a lucide-style name (e.g. "coffee",
// "heart"). LucideIcon resolves it via the shared ICON_MAP and falls back to
// <Star> if unknown.

export default function VoteSection({ cafeId }: Props) {
  const { user } = useAuth();
  const purposesQuery = usePurposes();
  const talliesQuery = useVoteTallies(cafeId);
  const myVotesQuery = useMyVotes(cafeId, !!user);
  const castVote = useCastVote(cafeId);

  const [selected, setSelected] = useState<number[]>([]);

  // Sync local selection from server when it loads or changes.
  useEffect(() => {
    if (myVotesQuery.data) setSelected(myVotesQuery.data);
  }, [myVotesQuery.data]);

  const purposes = purposesQuery.data ?? [];
  const tallies = talliesQuery.data ?? [];
  const totalVotes = tallies.reduce((sum, t) => sum + t.count, 0);
  const getCount = (purposeId: number) =>
    tallies.find((t) => t.purposeId === purposeId)?.count ?? 0;
  const getPercentage = (purposeId: number) =>
    totalVotes > 0 ? Math.round((getCount(purposeId) / totalVotes) * 100) : 0;

  const togglePurpose = (purposeId: number) => {
    setSelected((prev) => {
      if (prev.includes(purposeId)) return prev.filter((id) => id !== purposeId);
      if (prev.length >= MAX_VOTES) return prev;
      return [...prev, purposeId];
    });
  };

  const handleSubmit = () => {
    if (selected.length === 0) return;
    castVote.mutate(selected);
  };

  const sortedPurposes = [...purposes].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cafe ini paling cocok buat apa?</Text>
      <Text style={styles.subtitle}>
        {user
          ? `Pilih sampai ${MAX_VOTES} kategori (${selected.length}/${MAX_VOTES})`
          : 'Login dulu buat vote'}
      </Text>

      {purposesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />
      ) : purposesQuery.isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Gagal muat kategori.</Text>
          <Pressable onPress={() => purposesQuery.refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </Pressable>
        </View>
      ) : sortedPurposes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Belum ada kategori tersedia.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sortedPurposes.map((purpose) => {
            const isSelected = selected.includes(purpose.id);
            const count = getCount(purpose.id);
            const pct = getPercentage(purpose.id);
            const disabled =
              !user || (!isSelected && selected.length >= MAX_VOTES);

            return (
              <Pressable
                key={purpose.id}
                onPress={() => !disabled && togglePurpose(purpose.id)}
                disabled={disabled}
                style={[
                  styles.row,
                  isSelected && styles.rowSelected,
                  disabled && !isSelected && styles.rowDisabled,
                ]}
              >
                {/* Progress bar background */}
                <View
                  pointerEvents="none"
                  style={[styles.progressBar, { width: `${pct}%` }]}
                />
                <View style={styles.rowContent}>
                  <View style={styles.rowLabelRow}>
                    <LucideIcon
                      name={purpose.icon}
                      size={16}
                      strokeWidth={2}
                      color={isSelected ? colors.accent : colors.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.rowLabel,
                        isSelected && styles.rowLabelSelected,
                      ]}
                    >
                      {purpose.name}
                    </Text>
                  </View>
                  <Text style={styles.rowCount}>
                    {count} vote{count !== 1 ? 's' : ''} ({pct}%)
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {user && (
        <Pressable
          onPress={handleSubmit}
          disabled={castVote.isPending || selected.length === 0}
          style={[
            styles.submitBtn,
            (castVote.isPending || selected.length === 0) &&
              styles.submitBtnDisabled,
          ]}
        >
          <Text style={styles.submitText}>
            {castVote.isPending ? 'Menyimpan…' : 'Submit Vote'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.xs },
  row: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  rowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '12',
  },
  rowDisabled: { opacity: 0.6 },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.accent + '22',
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabelRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: colors.primary, flexShrink: 1 },
  rowLabelSelected: { color: colors.accent, fontWeight: '700' },
  rowCount: { fontSize: 11, color: colors.textSecondary },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  emptyState: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  retryText: { fontSize: 12, fontWeight: '700', color: colors.accent },
});

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
import { colors, spacing, radius } from '../../theme';

interface Props {
  cafeId: number;
}

const MAX_VOTES = 3;

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
      <Text style={styles.title}>What's this cafe best for?</Text>
      <Text style={styles.subtitle}>
        {user
          ? `Pilih sampai ${MAX_VOTES} kategori (${selected.length}/${MAX_VOTES})`
          : 'Login untuk vote'}
      </Text>

      {purposesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />
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
                  <Text
                    style={[
                      styles.rowLabel,
                      isSelected && styles.rowLabelSelected,
                    ]}
                  >
                    {purpose.icon ? `${purpose.icon}  ` : ''}
                    {purpose.name}
                  </Text>
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
  rowLabel: { fontSize: 14, fontWeight: '500', color: colors.primary },
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
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMyAchievements } from '../services/api';
import { AchievementDef } from '../types';
import { colors, spacing, radius } from '../theme';

const TIER_COLORS: Record<string, { bg: string; border: string }> = {
  bronze_1: { bg: '#F5E6D3', border: '#CD7F32' },
  bronze_2: { bg: '#E8D5BD', border: '#B87333' },
  silver_1: { bg: '#F0F0F0', border: '#C0C0C0' },
  silver_2: { bg: '#E0E0E0', border: '#A8A8A8' },
  gold_1: { bg: '#FFF8E1', border: '#FFD700' },
  gold_2: { bg: '#FFF0C0', border: '#FFC107' },
  platinum: { bg: '#F3E5F5', border: '#9C27B0' },
};

const CATEGORY_LABELS: Record<string, string> = {
  visit_general: 'Kunjungan',
  visit_purpose: 'Kategori',
  social: 'Sosial',
  streak: 'Streak',
  special: 'Spesial',
};

export default function AchievementsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [achievements, setAchievements] = useState<AchievementDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyAchievements().then(setAchievements).finally(() => setLoading(false));
  }, []);

  const grouped = achievements.reduce((acc, a) => {
    const cat = a.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {} as Record<string, AchievementDef[]>);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Achievements</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={Object.entries(grouped)}
          keyExtractor={([cat]) => cat}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item: [category, items] }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{CATEGORY_LABELS[category] || category}</Text>
              <View style={styles.grid}>
                {items.map((a) => {
                  const tier = TIER_COLORS[a.tier] || TIER_COLORS.bronze_1;
                  const unlocked = a.unlocked;
                  const pct = a.threshold > 0 ? Math.min(100, Math.round((a.progress / a.threshold) * 100)) : 0;
                  return (
                    <View key={a.id || a.slug} style={[styles.card, { backgroundColor: unlocked ? tier.bg : colors.surface, borderColor: unlocked ? tier.border : colors.surface }]}>
                      <Text style={styles.cardIcon}>{unlocked ? '🏆' : '🔒'}</Text>
                      <Text style={[styles.cardName, !unlocked && styles.cardNameLocked]} numberOfLines={2}>{a.name}</Text>
                      <Text style={styles.cardDesc} numberOfLines={2}>{a.description}</Text>
                      {!unlocked && (
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: tier.border }]} />
                        </View>
                      )}
                      <Text style={styles.cardProgress}>
                        {unlocked ? 'Tercapai!' : `${a.progress}/${a.threshold}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
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
  title: { fontSize: 18, fontWeight: '800', color: colors.primary },

  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    width: '48%', borderRadius: radius.md, padding: spacing.sm + 2,
    borderWidth: 1.5, minHeight: 140,
  },
  cardIcon: { fontSize: 28, marginBottom: spacing.xs },
  cardName: { fontSize: 13, fontWeight: '800', color: colors.primary, marginBottom: 2 },
  cardNameLocked: { color: colors.textSecondary },
  cardDesc: { fontSize: 11, color: colors.textSecondary, lineHeight: 15, marginBottom: spacing.xs },
  progressBar: { height: 5, borderRadius: 3, backgroundColor: colors.surface + 'A0', overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  cardProgress: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
});

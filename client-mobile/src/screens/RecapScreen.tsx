import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Coffee, X } from 'lucide-react-native';
import { commonText, recapText } from '@shared/i18n/keys';
import { fetchRecap, generateRecap } from '../services/api';
import { RecapData } from '../types';
import { colors, spacing, radius } from '../theme';

const { width, height } = Dimensions.get('window');
const YEAR = new Date().getFullYear();

export default function RecapScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    loadRecap();
  }, []);

  const loadRecap = async () => {
    setLoading(true);
    let data = await fetchRecap(YEAR);
    if (!data?.recapData) {
      data = await generateRecap(YEAR);
    }
    setRecap(data?.recapData || data || null);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>{t(recapText.loading)}</Text>
      </View>
    );
  }

  if (!recap) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>{t(recapText.empty)}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t(commonText.back)}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const slides = [
    // Slide 1: Title
    <View key="title" style={[styles.slide, { backgroundColor: '#1C1C1A' }]}>
      <Text style={styles.brandSmall}>{t(recapText.brand)}</Text>
      <Text style={styles.yearBig}>{YEAR}</Text>
      <Text style={styles.yearTitle}>{recap.yearTitle}</Text>
      <Text style={styles.slideHint}>{t(recapText.swipeHint)}</Text>
    </View>,

    // Slide 2: Stats
    <View key="stats" style={[styles.slide, { backgroundColor: '#2C1810' }]}>
      <Text style={styles.slideLabel}>{t(recapText.statsSlide)}</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{recap.totalCheckins}</Text>
          <Text style={styles.statLabel}>{t(recapText.checkinsLabel)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{recap.totalCafesVisited}</Text>
          <Text style={styles.statLabel}>{t(recapText.cafesVisitedLabel)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{recap.totalDurationHours}h</Text>
          <Text style={styles.statLabel}>{t(recapText.totalHoursLabel)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{recap.totalReviews}</Text>
          <Text style={styles.statLabel}>{t(recapText.reviewsLabel)}</Text>
        </View>
      </View>
    </View>,

    // Slide 3: Top cafes
    <View key="cafes" style={[styles.slide, { backgroundColor: '#1A2C1A' }]}>
      <Text style={styles.slideLabel}>{t(recapText.topCafesSlide)}</Text>
      {(recap.topCafes || []).map((c, i) => (
        <View key={c.cafeId || i} style={styles.topCafeRow}>
          <Text style={styles.topCafeRank}>#{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.topCafeName}>{c.name}</Text>
            <Text style={styles.topCafeVisits}>{t(recapText.visitsSuffix, { count: c.visits })}</Text>
          </View>
        </View>
      ))}
    </View>,

    // Slide 4: Social
    <View key="social" style={[styles.slide, { backgroundColor: '#1A1A2C' }]}>
      <Text style={styles.slideLabel}>{t(recapText.socialSlide)}</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{recap.achievementsUnlocked}</Text>
          <Text style={styles.statLabel}>{t(recapText.achievementsLabel)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{recap.friendsMade}</Text>
          <Text style={styles.statLabel}>{t(recapText.newFriendsLabel)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{recap.longestStreak}</Text>
          <Text style={styles.statLabel}>{t(recapText.longestStreakLabel)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{recap.favoriteDay}</Text>
          <Text style={styles.statLabel}>{t(recapText.favoriteDayLabel)}</Text>
        </View>
      </View>
    </View>,

    // Slide 5: Closing
    <View key="close" style={[styles.slide, { backgroundColor: '#2C1C10' }]}>
      <View style={styles.closingIconWrap}>
        <Coffee size={64} color={colors.white} strokeWidth={1.5} />
      </View>
      <Text style={styles.closingTitle}>{t(recapText.closingTitle, { yearTitle: recap.yearTitle })}</Text>
      <Text style={styles.closingText}>
        {t(recapText.closingBody, {
          hours: recap.totalDurationHours,
          cafes: recap.totalCafesVisited,
          day: recap.favoriteDay,
          category: recap.topPurpose,
        })}
      </Text>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>{t(recapText.backToProfile)}</Text>
      </TouchableOpacity>
    </View>,
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setSlideIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => item}
      />
      {/* Progress dots */}
      <View style={[styles.dots, { bottom: insets.bottom + 16 }]}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === slideIndex && styles.dotActive]} />
        ))}
      </View>
      {/* Close X */}
      <TouchableOpacity style={[styles.closeX, { top: insets.top + 12 }]} onPress={() => navigation.goBack()}>
        <X size={20} color={colors.white} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary, fontSize: 15 },
  emptyText: { fontSize: 16, color: colors.textSecondary },
  backBtn: { marginTop: spacing.md, backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  backBtnText: { color: colors.white, fontWeight: '700' },

  slide: { width, height, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  brandSmall: { fontSize: 16, color: colors.accent, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  yearBig: { fontSize: 72, fontWeight: '900', color: colors.white, lineHeight: 80 },
  yearTitle: { fontSize: 26, fontWeight: '800', color: colors.accent, marginTop: spacing.sm, textAlign: 'center' },
  slideHint: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: spacing.xl },

  slideLabel: { fontSize: 22, fontWeight: '800', color: colors.white, marginBottom: spacing.lg, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  statBox: {
    width: 140, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  statNum: { fontSize: 32, fontWeight: '900', color: colors.white },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  topCafeRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.sm,
    padding: spacing.sm + 2, marginBottom: spacing.xs,
  },
  topCafeRank: { fontSize: 20, fontWeight: '900', color: colors.accent, width: 40 },
  topCafeName: { fontSize: 15, fontWeight: '700', color: colors.white },
  topCafeVisits: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  closingIconWrap: { marginBottom: spacing.md },
  closingTitle: { fontSize: 28, fontWeight: '900', color: colors.accent, textAlign: 'center', marginBottom: spacing.md },
  closingText: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22 },
  closeBtn: { marginTop: spacing.xl, backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  closeBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },

  dots: { position: 'absolute', flexDirection: 'row', alignSelf: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: colors.accent, width: 20 },
  closeX: { position: 'absolute', right: spacing.md, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
});

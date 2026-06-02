import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, Dimensions, ScrollView, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { reviewsText } from '@shared/i18n/keys';
import { Star, X, ChevronLeft, Plus, Play, Video } from 'lucide-react-native';
import { useReviews } from '../queries/reviews/use-reviews';
import { useReviewSummary } from '../queries/reviews/use-review-summary';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import {
  prettyReviewCategory,
  reviewCategoryIcon,
} from '../constant/ui/review-categories';
import { LucideIcon } from '../utils/lucideIcon';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type RouteParams = { Reviews: { cafeId: string; cafeName: string } };

function StarRow({ score, size = 12 }: { score: number; size?: number }) {
  const n = Math.round(score);
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          color={colors.accent}
          fill={i < n ? colors.accent : 'transparent'}
          strokeWidth={i < n ? 0 : 1.5}
        />
      ))}
    </View>
  );
}

function CategoryLabel({ category }: { category: string }) {
  const icon = reviewCategoryIcon(category);
  return (
    <View style={styles.categoryLabelRow}>
      {icon && (
        <LucideIcon name={icon} size={12} color={colors.textSecondary} strokeWidth={2} />
      )}
      <Text style={styles.categoryLabelText}>{prettyReviewCategory(category)}</Text>
    </View>
  );
}

export default function ReviewsScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RouteParams, 'Reviews'>>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { cafeId, cafeName } = route.params;
  const { user } = useAuth();

  const goWriteReview = () => {
    if (!user) {
      navigation.navigate('AuthModal');
      return;
    }
    navigation.navigate('WriteReview', { cafeId, cafeName });
  };

  const reviewsQuery = useReviews(cafeId);
  const summaryQuery = useReviewSummary(cafeId);
  const reviews = reviewsQuery.data?.reviews ?? [];
  const summary = summaryQuery.data ?? [];
  const loading = reviewsQuery.isLoading || summaryQuery.isLoading;

  // Zoom modal state for media preview
  const [zoomMedia, setZoomMedia] = useState<
    { list: { mediaType: 'photo' | 'video'; url: string }[]; index: number } | null
  >(null);

  // Star-only summary (exclude mood_*/facility_* from star bars)
  const starSummary = summary.filter(
    (s) => !s.category.startsWith('mood_') && !s.category.startsWith('facility_'),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <ChevronLeft size={18} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.back}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Ulasan · {cafeName}</Text>
        <TouchableOpacity style={styles.writeRow} onPress={goWriteReview}>
          <Plus size={14} color={colors.accent} strokeWidth={2.5} />
          <Text style={styles.writeBtn}>Tulis</Text>
        </TouchableOpacity>
      </View>

      {/* Summary bars — STAR categories only (mood/facility excluded) */}
      {starSummary.length > 0 && (
        <View style={styles.summaryBox}>
          {starSummary.map((s) => (
            <View key={s.category} style={styles.summaryRow}>
              <CategoryLabel category={s.category} />
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${(s.avgScore / 5) * 100}%` }]} />
              </View>
              <Text style={styles.summaryScore}>{s.avgScore.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : reviews.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t(reviewsText.listEmpty)}</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={goWriteReview}
          >
            <Text style={styles.emptyBtnText}>{t(reviewsText.beTheFirst)}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reviews.filter((r) => r && r.id)}
          keyExtractor={(r, i) => r?.id || `review-${i}`}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => {
            if (!item) return null;
            // Separate ratings into star, mood, facility
            const ratings = item.ratings ?? [];
            const starRatings = ratings.filter(
              (r) => !r.category.startsWith('mood_') && !r.category.startsWith('facility_'),
            );
            const moodRatings = ratings.filter((r) => r.category.startsWith('mood_'));
            const facilityRatings = ratings.filter((r) => r.category.startsWith('facility_'));
            const overall = starRatings.find((r) => r.category === 'overall');
            const media = item.media ?? [];

            return (
              <View style={styles.card}>
                {/* Header: avatar + name + date */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.userName[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.userName}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                {/* 1. Star rating (overall shown prominently) */}
                {overall ? (
                  <View style={styles.overallStarsRow}>
                    <StarRow score={overall.score} size={14} />
                    <Text style={styles.overallScore}>{overall.score.toFixed(1)}</Text>
                  </View>
                ) : null}
                {/* Other star categories (ambiance, food_quality, etc.) if present */}
                {starRatings.filter((r) => r.category !== 'overall').length > 0 && (
                  <View style={styles.ratingsRow}>
                    {starRatings
                      .filter((r) => r.category !== 'overall')
                      .map((r) => (
                        <View key={r.category} style={styles.ratingChip}>
                          <CategoryLabel category={r.category} />
                          <StarRow score={r.score} size={11} />
                        </View>
                      ))}
                  </View>
                )}

                {/* 2. Mood + facility chips (as voted attributes, NOT ratings) */}
                {(moodRatings.length > 0 || facilityRatings.length > 0) && (
                  <View style={styles.attributesRow}>
                    {moodRatings.map((r) => (
                      <View key={r.category} style={styles.moodAttrChip}>
                        <CategoryLabel category={r.category} />
                      </View>
                    ))}
                    {facilityRatings.map((r) => (
                      <View key={r.category} style={styles.facilityAttrChip}>
                        <CategoryLabel category={r.category} />
                      </View>
                    ))}
                  </View>
                )}

                {/* 3. Review text */}
                {item.text ? <Text style={styles.reviewText}>{item.text}</Text> : null}

                {/* 4. Photos / videos — small thumbnails, tap to zoom */}
                {media.length > 0 && (
                  <View style={styles.mediaRow}>
                    {media.map((m, i) => (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.85}
                        onPress={() => setZoomMedia({ list: media, index: i })}
                      >
                        {m.mediaType === 'photo' ? (
                          <Image
                            source={{ uri: m.url }}
                            style={styles.mediaThumb}
                            cachePolicy="memory-disk"
                            transition={200}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.mediaThumb, styles.videoThumb]}>
                            <Play size={24} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Zoom modal — tap thumbnail to view larger, swipe between media */}
      <Modal
        visible={!!zoomMedia}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setZoomMedia(null)}
        statusBarTranslucent
      >
        <StatusBar hidden />
        <View style={styles.zoomRoot}>
          {zoomMedia && (
            <FlatList
              data={zoomMedia.list}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={zoomMedia.index}
              getItemLayout={(_, index) => ({
                length: SCREEN_W,
                offset: SCREEN_W * index,
                index,
              })}
              keyExtractor={(_, i) => 'zoom-' + i}
              renderItem={({ item }) => (
                <ScrollView
                  style={{ width: SCREEN_W, height: SCREEN_H }}
                  contentContainerStyle={styles.zoomScrollContent}
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  pinchGestureEnabled
                  centerContent
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                >
                  {item.mediaType === 'photo' ? (
                    <Image
                      source={{ uri: item.url }}
                      style={styles.zoomImage}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                  ) : (
                    <View style={styles.zoomVideoBox}>
                      <Video size={48} color={colors.textSecondary} strokeWidth={1.5} />
                      <Text style={styles.zoomVideoHint}>{t(reviewsText.videoPreview)}</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            />
          )}
          <TouchableOpacity
            style={styles.zoomCloseBtn}
            onPress={() => setZoomMedia(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={22} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </Modal>
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
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  back: { fontSize: 15, color: colors.accent, fontWeight: '600' },
  writeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary, flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },
  writeBtn: { fontSize: 14, fontWeight: '700', color: colors.accent },
  starsRow: { flexDirection: 'row', gap: 1 },
  categoryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  categoryLabelText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

  summaryBox: {
    backgroundColor: colors.white, margin: spacing.md, borderRadius: radius.md,
    padding: spacing.md, elevation: 1,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs + 2, gap: spacing.sm },
  barBg: { flex: 1, height: 8, backgroundColor: colors.surface, borderRadius: 4, marginHorizontal: spacing.sm, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  summaryScore: { width: 28, fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: 'right' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { fontSize: 16, color: colors.textSecondary },
  emptyBtn: { marginTop: spacing.md, backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  emptyBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  card: {
    backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.primary },
  cardDate: { fontSize: 11, color: colors.textSecondary },
  ratingsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  reviewText: { fontSize: 14, color: colors.primary, lineHeight: 20, marginBottom: spacing.sm },

  // Overall star rating (prominent)
  overallStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  overallScore: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 8,
  },

  // Mood + facility chips as voted attributes (NOT rating bars)
  attributesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  moodAttrChip: {
    backgroundColor: '#FDF6EC',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  facilityAttrChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  // Media thumbnails + zoom
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  mediaThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  videoThumb: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  // Zoom modal
  zoomRoot: { flex: 1, backgroundColor: '#000' },
  zoomScrollContent: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.85,
  },
  zoomVideoBox: {
    width: SCREEN_W,
    height: SCREEN_H * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomVideoHint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 12 },
  zoomCloseBtn: {
    position: 'absolute',
    top: 48,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
